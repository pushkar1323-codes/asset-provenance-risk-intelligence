/**
 * Builds the `MidnightProviders` bundle Midnight.js needs to deploy and
 * interact with the Asset Passport contract: where to read ZK artifacts
 * from, how to query and submit against the network, and where to persist
 * private state.
 *
 * Wallet-facing concerns (signing and coin/encryption public keys) are
 * intentionally received as configuration rather than implemented here -
 * connecting an actual wallet (e.g. Lace) is a separate integration
 * concern from contract deployment/interaction.
 *
 * Nothing here reads secrets from source - every value comes from the
 * caller (in practice, environment/configuration such as `.env`).
 */

import type {
  MidnightProvider,
  ProofProvider,
  PublicDataProvider,
  WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';

import type { AssetPassportContract } from './compiled-contract.js';
import type { AssetPassportPrivateState } from '../witnesses.js';

/**
 * The branded circuit-id type Midnight.js uses to key ZK artifacts and
 * verifier keys for this specific contract. Using this (rather than a
 * plain `string`) is what lets `deployContract`/`findDeployedContract`
 * resolve to their private-state-aware overload for this contract.
 */
export type AssetPassportCircuitId = Contract.ProvableCircuitId<AssetPassportContract>;

/**
 * Network endpoints and local storage configuration needed to build a
 * provider bundle. All of these are expected to come from environment
 * variables or another configuration source - never hardcoded.
 */
export type AssetPassportNetworkConfig = {
  /** Directory containing the compiled ZK assets (`keys/`, `zkir/`). */
  readonly zkConfigPath: string;
  /** HTTP(S) GraphQL endpoint of the Midnight indexer. */
  readonly indexerUrl: string;
  /** WS(S) GraphQL subscription endpoint of the Midnight indexer. */
  readonly indexerWsUrl: string;
  /** HTTP(S) endpoint of a Midnight proof server. */
  readonly proofServerUrl: string;
  /**
   * A stable identifier for whichever local account/session is storing
   * private state (e.g. a wallet address). Used to isolate private-state
   * storage between accounts.
   */
  readonly privateStateAccountId: string;
  /**
   * Returns the password used to encrypt local private-state storage.
   * Called lazily so the password itself is never stored in configuration.
   */
  readonly privateStoragePasswordProvider: () => string;
};

/**
 * Wallet-facing providers. These are expected to be supplied by whatever
 * wallet integration the caller has available (a headless wallet for
 * backend/service use, or a browser wallet such as Lace once that
 * integration exists) - this module does not implement wallet logic.
 */
export type AssetPassportWalletProviders = {
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
};

export type AssetPassportProviders = {
  readonly zkConfigProvider: NodeZkConfigProvider<AssetPassportCircuitId>;
  readonly publicDataProvider: PublicDataProvider;
  readonly proofProvider: ProofProvider;
  readonly privateStateProvider: ReturnType<
    typeof levelPrivateStateProvider<string, AssetPassportPrivateState>
  >;
} & AssetPassportWalletProviders;

/**
 * Builds the full provider bundle used by {@link deployAssetPassport} and
 * {@link connectAssetPassport}.
 */
export const buildAssetPassportProviders = (
  network: AssetPassportNetworkConfig,
  wallet: AssetPassportWalletProviders
): AssetPassportProviders => {
  const zkConfigProvider = new NodeZkConfigProvider<AssetPassportCircuitId>(network.zkConfigPath);

  return {
    zkConfigProvider,
    publicDataProvider: indexerPublicDataProvider(network.indexerUrl, network.indexerWsUrl),
    proofProvider: httpClientProofProvider(network.proofServerUrl, zkConfigProvider),
    privateStateProvider: levelPrivateStateProvider<string, AssetPassportPrivateState>({
      privateStoragePasswordProvider: network.privateStoragePasswordProvider,
      accountId: network.privateStateAccountId
    }),
    walletProvider: wallet.walletProvider,
    midnightProvider: wallet.midnightProvider
  };
};

export type { AssetPassportContract };
