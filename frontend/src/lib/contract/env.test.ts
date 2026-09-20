import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissingEnvironmentError, readAppEnvironment } from './env.js';

describe('readAppEnvironment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws MissingEnvironmentError when a required variable is absent', () => {
    vi.stubEnv('VITE_MIDNIGHT_NETWORK_ID', '');
    vi.stubEnv('VITE_ASSET_PASSPORT_CONTRACT_ADDRESS', '');
    vi.stubEnv('VITE_ZK_CONFIG_BASE_URL', '');

    expect(() => readAppEnvironment()).toThrow(MissingEnvironmentError);
  });

  it('returns the configured values when all are present', () => {
    vi.stubEnv('VITE_MIDNIGHT_NETWORK_ID', 'undeployed');
    vi.stubEnv('VITE_ASSET_PASSPORT_CONTRACT_ADDRESS', '0200aabbcc');
    vi.stubEnv('VITE_ZK_CONFIG_BASE_URL', 'http://localhost:8080/zk');

    expect(readAppEnvironment()).toEqual({
      networkId: 'undeployed',
      contractAddress: '0200aabbcc',
      zkConfigBaseUrl: 'http://localhost:8080/zk'
    });
  });
});
