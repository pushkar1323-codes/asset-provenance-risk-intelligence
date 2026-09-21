import { describe, expect, it, vi } from 'vitest';

const findDeployedContract = vi.fn();

vi.mock('@midnight-ntwrk/midnight-js-contracts', () => ({
  findDeployedContract: (...args: unknown[]) => findDeployedContract(...args)
}));

const { registerAsset } = await import('./registerAsset.js');

const fakeProviders = {} as never;
const baseOptions = {
  compiledAssetsPath: 'http://localhost:8080/zk',
  contractAddress: '0200aabbcc',
  privateStateId: 'asset-passport'
};

describe('registerAsset', () => {
  it('returns only the public transaction id on success, never private transcript data', async () => {
    findDeployedContract.mockResolvedValueOnce({
      callTx: {
        registerAsset: vi.fn().mockResolvedValue({
          public: { txId: 'tx-123' },
          private: {
            unprovenTx: 'should-never-be-returned',
            nextPrivateState: { ownerSecretKeys: { secret: 'value' } }
          }
        })
      }
    });

    const result = await registerAsset(
      { assetIdentifier: 'my-vehicle-1', assetCategory: 1 },
      fakeProviders,
      baseOptions
    );

    expect(result).toEqual({
      kind: 'success',
      assetIdHex: expect.any(String),
      transactionId: 'tx-123'
    });
    expect(Object.keys(result)).toEqual(['kind', 'assetIdHex', 'transactionId']);
  });

  it('reports a connecting-stage failure when the contract cannot be found', async () => {
    findDeployedContract.mockRejectedValueOnce(new Error('contract not found at address'));

    const result = await registerAsset(
      { assetIdentifier: 'my-vehicle-1', assetCategory: 1 },
      fakeProviders,
      baseOptions
    );

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.stage).toBe('connecting');
      expect(result.requiresLiveWalletVerification).toBe(false);
    }
  });

  it('flags the documented wallet-adapter boundary distinctly from other failures', async () => {
    findDeployedContract.mockResolvedValueOnce({
      callTx: {
        registerAsset: vi
          .fn()
          .mockRejectedValue(
            // Simulates a failure surfaced by WalletProviderAdapter itself (as opposed to
            // an unrelated application error) - e.g. a connected wallet whose balanced
            // transaction could not be deserialized, or a submitted transaction that
            // reported no identifiers. The classification below keys off the
            // "WalletProviderAdapter.<method>" prefix, not this exact message.
            new Error('WalletProviderAdapter.submitTx: the submitted transaction reported no identifiers.')
          )
      }
    });

    const result = await registerAsset(
      { assetIdentifier: 'my-vehicle-1', assetCategory: 1 },
      fakeProviders,
      baseOptions
    );

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.stage).toBe('submitting');
      expect(result.requiresLiveWalletVerification).toBe(true);
    }
  });
});
