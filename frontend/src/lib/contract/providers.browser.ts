/**
 * Builds the provider bundle needed to interact with the Asset Passport
 * contract from a browser. This mirrors contract/src/api/providers.ts but
 * uses a fetch-based ZK config provider instead of a filesystem-based one,
 * since a browser cannot read compiled ZK assets from local disk. It
 * reuses the same generated contract and witnesses - no contract logic is
 * duplicated here.
 */

import type { MidnightProvider, ProofProvider, PublicDataProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import type * as ContractNS from '@midnight-ntwrk/compact-js/effect/Contract';
import type { ConnectedWalletApi } from '../wallet/types.js';

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
  /**
   * The connected wallet's own proving-provider factory, when it exposes
   * one. Coverage genuinely varies by wallet: 1AM proves in-browser via
   * WASM and implements this, while Lace does not and instead requires a
   * locally running proof server (see docs.midnight.network/sdks/
   * community/wallets/community-wallets-integration#where-zk-proofs-come-from).
   * Pass the wallet's method directly (or omit it) - this module handles
   * the feature-detection and fallback itself.
   */
  readonly getProvingProvider?: ConnectedWalletApi['getProvingProvider'];
};

export type BrowserAssetPassportProviders = {
  readonly zkConfigProvider: FetchZkConfigProvider<AssetPassportCircuitId>;
  readonly publicDataProvider: PublicDataProvider;
  readonly proofProvider: ProofProvider;
  readonly privateStateProvider: ReturnType<
    typeof levelPrivateStateProvider<string, AssetPassportPrivateState>
  >;
} & BrowserWalletProviders;

export const buildBrowserAssetPassportProviders = async (
  network: BrowserNetworkConfig,
  wallet: BrowserWalletProviders
): Promise<BrowserAssetPassportProviders> => {
  const zkConfigProvider = new FetchZkConfigProvider<AssetPassportCircuitId>(network.zkConfigBaseUrl);

  const proofProvider =
    typeof wallet.getProvingProvider === 'function'
      ? createProofProvider(await wallet.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()))
      : httpClientProofProvider(network.proofServerUrl, zkConfigProvider);

  return {
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(network.indexerUrl, network.indexerWsUri),
    proofProvider,
    privateStateProvider: levelPrivateStateProvider<string, AssetPassportPrivateState>({
      privateStoragePasswordProvider: network.privateStoragePasswordProvider,
      accountId: network.privateStateAccountId
    }),
    walletProvider: wallet.walletProvider,
    midnightProvider: wallet.midnightProvider
  };
};
