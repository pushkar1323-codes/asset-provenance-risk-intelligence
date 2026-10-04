import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadDeploymentConfig,
  MissingConfigurationError,
  repoRoot,
  resolveFromRepoRoot,
  UnsupportedNetworkError
} from '../../src/deploy/config.js';

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
    expect(config.zkConfigPath).toBe(path.join(repoRoot, 'contract', 'managed', 'asset-passport'));
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

describe('ZK_CONFIG_PATH resolution', () => {
  it('derives the repository root from the module location', () => {
    // The root is the directory that contains the contract workspace.
    expect(existsSync(path.join(repoRoot, 'contract', 'package.json'))).toBe(true);
    expect(path.isAbsolute(repoRoot)).toBe(true);
  });

  it('resolves a relative path against the repository root', () => {
    const config = loadDeploymentConfig(validEnv());
    expect(path.isAbsolute(config.zkConfigPath)).toBe(true);
    expect(config.zkConfigPath).toBe(path.resolve(repoRoot, 'contract', 'managed', 'asset-passport'));
  });

  it('does not depend on the current working directory', () => {
    const original = process.cwd();
    const before = loadDeploymentConfig(validEnv()).zkConfigPath;
    try {
      process.chdir(path.join(repoRoot, 'contract'));
      expect(loadDeploymentConfig(validEnv()).zkConfigPath).toBe(before);
    } finally {
      process.chdir(original);
    }
  });

  it('leaves an absolute path unchanged', () => {
    const absolute = path.resolve(path.parse(repoRoot).root, 'somewhere', 'else', 'managed');
    const config = loadDeploymentConfig({ ...validEnv(), ZK_CONFIG_PATH: absolute });
    expect(config.zkConfigPath).toBe(absolute);
  });

  it('points the key and ZKIR lookups at the generated managed directory', () => {
    const { zkConfigPath } = loadDeploymentConfig(validEnv());
    expect(path.relative(repoRoot, zkConfigPath).split(path.sep)).toEqual(['contract', 'managed', 'asset-passport']);
    expect(path.resolve(zkConfigPath, 'keys', 'registerAsset.verifier')).toBe(
      path.join(repoRoot, 'contract', 'managed', 'asset-passport', 'keys', 'registerAsset.verifier')
    );
  });

  it('resolves against an explicit root and handles parent-relative values', () => {
    const root = path.resolve(path.parse(repoRoot).root, 'project');
    expect(resolveFromRepoRoot('./contract/managed/asset-passport', root)).toBe(
      path.join(root, 'contract', 'managed', 'asset-passport')
    );
    expect(resolveFromRepoRoot('contract/../contract/managed/asset-passport', root)).toBe(
      path.join(root, 'contract', 'managed', 'asset-passport')
    );
  });
});
