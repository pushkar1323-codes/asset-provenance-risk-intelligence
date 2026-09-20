import { randomBytes } from 'node:crypto';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { NodeWalletProviderAdapter } from '../../../src/deploy/wallet/providerAdapter.js';
import { deriveWalletKeys } from '../../../src/deploy/wallet/keys.js';

const mockFacadeState = {
  shielded: {
    coinPublicKey: { toHexString: () => 'coin-public-key-hex' },
    encryptionPublicKey: { toHexString: () => 'encryption-public-key-hex' }
  }
};

describe('NodeWalletProviderAdapter', () => {
  it('exposes the coin/encryption public keys as plain hex strings, read once at creation', async () => {
    const facade = {
      state: vi.fn(() => of(mockFacadeState)),
      balanceUnboundTransaction: vi.fn(),
      finalizeRecipe: vi.fn(),
      submitTransaction: vi.fn()
    } as never;

    const keys = deriveWalletKeys(randomBytes(32), 'preprod');
    const adapter = await NodeWalletProviderAdapter.create(facade, keys);

    expect(adapter.getCoinPublicKey()).toBe('coin-public-key-hex');
    expect(adapter.getEncryptionPublicKey()).toBe('encryption-public-key-hex');
  });

  it('balanceTx balances and finalizes through the facade, returning only the finalized transaction', async () => {
    const recipe = { recipeMarker: true };
    const finalizedTx = { finalizedMarker: true };
    const balanceUnboundTransaction = vi.fn().mockResolvedValue(recipe);
    const finalizeRecipe = vi.fn().mockResolvedValue(finalizedTx);

    const facade = {
      state: vi.fn(() => of(mockFacadeState)),
      balanceUnboundTransaction,
      finalizeRecipe,
      submitTransaction: vi.fn()
    } as never;

    const keys = deriveWalletKeys(randomBytes(32), 'preprod');
    const adapter = await NodeWalletProviderAdapter.create(facade, keys);

    const unboundTx = { unboundMarker: true } as never;
    const result = await adapter.balanceTx(unboundTx);

    expect(result).toBe(finalizedTx);
    expect(balanceUnboundTransaction).toHaveBeenCalledTimes(1);
    const [txArg, secretsArg] = balanceUnboundTransaction.mock.calls[0];
    expect(txArg).toBe(unboundTx);
    expect(secretsArg.shieldedSecretKeys).toBe(keys.shieldedSecretKeys);
    expect(secretsArg.dustSecretKey).toBe(keys.dustSecretKey);
    expect(finalizeRecipe).toHaveBeenCalledWith(recipe);
  });

  it('submitTx forwards to the facade and returns its transaction id', async () => {
    const submitTransaction = vi.fn().mockResolvedValue('tx-id-123');
    const facade = {
      state: vi.fn(() => of(mockFacadeState)),
      balanceUnboundTransaction: vi.fn(),
      finalizeRecipe: vi.fn(),
      submitTransaction
    } as never;

    const keys = deriveWalletKeys(randomBytes(32), 'preprod');
    const adapter = await NodeWalletProviderAdapter.create(facade, keys);

    const finalizedTx = { finalizedMarker: true } as never;
    const txId = await adapter.submitTx(finalizedTx);

    expect(txId).toBe('tx-id-123');
    expect(submitTransaction).toHaveBeenCalledWith(finalizedTx);
  });
});
