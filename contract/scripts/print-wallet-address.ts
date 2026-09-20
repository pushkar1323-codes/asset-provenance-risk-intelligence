#!/usr/bin/env node
/**
 * Temporary, local-only helper: prints the public (unshielded) address of
 * the deployment wallet derived from DEPLOYMENT_WALLET_SEED_HEX, using
 * the exact same derivation the deployment runner uses
 * (contract/src/deploy/wallet/index.ts's createNodeWalletProviders):
 * parseSeedHex + deriveWalletKeys(seed, 'preprod'). No derivation logic
 * is reimplemented here - both functions are imported unchanged from
 * ../src/deploy/wallet/keys.js.
 *
 * This script never reads, logs, or otherwise exposes the seed value,
 * and never prints any secret or private key material - only the
 * resulting public address.
 *
 * This is a debug/setup convenience, not part of the deployment
 * architecture, and can be deleted once it is no longer needed.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

  console.log(`Deployment wallet address (${NETWORK_ID}):`);
  console.log(keys.unshieldedPublicKey.address);
}
