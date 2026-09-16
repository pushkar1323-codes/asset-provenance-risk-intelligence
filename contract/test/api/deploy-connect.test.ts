/**
 * Tests for the deploy/connect wiring. `deployContract` and
 * `findDeployedContract` themselves talk to a live Midnight network, so
 * they are mocked here - these tests only check that this module builds
 * the right `CompiledContract` and forwards the right options to them,
 * without reimplementing any of their (or the contract's) actual logic.
 */

import { describe, expect, it, vi } from 'vitest';

const deployContract = vi.fn();
const findDeployedContract = vi.fn();

vi.mock('@midnight-ntwrk/midnight-js-contracts', () => ({
  deployContract: (...args: unknown[]) => deployContract(...args),
  findDeployedContract: (...args: unknown[]) => findDeployedContract(...args)
}));

const { deployAssetPassport } = await import('../../src/api/deploy.js');
const { connectAssetPassport } = await import('../../src/api/connect.js');
const { createAssetPassportPrivateState } = await import('../../src/witnesses.js');

const fakeProviders = {} as never;

describe('deployAssetPassport', () => {
  it('passes the admin/oracle keys as constructor arguments', async () => {
    deployContract.mockResolvedValueOnce({ deployed: true });
    const adminKey = new Uint8Array(32).fill(1);
    const oracleKey = new Uint8Array(32).fill(2);

    const result = await deployAssetPassport(fakeProviders, {
      compiledAssetsPath: '/tmp/zk-assets',
      adminKey,
      oracleKey,
      privateStateId: 'asset-passport'
    });

    expect(result).toEqual({ deployed: true });
    expect(deployContract).toHaveBeenCalledTimes(1);
    const [providersArg, optionsArg] = deployContract.mock.calls[0];
    expect(providersArg).toBe(fakeProviders);
    expect(optionsArg.args).toEqual([adminKey, oracleKey]);
    expect(optionsArg.privateStateId).toBe('asset-passport');
    expect(optionsArg.compiledContract.tag).toBe('asset-passport');
  });

  it('defaults to an empty private state when none is supplied', async () => {
    deployContract.mockResolvedValueOnce({ deployed: true });

    await deployAssetPassport(fakeProviders, {
      compiledAssetsPath: '/tmp/zk-assets',
      adminKey: new Uint8Array(32),
      oracleKey: new Uint8Array(32),
      privateStateId: 'asset-passport'
    });

    const [, optionsArg] = deployContract.mock.calls[deployContract.mock.calls.length - 1];
    expect(optionsArg.initialPrivateState).toEqual(createAssetPassportPrivateState());
  });

  it('uses a caller-supplied initial private state when given', async () => {
    deployContract.mockResolvedValueOnce({ deployed: true });
    const ownerSecret = new Uint8Array(32).fill(9);
    const initialPrivateState = createAssetPassportPrivateState({
      ownerSecretKeys: { deadbeef: ownerSecret }
    });

    await deployAssetPassport(fakeProviders, {
      compiledAssetsPath: '/tmp/zk-assets',
      adminKey: new Uint8Array(32),
      oracleKey: new Uint8Array(32),
      privateStateId: 'asset-passport',
      initialPrivateState
    });

    const [, optionsArg] = deployContract.mock.calls[deployContract.mock.calls.length - 1];
    expect(optionsArg.initialPrivateState).toBe(initialPrivateState);
  });
});

describe('connectAssetPassport', () => {
  it('forwards the contract address and private state id', async () => {
    findDeployedContract.mockResolvedValueOnce({ found: true });

    const result = await connectAssetPassport(fakeProviders, {
      compiledAssetsPath: '/tmp/zk-assets',
      contractAddress: '0200aabbcc',
      privateStateId: 'asset-passport'
    });

    expect(result).toEqual({ found: true });
    expect(findDeployedContract).toHaveBeenCalledTimes(1);
    const [providersArg, optionsArg] = findDeployedContract.mock.calls[0];
    expect(providersArg).toBe(fakeProviders);
    expect(optionsArg.contractAddress).toBe('0200aabbcc');
    expect(optionsArg.privateStateId).toBe('asset-passport');
    expect(optionsArg.compiledContract.tag).toBe('asset-passport');
    // No private state was supplied, so the existing stored state (if any)
    // should be used rather than overwriting it with an empty one.
    expect(optionsArg.initialPrivateState).toBeUndefined();
  });

  it('includes an explicit initial private state only when supplied', async () => {
    findDeployedContract.mockResolvedValueOnce({ found: true });
    const initialPrivateState = createAssetPassportPrivateState();

    await connectAssetPassport(fakeProviders, {
      compiledAssetsPath: '/tmp/zk-assets',
      contractAddress: '0200aabbcc',
      privateStateId: 'asset-passport',
      initialPrivateState
    });

    const [, optionsArg] = findDeployedContract.mock.calls[findDeployedContract.mock.calls.length - 1];
    expect(optionsArg.initialPrivateState).toBe(initialPrivateState);
  });
});
