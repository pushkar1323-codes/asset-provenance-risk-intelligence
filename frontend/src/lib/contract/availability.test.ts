import { describe, expect, it } from 'vitest';
import { getContractAvailability } from './availability.js';
import { initialWalletState, type WalletState } from '../wallet/types.js';

const connected: WalletState = { ...initialWalletState, status: 'connected', networkId: 'preprod' };

describe('getContractAvailability', () => {
  it('is unavailable until the app is configured, whatever the wallet is doing', () => {
    const result = getContractAvailability({ configured: false }, { state: connected, networkMismatch: null });
    expect(result).toMatchObject({ available: false, reason: 'not-configured' });
  });

  it('asks for a wallet when none is connected', () => {
    for (const status of ['disconnected', 'connecting', 'error'] as const) {
      const result = getContractAvailability(
        { configured: true },
        { state: { ...initialWalletState, status }, networkMismatch: null }
      );
      expect(result).toMatchObject({ available: false, reason: 'wallet-disconnected' });
    }
  });

  it('blocks on a network mismatch', () => {
    const result = getContractAvailability({ configured: true }, { state: connected, networkMismatch: 'mismatch' });
    expect(result).toMatchObject({ available: false, reason: 'wrong-network' });
  });

  it('is available only when configured, connected and on the expected network', () => {
    expect(getContractAvailability({ configured: true }, { state: connected, networkMismatch: null })).toEqual({
      available: true
    });
  });
});
