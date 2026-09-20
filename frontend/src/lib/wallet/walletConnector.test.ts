import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  connectWallet,
  detectWallets,
  getNetworkMismatch,
  WalletConnectionRejectedError,
  WalletNotFoundError
} from './walletConnector.js';

afterEach(() => {
  delete window.midnight;
});

describe('detectWallets', () => {
  it('returns an empty list when no wallet is injected', () => {
    expect(detectWallets()).toEqual([]);
  });

  it('lists every injected wallet with its display metadata', () => {
    window.midnight = {
      'org.example.wallet': {
        rdns: 'org.example.wallet',
        name: 'Example Wallet',
        icon: 'data:image/png;base64,',
        apiVersion: '4.0.1',
        connect: vi.fn()
      }
    };

    expect(detectWallets()).toEqual([
      { id: 'org.example.wallet', name: 'Example Wallet', icon: 'data:image/png;base64,', apiVersion: '4.0.1' }
    ]);
  });
});

describe('connectWallet', () => {
  it('throws WalletNotFoundError when the wallet is not injected', async () => {
    await expect(connectWallet('missing-wallet', 'undeployed')).rejects.toBeInstanceOf(
      WalletNotFoundError
    );
  });

  it('throws WalletConnectionRejectedError when the wallet rejects the request', async () => {
    window.midnight = {
      'org.example.wallet': {
        rdns: 'org.example.wallet',
        name: 'Example Wallet',
        icon: '',
        apiVersion: '4.0.1',
        connect: vi.fn().mockRejectedValue(new Error('user declined'))
      }
    };

    await expect(connectWallet('org.example.wallet', 'undeployed')).rejects.toBeInstanceOf(
      WalletConnectionRejectedError
    );
  });

  it('returns the connected API on success', async () => {
    const connectedApi = { getUnshieldedAddress: vi.fn() };
    window.midnight = {
      'org.example.wallet': {
        rdns: 'org.example.wallet',
        name: 'Example Wallet',
        icon: '',
        apiVersion: '4.0.1',
        connect: vi.fn().mockResolvedValue(connectedApi)
      }
    };

    await expect(connectWallet('org.example.wallet', 'undeployed')).resolves.toBe(connectedApi);
  });
});

describe('getNetworkMismatch', () => {
  it('returns null when the wallet network matches the expected network', () => {
    expect(getNetworkMismatch('testnet', 'testnet')).toBeNull();
  });

  it('returns a descriptive message when networks differ', () => {
    const message = getNetworkMismatch('mainnet', 'testnet');
    expect(message).toContain('mainnet');
    expect(message).toContain('testnet');
  });
});
