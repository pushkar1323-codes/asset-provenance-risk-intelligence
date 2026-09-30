import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissingEnvironmentError, checkAppEnvironment, readAppEnvironment } from './env.js';

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

describe('checkAppEnvironment', () => {
  it('lists every missing variable, not just the first', () => {
    const result = checkAppEnvironment({});
    expect(result.configured).toBe(false);
    expect(result.environment).toBeNull();
    expect(result.missing).toEqual([
      'VITE_MIDNIGHT_NETWORK_ID',
      'VITE_ASSET_PASSPORT_CONTRACT_ADDRESS',
      'VITE_ZK_CONFIG_BASE_URL'
    ]);
  });

  it('reports only the variables that are actually missing', () => {
    const result = checkAppEnvironment({
      VITE_MIDNIGHT_NETWORK_ID: 'preprod',
      VITE_ZK_CONFIG_BASE_URL: 'http://localhost:8080/zk'
    });
    expect(result.configured).toBe(false);
    expect(result.missing).toEqual(['VITE_ASSET_PASSPORT_CONTRACT_ADDRESS']);
  });

  it('treats empty strings as missing and returns the environment when complete', () => {
    expect(checkAppEnvironment({ VITE_MIDNIGHT_NETWORK_ID: '' }).configured).toBe(false);
    const ok = checkAppEnvironment({
      VITE_MIDNIGHT_NETWORK_ID: 'preprod',
      VITE_ASSET_PASSPORT_CONTRACT_ADDRESS: '0200aabbcc',
      VITE_ZK_CONFIG_BASE_URL: 'http://localhost:8080/zk'
    });
    expect(ok.configured).toBe(true);
    expect(ok.environment).toEqual({
      networkId: 'preprod',
      contractAddress: '0200aabbcc',
      zkConfigBaseUrl: 'http://localhost:8080/zk'
    });
  });
});
