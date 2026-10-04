/**
 * Wallet connection logic for the Asset Passport dApp.
 *
 * This module only talks to the standard Midnight DApp Connector API
 * surface (wallets injected under `window.midnight`). It does not assume
 * a specific wallet beyond what that API guarantees, so any compliant
 * wallet (Lace included) can be used.
 */

import type { ConnectedWalletApi, DetectedWallet, InjectedWalletApi } from './types.js';

/** Lists the wallets currently injected on the page, if any. */
export const detectWallets = (): DetectedWallet[] => {
  if (typeof window === 'undefined' || !window.midnight) {
    return [];
  }
  return Object.entries(window.midnight).map(([id, api]) => ({
    id,
    name: api.name,
    icon: api.icon,
    apiVersion: api.apiVersion
  }));
};

/** Looks up a specific injected wallet by its identifier. */
const getInjectedWallet = (walletId: string): InjectedWalletApi => {
  const wallet = window.midnight?.[walletId];
  if (!wallet) {
    throw new WalletNotFoundError(walletId);
  }
  return wallet;
};

export class WalletNotFoundError extends Error {
  readonly walletId: string;

  constructor(walletId: string) {
    super('That wallet was not found. Make sure its browser extension is installed and enabled, then reload this page.');
    this.walletId = walletId;
    this.name = 'WalletNotFoundError';
  }
}

export class WalletConnectionRejectedError extends Error {
  constructor(cause: unknown) {
    super('The wallet connection request was rejected or cancelled.');
    this.name = 'WalletConnectionRejectedError';
    this.cause = cause;
  }
}

/**
 * Requests a connection to the given wallet for the given network. Throws
 * WalletNotFoundError if the wallet is not injected, or
 * WalletConnectionRejectedError if the wallet declines the request (e.g.
 * the user cancels the permission dialog).
 */
export const connectWallet = async (
  walletId: string,
  networkId: string
): Promise<ConnectedWalletApi> => {
  const wallet = getInjectedWallet(walletId);
  try {
    return await wallet.connect(networkId);
  } catch (cause) {
    throw new WalletConnectionRejectedError(cause);
  }
};

/**
 * Compares the network the wallet is actually connected to against the
 * network this application expects. A mismatch means any transaction the
 * wallet builds would target the wrong network, so the application must
 * not proceed until it is resolved.
 */
export const getNetworkMismatch = (
  walletNetworkId: string,
  expectedNetworkId: string
): string | null => {
  if (walletNetworkId === expectedNetworkId) {
    return null;
  }
  return `The connected wallet is on network "${walletNetworkId}", but this application expects "${expectedNetworkId}". Switch networks in the wallet before continuing.`;
};
