import { describe, expect, it } from 'vitest';
import {
  loadWalletNetworkConfig,
  loadWalletSeedHex,
  MissingWalletConfigurationError,
  MissingWalletSeedError
} from '../../../src/deploy/wallet/walletConfig.js';

const validEnv = (): NodeJS.ProcessEnv => ({
  MIDNIGHT_INDEXER_URL: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  MIDNIGHT_INDEXER_WS_URL: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  MIDNIGHT_RELAY_URL: 'https://relay.preprod.midnight.network',
  DEPLOYMENT_WALLET_SEED_HEX: 'a'.repeat(64)
});

describe('loadWalletNetworkConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadWalletNetworkConfig(validEnv());
    expect(config.networkId).toBe('preprod');
    expect(config.relayUrl).toBe('https://relay.preprod.midnight.network');
    expect(config.proofServerUrl).toBeUndefined();
  });

  it('includes an optional proof server url when configured', () => {
    const config = loadWalletNetworkConfig({
      ...validEnv(),
      MIDNIGHT_PROOF_SERVER_URL: 'https://proof-server.preprod.midnight.network'
    });
    expect(config.proofServerUrl).toBe('https://proof-server.preprod.midnight.network');
  });

  it('rejects a configuration missing MIDNIGHT_RELAY_URL, naming it', () => {
    const env = validEnv();
    delete env.MIDNIGHT_RELAY_URL;
    try {
      loadWalletNetworkConfig(env);
      expect.fail('expected loadWalletNetworkConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingWalletConfigurationError);
      expect((error as Error).message).toContain('MIDNIGHT_RELAY_URL');
    }
  });

  it('rejects a configuration missing indexer variables', () => {
    const env = validEnv();
    delete env.MIDNIGHT_INDEXER_URL;
    delete env.MIDNIGHT_INDEXER_WS_URL;
    expect(() => loadWalletNetworkConfig(env)).toThrow(MissingWalletConfigurationError);
  });
});

describe('loadWalletSeedHex', () => {
  it('returns the configured seed value', () => {
    expect(loadWalletSeedHex(validEnv())).toBe('a'.repeat(64));
  });

  it('throws MissingWalletSeedError, without inventing a fallback, when unset', () => {
    const env = validEnv();
    delete env.DEPLOYMENT_WALLET_SEED_HEX;
    expect(() => loadWalletSeedHex(env)).toThrow(MissingWalletSeedError);
  });
});
