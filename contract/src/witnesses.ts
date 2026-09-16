/**
 * Private state and witness implementations for the Asset Passport contract.
 *
 * Everything in this file runs off-chain, on the caller's own machine. None
 * of the values held in `AssetPassportPrivateState` are ever transmitted to
 * the Midnight network; only the commitments the Compact circuits derive
 * from them (via `disclose()`) become part of the public ledger.
 *
 * `WitnessContext` comes from `@midnight-ntwrk/compact-runtime` and its
 * shape has been verified against that package's real published types.
 * The circuit-level types these witnesses ultimately plug into (the
 * `Ledger` type used elsewhere) come from the contract module generated
 * by the Compact compiler (`compact compile`) into `../managed/`, which
 * is not present until the contract is compiled locally. Run
 * `npm run compact:compile` before building or testing (see the project
 * README).
 */

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type HexString = string;

/**
 * Off-chain data held privately by a participant interacting with the
 * Asset Passport contract. Keys are hex-encoded 32-byte identifiers
 * (asset id, credential id, event id) mapped to the secret material a
 * circuit's witness call should return for that identifier.
 */
export type AssetPassportPrivateState = {
  /** assetId (hex) -> owner secret key controlling that asset */
  ownerSecretKeys: Record<HexString, Uint8Array>;
  /** credentialId (hex) -> private credential preimage/salt */
  credentialSecrets: Record<HexString, Uint8Array>;
  /** eventId (hex) -> private provenance event preimage/salt */
  provenanceSecrets: Record<HexString, Uint8Array>;
  /** protocol administrator secret key, if this participant holds that role */
  adminSecretKey?: Uint8Array;
  /** risk oracle secret key, if this participant holds that role */
  oracleSecretKey?: Uint8Array;
};

export const createAssetPassportPrivateState = (
  init: Partial<AssetPassportPrivateState> = {}
): AssetPassportPrivateState => ({
  ownerSecretKeys: {},
  credentialSecrets: {},
  provenanceSecrets: {},
  ...init
});

const toHex = (bytes: Uint8Array): HexString =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const requireEntry = (
  store: Record<HexString, Uint8Array>,
  key: Uint8Array,
  label: string
): Uint8Array => {
  const value = store[toHex(key)];
  if (!value) {
    throw new Error(
      `${label} not found in private state for key ${toHex(key)}. ` +
        'The caller must register this secret locally before invoking the circuit.'
    );
  }
  return value;
};

/**
 * Witness implementations. Each function signature mirrors the
 * corresponding `witness` declaration in asset-passport.compact and follows
 * the Compact convention of returning `[nextPrivateState, value]`.
 */
export const witnesses = {
  ownerSecretKey: (
    { privateState }: WitnessContext<unknown, AssetPassportPrivateState>,
    assetId: Uint8Array
  ): [AssetPassportPrivateState, Uint8Array] => [
    privateState,
    requireEntry(privateState.ownerSecretKeys, assetId, 'Owner secret key')
  ],

  credentialSecret: (
    { privateState }: WitnessContext<unknown, AssetPassportPrivateState>,
    credentialId: Uint8Array
  ): [AssetPassportPrivateState, Uint8Array] => [
    privateState,
    requireEntry(privateState.credentialSecrets, credentialId, 'Credential secret')
  ],

  provenanceSecret: (
    { privateState }: WitnessContext<unknown, AssetPassportPrivateState>,
    eventId: Uint8Array
  ): [AssetPassportPrivateState, Uint8Array] => [
    privateState,
    requireEntry(privateState.provenanceSecrets, eventId, 'Provenance secret')
  ],

  adminSecretKey: (
    { privateState }: WitnessContext<unknown, AssetPassportPrivateState>
  ): [AssetPassportPrivateState, Uint8Array] => {
    if (!privateState.adminSecretKey) {
      throw new Error('This participant does not hold the protocol administrator key.');
    }
    return [privateState, privateState.adminSecretKey];
  },

  oracleSecretKey: (
    { privateState }: WitnessContext<unknown, AssetPassportPrivateState>
  ): [AssetPassportPrivateState, Uint8Array] => {
    if (!privateState.oracleSecretKey) {
      throw new Error('This participant does not hold the risk oracle key.');
    }
    return [privateState, privateState.oracleSecretKey];
  }
};
