/**
 * Orchestrates a Preprod deployment of the Asset Passport contract: wires
 * together the existing configuration, commitment-derivation, provider,
 * and deployment building blocks into one runnable sequence.
 *
 * This module intentionally does not implement wallet signing. Deploying
 * a transaction requires a WalletProvider/MidnightProvider capable of
 * balancing and submitting it, and no such implementation exists in this
 * repository yet: the browser wallet adapter is explicitly scoped to the
 * browser DApp Connector, which a Node process cannot reach, and there is
 * no headless wallet package installed to construct one from a key or
 * seed. Rather than fabricate one, this runner performs every step up to
 * that point and then fails with a clear, specific error identifying
 * exactly what is missing.
 */

import { configureNetwork } from '../api/network.js';
import { buildAssetPassportProviders, type AssetPassportWalletProviders } from '../api/providers.js';
import { deployAssetPassport, type DeployedAssetPassport } from '../api/deploy.js';
import { deriveAdminPublicKey, deriveOraclePublicKey } from '../api/commitments.js';
import { loadOrCreateDeploymentSecrets } from './secrets.js';
import type { DeploymentConfig } from './config.js';

export class MissingWalletProviderError extends Error {
  constructor() {
    super(
      'No WalletProvider/MidnightProvider was supplied to this deployment. ' +
        'The browser wallet adapter in this repository targets the DApp ' +
        'Connector API, which only exists inside a browser page a wallet ' +
        'extension has injected into - a Node process cannot reach it. ' +
        'A Node wallet integration is available (see ./wallet/), built on the ' +
        'installed Midnight Wallet SDK; construct one with ' +
        'createNodeWalletProviders() from ./wallet/index.js (this requires ' +
        'DEPLOYMENT_WALLET_SEED_HEX and MIDNIGHT_RELAY_URL to be configured) ' +
        'and pass it as the walletProviders argument to use this runner for a ' +
        'real deployment.'
    );
    this.name = 'MissingWalletProviderError';
  }
}

export type DeploymentSummary = {
  readonly networkId: string;
  readonly contractAddress: string;
  readonly transactionId: string;
};

/**
 * Prepares everything a deployment needs (network, commitments, providers)
 * and, if wallet providers are supplied, performs the real deployment.
 * Never logs anything itself - callers decide what to print.
 *
 * @param secretsBaseDir Overrides where local admin/oracle secret material
 *   is stored; defaults to the project's own gitignored directory. Tests
 *   supply an isolated directory instead of writing into the real project.
 */
export const runPreprodDeployment = async (
  config: DeploymentConfig,
  walletProviders?: AssetPassportWalletProviders,
  secretsBaseDir?: string
): Promise<DeploymentSummary> => {
  configureNetwork(config.networkId);

  const { secrets } = loadOrCreateDeploymentSecrets(
    config.networkId,
    config.privateStateId,
    secretsBaseDir
  );
  const adminKey = deriveAdminPublicKey(secrets.adminSecret);
  const oracleKey = deriveOraclePublicKey(secrets.oracleSecret);

  if (!walletProviders) {
    throw new MissingWalletProviderError();
  }

  const providers = buildAssetPassportProviders(
    {
      zkConfigPath: config.zkConfigPath,
      indexerUrl: config.indexerUrl,
      indexerWsUrl: config.indexerWsUrl,
      proofServerUrl: config.proofServerUrl,
      privateStateAccountId: config.privateStateAccountId,
      privateStoragePasswordProvider: config.privateStoragePasswordProvider
    },
    walletProviders
  );

  const deployed: DeployedAssetPassport = await deployAssetPassport(providers, {
    compiledAssetsPath: config.zkConfigPath,
    adminKey,
    oracleKey,
    privateStateId: config.privateStateId
  });

  // Only the public fields of the deploy result are ever read here - the
  // full object also carries private transcript data (unproven
  // transaction, initial private state) that must never be logged.
  return {
    networkId: config.networkId,
    contractAddress: deployed.deployTxData.public.contractAddress,
    transactionId: deployed.deployTxData.public.txId
  };
};
