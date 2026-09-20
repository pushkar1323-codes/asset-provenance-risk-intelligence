import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { deriveWalletKeys, generateWalletSeed, InvalidSeedFormatError, parseSeedHex } from '../../../src/deploy/wallet/keys.js';

describe('parseSeedHex', () => {
  it('parses a valid 64-character hex seed into 32 bytes', () => {
    const hex = randomBytes(32).toString('hex');
    const seed = parseSeedHex(hex);
    expect(seed).toHaveLength(32);
    expect(Buffer.from(seed).toString('hex')).toBe(hex);
  });

  it('accepts a seed with surrounding whitespace', () => {
    const hex = randomBytes(32).toString('hex');
    expect(() => parseSeedHex(`  ${hex}  `)).not.toThrow();
  });

  it('rejects a seed that is too short', () => {
    expect(() => parseSeedHex('abcd')).toThrow(InvalidSeedFormatError);
  });

  it('rejects a seed containing non-hexadecimal characters', () => {
    expect(() => parseSeedHex('g'.repeat(64))).toThrow(InvalidSeedFormatError);
  });

  it('never includes the input value in its error message', () => {
    const badSeed = 'not-a-real-seed-value-at-all';
    try {
      parseSeedHex(badSeed);
      expect.fail('expected parseSeedHex to throw');
    } catch (error) {
      expect((error as Error).message).not.toContain(badSeed);
    }
  });
});

describe('generateWalletSeed', () => {
  it('generates a non-empty seed', () => {
    const seed = generateWalletSeed();
    expect(seed.length).toBeGreaterThan(0);
  });

  it('generates different seeds on each call', () => {
    const a = Buffer.from(generateWalletSeed()).toString('hex');
    const b = Buffer.from(generateWalletSeed()).toString('hex');
    expect(a).not.toBe(b);
  });
});

describe('deriveWalletKeys', () => {
  it('deterministically derives the same keys from the same seed', () => {
    const seed = randomBytes(32);
    const first = deriveWalletKeys(seed, 'preprod');
    const second = deriveWalletKeys(seed, 'preprod');

    expect(first.unshieldedPublicKey.address).toBe(second.unshieldedPublicKey.address);
  });

  it('derives different keys from different seeds', () => {
    const first = deriveWalletKeys(randomBytes(32), 'preprod');
    const second = deriveWalletKeys(randomBytes(32), 'preprod');

    expect(first.unshieldedPublicKey.address).not.toBe(second.unshieldedPublicKey.address);
  });

  it('produces all three role-specific key materials', () => {
    const keys = deriveWalletKeys(randomBytes(32), 'preprod');
    expect(keys.shieldedSecretKeys).toBeDefined();
    expect(keys.dustSecretKey).toBeDefined();
    expect(keys.unshieldedKeystore).toBeDefined();
    expect(keys.unshieldedPublicKey.address).toBeTypeOf('string');
  });
});
