/**
 * Minimal re-statement of the parts of the Midnight DApp Connector API
 * (@midnight-ntwrk/dapp-connector-api) this application uses, plus the
 * connection-state model the UI is built around.
 *
 * Wallets inject their connector under `window.midnight.<walletId>`. A
 * single browser session may have zero, one, or several compatible
 * wallets injected at once.
 */

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
};

/** The wallet's pre-connection ("initial") API, as injected on `window.midnight`. */
export type InjectedWalletApi = {
  readonly rdns: string;
  readonly name: string;
  readonly icon: string;
  readonly apiVersion: string;
  connect(networkId: string): Promise<ConnectedWalletApi>;
};

declare global {
  interface Window {
    midnight?: Record<string, InjectedWalletApi>;
  }
}

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
