/**
 * Midnight.js integration layer for the Asset Passport contract:
 * deployment and contract interaction outside the unit-test simulator.
 *
 * Usage sketch:
 *
 * ```ts
 * import {
 *   configureNetwork,
 *   buildAssetPassportProviders,
 *   deployAssetPassport,
 *   connectAssetPassport
 * } from './api/index.js';
 *
 * configureNetwork(process.env.MIDNIGHT_NETWORK as NetworkId);
 *
 * const providers = buildAssetPassportProviders(
 *   {
 *     zkConfigPath: process.env.ZK_CONFIG_PATH!,
 *     indexerUrl: process.env.MIDNIGHT_INDEXER_URL!,
 *     indexerWsUrl: process.env.MIDNIGHT_INDEXER_WS_URL!,
 *     proofServerUrl: process.env.MIDNIGHT_PROOF_SERVER_URL!,
 *     privateStateAccountId: myAccountId,
 *     privateStoragePasswordProvider: () => myStoragePassword
 *   },
 *   { walletProvider, midnightProvider } // supplied by your wallet integration
 * );
 *
 * const deployed = await deployAssetPassport(providers, {
 *   compiledAssetsPath: process.env.ZK_CONFIG_PATH!,
 *   adminKey,
 *   oracleKey,
 *   privateStateId: 'asset-passport'
 * });
 *
 * await deployed.callTx.registerAsset(assetId, assetCategory, registeredAt);
 * ```
 *
 * `callTx` is generated directly from the compiled contract's circuit
 * signatures, so every call above is checked against the real Compact
 * contract - there is no separate, hand-maintained set of circuit
 * signatures in this layer to fall out of sync.
 */

export { assetPassportCompiledContract, type AssetPassportContract } from './compiled-contract.js';
export {
  buildAssetPassportProviders,
  type AssetPassportProviders,
  type AssetPassportNetworkConfig,
  type AssetPassportWalletProviders
} from './providers.js';
export { configureNetwork, getConfiguredNetwork, type NetworkId } from './network.js';
export {
  deployAssetPassport,
  type DeployAssetPassportOptions,
  type DeployedAssetPassport
} from './deploy.js';
export {
  connectAssetPassport,
  type ConnectAssetPassportOptions,
  type ConnectedAssetPassport
} from './connect.js';
