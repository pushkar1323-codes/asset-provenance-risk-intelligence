/**
 * Constructs and starts a Node WalletFacade: the Wallet SDK's unified
 * interface over the shielded, unshielded, and DUST wallets, used here to
 * balance and submit real transactions for the deployment runner.
 *
 * Connecting requires reaching the configured indexer and node/relay over
 * the network and is not exercised by this project's automated tests -
 * only the configuration and construction logic are.
 */

import * as ledger from '@midnight-ntwrk/ledger-v8';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { NoOpTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';

import type { WalletNetworkConfig } from './walletConfig.js';
import type { DerivedWalletKeys } from './keys.js';

/**
 * Builds the shared configuration object the shielded, unshielded, DUST,
 * and submission/proving services all read their relevant fields from.
 * Transaction history is not needed for deployment, so a no-op storage
 * is used rather than persisting entries nobody reads.
 */
const buildFacadeConfiguration = (network: WalletNetworkConfig) => ({
  networkId: network.networkId,
  indexerClientConnection: {
    indexerHttpUrl: network.indexerUrl,
    indexerWsUrl: network.indexerWsUrl
  },
  relayURL: new URL(network.relayUrl),
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
  // The DUST wallet's fee-estimation safety margin (in blocks). The
  // installed package does not document or provide a default for this
  // value; it should be verified against current Preprod guidance rather
  // than assumed correct.
  costParameters: { feeBlocksMargin: 10 },
  // Omitted entirely (not set to undefined) when no proof server is
  // configured, so the facade falls back to local WASM-based proving
  // rather than requiring one to be running.
  ...(network.proofServerUrl ? { provingServerUrl: new URL(network.proofServerUrl) } : {})
});

/**
 * Constructs the three underlying wallets, wires them into a WalletFacade,
 * starts them, and waits for the facade to finish its initial sync.
 */
export const connectNodeWalletFacade = async (
  network: WalletNetworkConfig,
  keys: DerivedWalletKeys
): Promise<WalletFacade> => {
  const configuration = buildFacadeConfiguration(network);
  const dustParameters = ledger.LedgerParameters.initialParameters().dust;

  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) => ShieldedWallet(config).startWithSecretKeys(keys.shieldedSecretKeys),
    unshielded: (config) => UnshieldedWallet(config).startWithPublicKey(keys.unshieldedPublicKey),
    dust: (config) => DustWallet(config).startWithSecretKey(keys.dustSecretKey, dustParameters)
  });

  await facade.start(keys.shieldedSecretKeys, keys.dustSecretKey);
  await facade.waitForSyncedState();

  return facade;
};
