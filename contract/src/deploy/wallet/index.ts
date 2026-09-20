/**
 * High-level entry point for the Node wallet integration: derives keys
 * from a local seed, connects a WalletFacade, and returns the
 * WalletProvider/MidnightProvider pair the existing deployment provider
 * layer (contract/src/api/providers.ts) expects.
 */

import { deriveWalletKeys, parseSeedHex } from './keys.js';
import { connectNodeWalletFacade } from './facade.js';
import { NodeWalletProviderAdapter } from './providerAdapter.js';
import { loadWalletNetworkConfig, loadWalletSeedHex } from './walletConfig.js';
import type { AssetPassportWalletProviders } from '../../api/providers.js';

export {
  loadWalletNetworkConfig,
  loadWalletSeedHex,
  MissingWalletConfigurationError,
  MissingWalletSeedError,
  type WalletNetworkConfig
} from './walletConfig.js';
export { generateWalletSeed, parseSeedHex, SeedDerivationError, InvalidSeedFormatError } from './keys.js';

/**
 * Builds a real WalletProvider/MidnightProvider pair for the deployment
 * runner: loads the local seed and network configuration from the
 * environment, derives key material, connects and syncs a WalletFacade,
 * and wraps it in the provider adapter. This performs real network
 * activity (indexer and relay connections) and is not exercised by this
 * project's automated tests.
 */
export const createNodeWalletProviders = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<AssetPassportWalletProviders> => {
  const network = loadWalletNetworkConfig(env);
  const seedHex = loadWalletSeedHex(env);
  const seed = parseSeedHex(seedHex);

  const keys = deriveWalletKeys(seed, network.networkId);
  const facade = await connectNodeWalletFacade(network, keys);
  const adapter = await NodeWalletProviderAdapter.create(facade, keys);

  return { walletProvider: adapter, midnightProvider: adapter };
};
