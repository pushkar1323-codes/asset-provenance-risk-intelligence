/**
 * Derives the shielded, unshielded, and DUST key material a Node wallet
 * needs from a single local seed, using the Wallet SDK's HD derivation
 * scheme (account 0, one role per wallet type, index 0). None of the
 * values this module produces are ever logged; callers must take the
 * same care.
 */

import { DustSecretKey, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { generateRandomSeed, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore, PublicKey, type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';

export class SeedDerivationError extends Error {
  constructor(reason: string) {
    super(`Failed to derive wallet keys from the configured seed: ${reason}`);
    this.name = 'SeedDerivationError';
  }
}

export type DerivedWalletKeys = {
  readonly shieldedSecretKeys: ZswapSecretKeys;
  readonly dustSecretKey: DustSecretKey;
  readonly unshieldedKeystore: UnshieldedKeystore;
  readonly unshieldedPublicKey: PublicKey;
};

/** Generates a fresh random local wallet seed. Never logs the result. */
export const generateWalletSeed = (): Uint8Array => generateRandomSeed();

const ACCOUNT = 0;
const KEY_INDEX = 0;

/**
 * Derives shielded (Zswap), DUST, and unshielded (Night) key material from
 * one seed. Throws SeedDerivationError with a non-sensitive message if
 * derivation fails; never includes key material in that message.
 */
export const deriveWalletKeys = (seed: Uint8Array, networkId: NetworkId.NetworkId): DerivedWalletKeys => {
  const hdResult = HDWallet.fromSeed(seed);
  if (hdResult.type !== 'seedOk') {
    throw new SeedDerivationError('the seed could not be used to initialize HD derivation');
  }

  const account = hdResult.hdWallet.selectAccount(ACCOUNT);

  const zswapDerivation = account.selectRole(Roles.Zswap).deriveKeyAt(KEY_INDEX);
  const dustDerivation = account.selectRole(Roles.Dust).deriveKeyAt(KEY_INDEX);
  const nightDerivation = account.selectRole(Roles.NightExternal).deriveKeyAt(KEY_INDEX);
  hdResult.hdWallet.clear();

  if (
    zswapDerivation.type !== 'keyDerived' ||
    dustDerivation.type !== 'keyDerived' ||
    nightDerivation.type !== 'keyDerived'
  ) {
    throw new SeedDerivationError('one or more role keys were out of the derivable range');
  }

  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(zswapDerivation.key);
  const dustSecretKey = DustSecretKey.fromSeed(dustDerivation.key);
  const unshieldedKeystore = createKeystore(nightDerivation.key, networkId);
  const unshieldedPublicKey = PublicKey.fromKeyStore(unshieldedKeystore);

  return { shieldedSecretKeys, dustSecretKey, unshieldedKeystore, unshieldedPublicKey };
};

const HEX_SEED_PATTERN = /^[0-9a-fA-F]{64}$/;

export class InvalidSeedFormatError extends Error {
  constructor() {
    super(
      'The configured wallet seed must be exactly 64 hexadecimal characters ' +
        '(32 bytes), such as a value produced by generateWalletSeed().'
    );
    this.name = 'InvalidSeedFormatError';
  }
}

/** Parses a hex-encoded seed from configuration. Never logs the input. */
export const parseSeedHex = (hex: string): Uint8Array => {
  const trimmed = hex.trim();
  if (!HEX_SEED_PATTERN.test(trimmed)) {
    throw new InvalidSeedFormatError();
  }
  return new Uint8Array(Buffer.from(trimmed, 'hex'));
};
