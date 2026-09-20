/**
 * Builds the provider bundle needed to interact with the Asset Passport
 * contract from a browser. This mirrors contract/src/api/providers.ts but
 * uses a fetch-based ZK config provider instead of a filesystem-based one,
 * since a browser cannot read compiled ZK assets from local disk. It
 * reuses the same generated contract and witnesses - no contract logic is
 * duplicated here.
 */

import type { MidnightProvider, ProofProvider, PublicDataProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import type * as ContractNS from '@midnight-ntwrk/compact-js/effect/Contract';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- resolved once `compact compile` has generated ../../../../contract/managed/**
import type { Contract } from '../../../../contract/managed/asset-passport/contract/index.js';
import type { AssetPassportPrivateState } from '../../../../contract/src/witnesses.js';

export type AssetPassportContract = Contract<AssetPassportPrivateState>;

export type AssetPassportCircuitId = ContractNS.ProvableCircuitId<AssetPassportContract>;

export type BrowserNetworkConfig = {
  /** Base URL the browser can fetch compiled ZK assets from. */
  readonly zkConfigBaseUrl: string;
  readonly indexerUrl: string;
  readonly indexerWsUri: string;
  readonly proofServerUrl: string;
  readonly privateStateAccountId: string;
  readonly privateStoragePasswordProvider: () => string;
};

export type BrowserWalletProviders = {
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
};

export type BrowserAssetPassportProviders = {
  readonly zkConfigProvider: FetchZkConfigProvider<AssetPassportCircuitId>;
  readonly publicDataProvider: PublicDataProvider;
  readonly proofProvider: ProofProvider;
  readonly privateStateProvider: ReturnType<
    typeof levelPrivateStateProvider<string, AssetPassportPrivateState>
  >;
} & BrowserWalletProviders;

export const buildBrowserAssetPassportProviders = (
  network: BrowserNetworkConfig,
  wallet: BrowserWalletProviders
): BrowserAssetPassportProviders => {
  const zkConfigProvider = new FetchZkConfigProvider<AssetPassportCircuitId>(network.zkConfigBaseUrl);

  return {
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(network.indexerUrl, network.indexerWsUri),
    proofProvider: httpClientProofProvider(network.proofServerUrl, zkConfigProvider),
    privateStateProvider: levelPrivateStateProvider<string, AssetPassportPrivateState>({
      privateStoragePasswordProvider: network.privateStoragePasswordProvider,
      accountId: network.privateStateAccountId
    }),
    walletProvider: wallet.walletProvider,
    midnightProvider: wallet.midnightProvider
  };
};
