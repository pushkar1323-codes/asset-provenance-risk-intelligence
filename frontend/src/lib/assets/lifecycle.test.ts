import { describe, expect, it } from 'vitest';
import { lifecycleBlockers, validateOwnerCommitment } from './lifecycle.js';
import type { LocalAsset } from './assetStore.js';

const asset = (status: LocalAsset['status']): LocalAsset => ({
  assetIdHex: 'aa'.repeat(32),
  identifier: 'VIN-1',
  category: 1,
  status,
  createdAt: 1,
  events: []
});

describe('validateOwnerCommitment', () => {
  it('accepts 64 hex characters, with or without 0x, and normalises case', () => {
    const hex = 'AB'.repeat(32);
    expect(validateOwnerCommitment(hex)).toEqual({ valid: true, normalized: 'ab'.repeat(32) });
    expect(validateOwnerCommitment(`0x${hex}`)).toEqual({ valid: true, normalized: 'ab'.repeat(32) });
  });

  it.each([
    ['', /enter the new owner/i],
    ['abc', /exactly 64/i],
    ['zz'.repeat(32), /exactly 64/i],
    ['ab'.repeat(33), /exactly 64/i]
  ])('rejects %j', (input, message) => {
    const result = validateOwnerCommitment(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(message);
  });
});

describe('lifecycleBlockers', () => {
  const ready = { available: true } as const;

  it('always reports that the operation is not connected, so nothing can be submitted yet', () => {
    const blockers = lifecycleBlockers(asset('registered'), 'transferOwnership', ready);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/cannot be submitted from the app yet/i);
  });

  it('adds the reasons a user can act on first', () => {
    const blockers = lifecycleBlockers(asset('draft'), 'retireAsset', {
      available: false,
      reason: 'wallet-disconnected',
      message: 'Connect a wallet.'
    });
    expect(blockers[0]).toMatch(/register this asset/i);
    expect(blockers).toContain('Connect a wallet.');
    expect(blockers).toHaveLength(3);
  });

  it('blocks retired assets', () => {
    expect(lifecycleBlockers(asset('retired'), 'transferOwnership', ready)[0]).toMatch(/retired/i);
  });
});
