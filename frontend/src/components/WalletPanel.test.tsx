import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WalletPanel } from './WalletPanel.js';
import { initialWalletState } from '../lib/wallet/types.js';
import type { UseWalletResult } from '../lib/wallet/useWallet.js';

const makeWallet = (overrides: Partial<UseWalletResult>): UseWalletResult => ({
  state: initialWalletState,
  connectedApi: null,
  networkMismatch: null,
  availableWallets: [],
  connect: vi.fn(),
  disconnect: vi.fn(),
  ...overrides
});

describe('WalletPanel', () => {
  it('lists detected wallets and offers to connect when disconnected', () => {
    const wallet = makeWallet({
      availableWallets: [{ id: 'org.example.wallet', name: 'Example Wallet', icon: '', apiVersion: '4.0.1' }]
    });

    render(<WalletPanel wallet={wallet} expectedNetworkId="undeployed" />);

    expect(screen.getByRole('button', { name: /connect example wallet/i })).toBeInTheDocument();
  });

  it('shows the connected address and a network mismatch warning when present', () => {
    const wallet = makeWallet({
      state: {
        ...initialWalletState,
        status: 'connected',
        walletName: 'Example Wallet',
        unshieldedAddress: 'mn_addr1abcdefghijklmnopqrstuvwxyz0123456789',
        networkId: 'mainnet',
        serviceConfiguration: {
          indexerUri: '',
          indexerWsUri: '',
          substrateNodeUri: '',
          networkId: 'mainnet'
        }
      },
      networkMismatch: 'The connected wallet is on network "mainnet", but this application expects "undeployed".'
    });

    render(<WalletPanel wallet={wallet} expectedNetworkId="undeployed" />);

    expect(screen.getByText('mainnet')).toBeInTheDocument();
    expect(screen.getByText(/connected wallet is on network/i)).toBeInTheDocument();
  });

  it('shows a loading indicator while a connection is in progress', () => {
    const wallet = makeWallet({
      state: { ...initialWalletState, status: 'connecting' }
    });

    render(<WalletPanel wallet={wallet} expectedNetworkId="undeployed" />);

    expect(screen.getByRole('status')).toHaveTextContent(/waiting for wallet authorization/i);
  });

  it('shows a clear, actionable error state when connection fails', () => {
    const disconnect = vi.fn();
    const wallet = makeWallet({
      state: { ...initialWalletState, status: 'error', error: 'No compatible wallet was found.' },
      disconnect
    });

    render(<WalletPanel wallet={wallet} expectedNetworkId="undeployed" />);

    expect(screen.getByRole('alert')).toHaveTextContent('No compatible wallet was found.');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('calls disconnect and the panel returns to its disconnected affordance', () => {
    const disconnect = vi.fn();
    const wallet = makeWallet({
      state: {
        ...initialWalletState,
        status: 'connected',
        walletName: 'Example Wallet',
        unshieldedAddress: 'mn_addr1abc',
        networkId: 'undeployed',
        serviceConfiguration: {
          indexerUri: '',
          indexerWsUri: '',
          substrateNodeUri: '',
          networkId: 'undeployed'
        }
      },
      disconnect
    });

    render(<WalletPanel wallet={wallet} expectedNetworkId="undeployed" />);
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
