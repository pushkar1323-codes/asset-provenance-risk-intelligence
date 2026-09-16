/**
 * Tests for building the Asset Passport provider bundle. These verify the
 * bundle is assembled correctly from configuration - no live indexer,
 * proof server, or wallet is contacted.
 */

import { describe, expect, it, vi } from 'vitest';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { buildAssetPassportProviders, type AssetPassportWalletProviders } from '../../src/api/providers.js';

const mockWallet: AssetPassportWalletProviders = {
  walletProvider: {
    balanceTx: vi.fn(),
    getCoinPublicKey: vi.fn(() => 'mock-coin-public-key'),
    getEncryptionPublicKey: vi.fn(() => 'mock-encryption-public-key')
  } as unknown as AssetPassportWalletProviders['walletProvider'],
  midnightProvider: {
    submitTx: vi.fn()
  } as unknown as AssetPassportWalletProviders['midnightProvider']
};

describe('buildAssetPassportProviders', () => {
  it('points the zk config provider at the configured directory', () => {
    const providers = buildAssetPassportProviders(
      {
        zkConfigPath: '/tmp/zk-assets',
        indexerUrl: 'http://localhost:8080/api/v1/graphql',
        indexerWsUrl: 'ws://localhost:8080/api/v1/graphql/ws',
        proofServerUrl: 'http://localhost:6300',
        privateStateAccountId: 'test-account',
        privateStoragePasswordProvider: () => 'Sup3r-Secure-Passw0rd!'
      },
      mockWallet
    );

    expect(providers.zkConfigProvider).toBeInstanceOf(NodeZkConfigProvider);
    expect(providers.zkConfigProvider.directory).toBe('/tmp/zk-assets');
  });

  it('passes the injected wallet and midnight providers through unchanged', () => {
    const providers = buildAssetPassportProviders(
      {
        zkConfigPath: '/tmp/zk-assets',
        indexerUrl: 'http://localhost:8080/api/v1/graphql',
        indexerWsUrl: 'ws://localhost:8080/api/v1/graphql/ws',
        proofServerUrl: 'http://localhost:6300',
        privateStateAccountId: 'test-account',
        privateStoragePasswordProvider: () => 'Sup3r-Secure-Passw0rd!'
      },
      mockWallet
    );

    expect(providers.walletProvider).toBe(mockWallet.walletProvider);
    expect(providers.midnightProvider).toBe(mockWallet.midnightProvider);
  });

  it('never reads the storage password eagerly (it is only fetched when needed)', () => {
    const passwordProvider = vi.fn(() => 'Sup3r-Secure-Passw0rd!');

    buildAssetPassportProviders(
      {
        zkConfigPath: '/tmp/zk-assets',
        indexerUrl: 'http://localhost:8080/api/v1/graphql',
        indexerWsUrl: 'ws://localhost:8080/api/v1/graphql/ws',
        proofServerUrl: 'http://localhost:6300',
        privateStateAccountId: 'test-account',
        privateStoragePasswordProvider: passwordProvider
      },
      mockWallet
    );

    expect(passwordProvider).not.toHaveBeenCalled();
  });
});
