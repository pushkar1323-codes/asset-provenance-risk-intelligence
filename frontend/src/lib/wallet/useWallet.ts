import { useCallback, useRef, useState } from 'react';
import {
  connectWallet,
  detectWallets,
  getNetworkMismatch,
  WalletConnectionRejectedError,
  WalletNotFoundError
} from './walletConnector.js';
import { initialWalletState, type ConnectedWalletApi, type WalletState } from './types.js';

export type UseWalletResult = {
  readonly state: WalletState;
  readonly connectedApi: ConnectedWalletApi | null;
  readonly networkMismatch: string | null;
  readonly availableWallets: ReturnType<typeof detectWallets>;
  connect(walletId: string): Promise<void>;
  disconnect(): void;
};

/**
 * Manages wallet connection state for the UI. Holds the connected wallet
 * API reference only in memory for the lifetime of the page - nothing
 * about the connection is persisted, so a page reload requires
 * reconnecting.
 */
export const useWallet = (expectedNetworkId: string): UseWalletResult => {
  const [state, setState] = useState<WalletState>(initialWalletState);
  const connectedApiRef = useRef<ConnectedWalletApi | null>(null);

  const connect = useCallback(
    async (walletId: string) => {
      setState((prev) => ({ ...prev, status: 'connecting', error: null }));
      try {
        const api = await connectWallet(walletId, expectedNetworkId);
        const [{ unshieldedAddress }, configuration] = await Promise.all([
          api.getUnshieldedAddress(),
          api.getConfiguration()
        ]);

        connectedApiRef.current = api;
        setState({
          status: 'connected',
          walletId,
          walletName: window.midnight?.[walletId]?.name ?? walletId,
          unshieldedAddress,
          networkId: configuration.networkId,
          serviceConfiguration: configuration,
          error: null
        });
      } catch (error) {
        connectedApiRef.current = null;
        const message =
          error instanceof WalletNotFoundError || error instanceof WalletConnectionRejectedError
            ? error.message
            : 'Could not connect to the wallet.';
        setState({ ...initialWalletState, status: 'error', error: message });
      }
    },
    [expectedNetworkId]
  );

  const disconnect = useCallback(() => {
    // The DApp Connector API does not provide a wallet-side "disconnect"
    // call; the wallet itself manages the granted permission. This clears
    // the application's local reference to the connection.
    connectedApiRef.current = null;
    setState(initialWalletState);
  }, []);

  const networkMismatch =
    state.status === 'connected' && state.networkId
      ? getNetworkMismatch(state.networkId, expectedNetworkId)
      : null;

  return {
    state,
    connectedApi: connectedApiRef.current,
    networkMismatch,
    availableWallets: detectWallets(),
    connect,
    disconnect
  };
};
