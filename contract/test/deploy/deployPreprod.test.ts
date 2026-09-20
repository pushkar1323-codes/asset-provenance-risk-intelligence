import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeploymentConfig } from '../../src/deploy/config.js';

const deployAssetPassport = vi.fn();

vi.mock('../../src/api/deploy.js', () => ({
  deployAssetPassport: (...args: unknown[]) => deployAssetPassport(...args)
}));

const { runPreprodDeployment, MissingWalletProviderError } = await import('../../src/deploy/deployPreprod.js');

let tempDir: string;
let secretsDir: string;

const baseConfig = (): DeploymentConfig => ({
  networkId: 'preprod',
  zkConfigPath: path.join(tempDir, 'zk'),
  indexerUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  proofServerUrl: 'https://proof-server.preprod.midnight.network',
  privateStateAccountId: 'deployer-account',
  privateStateId: 'asset-passport',
  privateStoragePasswordProvider: () => 'test-password'
});

beforeEach(() => {
  tempDir = mkdtempSync(path.join(os.tmpdir(), 'asset-passport-deploy-test-'));
  secretsDir = mkdtempSync(path.join(os.tmpdir(), 'asset-passport-deploy-secrets-'));
  deployAssetPassport.mockReset();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  rmSync(secretsDir, { recursive: true, force: true });
});

describe('runPreprodDeployment', () => {
  it('fails clearly when no wallet providers are supplied, without attempting a deployment', async () => {
    await expect(runPreprodDeployment(baseConfig(), undefined, secretsDir)).rejects.toBeInstanceOf(
      MissingWalletProviderError
    );
    expect(deployAssetPassport).not.toHaveBeenCalled();
  });

  it('deploys using supplied wallet providers and returns only public fields', async () => {
    deployAssetPassport.mockResolvedValue({
      deployTxData: {
        public: { contractAddress: '0200aabbcc', txId: 'tx-abc123' },
        private: { signingKey: 'should-never-be-read', initialPrivateState: {} }
      }
    });

    const walletProviders = {
      walletProvider: {} as never,
      midnightProvider: {} as never
    };

    const summary = await runPreprodDeployment(baseConfig(), walletProviders, secretsDir);

    expect(summary).toEqual({
      networkId: 'preprod',
      contractAddress: '0200aabbcc',
      transactionId: 'tx-abc123'
    });
    // Only the safe public fields should ever be read out of the result.
    expect(Object.keys(summary)).toEqual(['networkId', 'contractAddress', 'transactionId']);
    expect(deployAssetPassport).toHaveBeenCalledTimes(1);
  });

  it('supplies admin/oracle commitments derived from locally generated secrets', async () => {
    deployAssetPassport.mockResolvedValue({
      deployTxData: { public: { contractAddress: '0200aabbcc', txId: 'tx-abc123' } }
    });

    const walletProviders = { walletProvider: {} as never, midnightProvider: {} as never };
    await runPreprodDeployment(baseConfig(), walletProviders, secretsDir);

    const [, options] = deployAssetPassport.mock.calls[0];
    expect(options.adminKey).toBeInstanceOf(Uint8Array);
    expect(options.adminKey).toHaveLength(32);
    expect(options.oracleKey).toBeInstanceOf(Uint8Array);
    expect(options.oracleKey).toHaveLength(32);
  });
});
