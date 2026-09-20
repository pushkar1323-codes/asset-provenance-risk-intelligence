#!/usr/bin/env node
/**
 * Temporary, local-only helper: prints the DUST address of the deployment
 * wallet derived from DEPLOYMENT_WALLET_SEED_HEX, using the exact same
 * derivation the deployment runner uses
 * (contract/src/deploy/wallet/index.ts's createNodeWalletProviders):
 * parseSeedHex + deriveWalletKeys(seed, 'preprod'). No derivation logic
 * is reimplemented here - both functions are imported unchanged from
 * ../src/deploy/wallet/keys.js.
 *
 * DustSecretKey.publicKey (from @midnight-ntwrk/ledger-v8) is a raw
 * bigint, not a displayable address; DustAddress.encodePublicKey (from
 * @midnight-ntwrk/wallet-sdk-address-format, already a project
 * dependency) is the supported way to encode it into the standard
 * bech32m address format - the same package this project already uses
 * to format the unshielded address.
 *
 * This script never reads, logs, or otherwise exposes the seed value,
 * and never prints any secret or private key material - only the
 * resulting public DUST address.
 *
 * This is a debug/setup convenience, not part of the deployment
 * architecture, and can be deleted once it is no longer needed.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DustAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { deriveWalletKeys, parseSeedHex } from '../src/deploy/wallet/keys.js';

// Resolved from this file's own location (contract/scripts/), matching
// the approach used in contract/src/deploy/cli.ts, so it finds the
// repository-root .env regardless of the current working directory.
const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const rootEnvPath = path.join(repoRoot, '.env');

try {
  process.loadEnvFile(rootEnvPath);
} catch {
  // No .env file present - DEPLOYMENT_WALLET_SEED_HEX may already be set
  // in the shell environment instead.
}

const seedHex = process.env.DEPLOYMENT_WALLET_SEED_HEX;
if (!seedHex) {
  console.error(
    'DEPLOYMENT_WALLET_SEED_HEX is not set (checked the shell environment and the ' +
      'repository-root .env). Set it before running this script.'
  );
  process.exitCode = 1;
} else {
  // Same network id createNodeWalletProviders() always derives with.
  const NETWORK_ID = 'preprod';

  const seed = parseSeedHex(seedHex);
  const keys = deriveWalletKeys(seed, NETWORK_ID);
  const dustAddress = DustAddress.encodePublicKey(NETWORK_ID, keys.dustSecretKey.publicKey);

  console.log(`Deployment wallet DUST address (${NETWORK_ID}):`);
  console.log(dustAddress);
}
