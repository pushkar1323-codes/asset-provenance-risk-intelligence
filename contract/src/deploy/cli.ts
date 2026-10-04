#!/usr/bin/env node
/**
 * Command-line entry point for deploying the Asset Passport contract to
 * Midnight Preprod. Run with `npm run deploy:preprod` from the contract
 * workspace (see the project README for required environment variables).
 *
 * Pass `--validate-only` to check configuration (network, required
 * environment variables, compiled contract artifacts) without attempting
 * a deployment.
 */

import path from 'node:path';
import { WebSocket } from 'ws';
import {
  loadDeploymentConfig,
  repoRoot,
  MissingConfigurationError,
  UnsupportedNetworkError
} from './config.js';
import { runPreprodDeployment, MissingWalletProviderError } from './deployPreprod.js';
import {
  createNodeWalletProviders,
  MissingWalletConfigurationError,
  MissingWalletSeedError
} from './wallet/index.js';

// The indexer provider subscribes to the indexer over a GraphQL
// WebSocket. Official Midnight Node.js examples assign this
// unconditionally, and the wallet SDK's indexer client does not accept an
// explicit WebSocket implementation of its own - it relies entirely on
// this global - so it must always be the `ws` implementation, not
// whatever WebSocket (if any) the Node runtime itself already defines.
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

// The canonical local .env lives at the repository root. Resolving it
// from the root derived from this module's own location (rather than
// process.loadEnvFile()'s default of the current working directory)
// means the CLI finds the right .env regardless of which directory or
// npm workspace it is actually invoked from.
const rootEnvPath = path.join(repoRoot, '.env');

try {
  // Node does not override a variable already present in process.env
  // with one loaded from the file, so shell/CI-supplied values still
  // take precedence over anything in .env.
  process.loadEnvFile(rootEnvPath);
} catch {
  // No .env file present at the repository root - environment variables
  // may be set some other way (CI secrets, shell exports). Configuration
  // is still validated below regardless of where it came from.
}

const validateOnly = process.argv.includes('--validate-only');

const main = async (): Promise<void> => {
  const config = loadDeploymentConfig();

  console.log(`Target network: ${config.networkId}`);
  console.log(`ZK config path: ${config.zkConfigPath}`);
  console.log(`Private state id: ${config.privateStateId}`);

  if (validateOnly) {
    console.log('Configuration is valid.');
    return;
  }

  console.log('Deployment starting...');

  let walletProviders;
  try {
    console.log('Connecting local wallet...');
    walletProviders = await createNodeWalletProviders();
    console.log('Wallet connected and synced.');
  } catch (error) {
    if (error instanceof MissingWalletSeedError || error instanceof MissingWalletConfigurationError) {
      console.log(`No local wallet configured (${error.name}) - preparing deployment without one.`);
      walletProviders = undefined;
    } else {
      throw error;
    }
  }

  const summary = await runPreprodDeployment(config, walletProviders);
  console.log('Deployment completed.');
  console.log(`Contract address: ${summary.contractAddress}`);
  console.log(`Transaction id: ${summary.transactionId}`);
  console.log('');
  console.log('Copy the address above into:');
  console.log(`  CONTRACT_ADDRESS=${summary.contractAddress}`);
  console.log(`  VITE_ASSET_PASSPORT_CONTRACT_ADDRESS=${summary.contractAddress}`);
};

main().catch((error: unknown) => {
  if (error instanceof UnsupportedNetworkError || error instanceof MissingConfigurationError) {
    console.error(`Configuration error: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (error instanceof MissingWalletProviderError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (error instanceof Error && (error.name === 'InvalidSeedFormatError' || error.name === 'SeedDerivationError')) {
    console.error(`Wallet configuration error: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.error('Deployment failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
