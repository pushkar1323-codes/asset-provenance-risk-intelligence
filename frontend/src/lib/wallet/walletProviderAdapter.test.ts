import { describe, it, expect, vi } from 'vitest';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { WalletProviderAdapter } from './walletProviderAdapter.js';
import type { ConnectedWalletApi } from './types.js';

const makeApi = (overrides: Partial<ConnectedWalletApi> = {}): ConnectedWalletApi => ({
  getShieldedAddresses: vi.fn(),
  getUnshieldedAddress: vi.fn(),
  getConfiguration: vi.fn(),
  getConnectionStatus: vi.fn(),
  balanceUnsealedTransaction: vi.fn(),
  submitTransaction: vi.fn(),
  ...overrides
});

describe('WalletProviderAdapter', () => {
  it('exposes the coin and encryption public keys it was constructed with', () => {
    const adapter = new WalletProviderAdapter(makeApi(), 'coin-key', 'enc-key');
    expect(adapter.getCoinPublicKey()).toBe('coin-key');
    expect(adapter.getEncryptionPublicKey()).toBe('enc-key');
  });

  it(
    'balanceTx hex-encodes the outgoing transaction and deserializes a real balanced ' +
      'transaction back, exercising the actual ledger-v8 serialize/deserialize round trip',
    async () => {
      // A real, empty unbound transaction (SignatureEnabled, Proof, PreBinding) - this
      // is the exact ledger type the installed dapp-connector-api documents for
      // balanceUnsealedTransaction's input, not a mocked assumption about its shape.
      const unbound = Transaction.fromParts('undeployed').mockProve() as unknown as UnboundTransaction;
      const finalized = (unbound as unknown as { bind(): FinalizedTransaction }).bind();
      const unboundHex = toHex(unbound.serialize());
      const finalizedHex = toHex(finalized.serialize());

      const balanceUnsealedTransaction = vi.fn(async (hex: string) => {
        expect(hex).toBe(unboundHex);
        return { tx: finalizedHex };
      });

      const adapter = new WalletProviderAdapter(
        makeApi({ balanceUnsealedTransaction }),
        'coin-key',
        'enc-key'
      );

      const result = await adapter.balanceTx(unbound);

      expect(balanceUnsealedTransaction).toHaveBeenCalledTimes(1);
      // The deserialized result really is a working Transaction object (not a stub) -
      // its own serialize() reproduces exactly what the wallet returned.
      expect(toHex(result.serialize())).toBe(finalizedHex);
      expect(result.identifiers()).toEqual([]);
    }
  );

  it("submitTx hex-encodes the transaction, submits it, and returns the transaction's own identifier", async () => {
    // The connector's submitTransaction() returns void (the wallet is used purely as
    // a relayer) - the identifier must come from the transaction object itself.
    const fakeTx = {
      serialize: () => new Uint8Array([1, 2, 3]),
      identifiers: () => ['a1b2c3']
    } as unknown as FinalizedTransaction;

    const submitTransaction = vi.fn(async (hex: string) => {
      expect(hex).toBe(toHex(new Uint8Array([1, 2, 3])));
    });

    const adapter = new WalletProviderAdapter(makeApi({ submitTransaction }), 'coin-key', 'enc-key');

    const txId = await adapter.submitTx(fakeTx);

    expect(submitTransaction).toHaveBeenCalledTimes(1);
    expect(txId).toBe('a1b2c3');
  });

  it('submitTx throws a clear error if the transaction reports no identifiers', async () => {
    const emptyTx = Transaction.fromParts('undeployed').mockProve() as unknown as {
      bind(): FinalizedTransaction;
    };
    const finalizedEmptyTx = emptyTx.bind();

    const adapter = new WalletProviderAdapter(
      makeApi({ submitTransaction: vi.fn(async () => undefined) }),
      'coin-key',
      'enc-key'
    );

    await expect(adapter.submitTx(finalizedEmptyTx)).rejects.toThrow(/no identifiers/);
  });
});
