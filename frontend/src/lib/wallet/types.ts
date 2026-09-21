/**
 * Minimal re-statement of the parts of the Midnight DApp Connector API
 * (@midnight-ntwrk/dapp-connector-api) this application uses, plus the
 * connection-state model the UI is built around.
 *
 * Wallets inject their connector under `window.midnight.<walletId>`. A
 * single browser session may have zero, one, or several compatible
 * wallets injected at once.
 */

import type { InitialAPI, KeyMaterialProvider, ProvingProvider } from '@midnight-ntwrk/dapp-connector-api';

/** Configuration a connected wallet reports for the network services it uses. */
export type WalletServiceConfiguration = {
  readonly indexerUri: string;
  readonly indexerWsUri: string;
  readonly proverServerUri?: string;
  readonly substrateNodeUri: string;
  readonly networkId: string;
};

/** Wallet-reported address information, in Bech32m format. */
export type WalletAddresses = {
  readonly shieldedAddress: string;
  readonly shieldedCoinPublicKey: string;
  readonly shieldedEncryptionPublicKey: string;
  readonly unshieldedAddress: string;
};

/**
 * The subset of the connected wallet API this application calls directly.
 * Matches the shape published by @midnight-ntwrk/dapp-connector-api.
 */
export type ConnectedWalletApi = {
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
  getConfiguration(): Promise<WalletServiceConfiguration>;
  getConnectionStatus(): Promise<
    { status: 'connected'; networkId: string } | { status: 'disconnected' }
  >;
  balanceUnsealedTransaction(
    tx: string,
    options?: { payFees?: boolean }
  ): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
  /**
   * Obtains a ledger-compatible ZK proving provider from the wallet, so
   * proof generation is delegated to the wallet instead of a locally
   * configured proof server. Not every wallet implements this - per the
   * Midnight DApp Connector API's own documentation, 1AM implements it
   * (in-browser WASM proving) while Lace does not (it requires a local
   * proof server instead). Callers must feature-detect
   * (`typeof api.getProvingProvider === 'function'`) before calling this.
   */
  getProvingProvider?(keyMaterialProvider: KeyMaterialProvider): Promise<ProvingProvider>;
};

/**
 * The wallet's pre-connection ("initial") API, as injected on `window.midnight`.
 * This is an alias for @midnight-ntwrk/dapp-connector-api's own InitialAPI
 * type. Note: that package's own type declarations already augment
 * `Window.midnight` globally (loaded transitively via the import above), so
 * this module does not redeclare it - a second, differently-typed
 * declaration would conflict with the package's own.
 */
export type InjectedWalletApi = InitialAPI;

/** A wallet detected on the page, before connection is established. */
export type DetectedWallet = {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly apiVersion: string;
};

export type WalletConnectionStatus =
  | 'disconnected'
  | 'detecting'
  | 'connecting'
  | 'connected'
  | 'error';

export type WalletState = {
  readonly status: WalletConnectionStatus;
  readonly walletId: string | null;
  readonly walletName: string | null;
  readonly unshieldedAddress: string | null;
  readonly networkId: string | null;
  readonly serviceConfiguration: WalletServiceConfiguration | null;
  readonly error: string | null;
};

export const initialWalletState: WalletState = {
  status: 'disconnected',
  walletId: null,
  walletName: null,
  unshieldedAddress: null,
  networkId: null,
  serviceConfiguration: null,
  error: null
};
