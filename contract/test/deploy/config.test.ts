import { describe, expect, it } from 'vitest';
import { loadDeploymentConfig, MissingConfigurationError, UnsupportedNetworkError } from '../../src/deploy/config.js';

const validEnv = (): NodeJS.ProcessEnv => ({
  MIDNIGHT_NETWORK: 'preprod',
  ZK_CONFIG_PATH: './contract/managed/asset-passport',
  MIDNIGHT_INDEXER_URL: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  MIDNIGHT_INDEXER_WS_URL: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  MIDNIGHT_PROOF_SERVER_URL: 'https://proof-server.preprod.midnight.network',
  PRIVATE_STATE_ACCOUNT_ID: 'deployer-account',
  PRIVATE_STATE_STORAGE_PASSWORD: 'a-sufficiently-long-local-password'
});

describe('loadDeploymentConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadDeploymentConfig(validEnv());
    expect(config.networkId).toBe('preprod');
    expect(config.zkConfigPath).toBe('./contract/managed/asset-passport');
    expect(config.privateStateId).toBe('asset-passport');
  });

  it('honors an explicit PRIVATE_STATE_ID override', () => {
    const config = loadDeploymentConfig({ ...validEnv(), PRIVATE_STATE_ID: 'custom-id' });
    expect(config.privateStateId).toBe('custom-id');
  });

  it('rejects a missing MIDNIGHT_NETWORK', () => {
    const env = validEnv();
    delete env.MIDNIGHT_NETWORK;
    expect(() => loadDeploymentConfig(env)).toThrow(UnsupportedNetworkError);
  });

  it('rejects any network other than preprod', () => {
    expect(() => loadDeploymentConfig({ ...validEnv(), MIDNIGHT_NETWORK: 'testnet' })).toThrow(
      UnsupportedNetworkError
    );
  });

  it('rejects a configuration missing required variables, naming each one', () => {
    const env = validEnv();
    delete env.MIDNIGHT_INDEXER_URL;
    delete env.PRIVATE_STATE_STORAGE_PASSWORD;

    try {
      loadDeploymentConfig(env);
      expect.fail('expected loadDeploymentConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingConfigurationError);
      expect((error as Error).message).toContain('MIDNIGHT_INDEXER_URL');
      expect((error as Error).message).toContain('PRIVATE_STATE_STORAGE_PASSWORD');
    }
  });

  it('never returns the password directly - only a provider function', () => {
    const config = loadDeploymentConfig(validEnv());
    expect(typeof config.privateStoragePasswordProvider).toBe('function');
    expect(config.privateStoragePasswordProvider()).toBe('a-sufficiently-long-local-password');
  });
});
