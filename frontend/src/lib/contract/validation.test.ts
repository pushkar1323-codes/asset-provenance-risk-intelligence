import { describe, expect, it } from 'vitest';
import { validateRegisterAssetInput } from './validation.js';

describe('validateRegisterAssetInput', () => {
  it('accepts a valid identifier and category', () => {
    expect(
      validateRegisterAssetInput({ assetIdentifier: '1HGCM82633A123456', assetCategory: 1 })
    ).toEqual({ valid: true });
  });

  it('rejects an identifier that is too short', () => {
    const result = validateRegisterAssetInput({ assetIdentifier: 'ab', assetCategory: 1 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.assetIdentifier).toBeDefined();
    }
  });

  it('rejects an identifier that is only whitespace', () => {
    const result = validateRegisterAssetInput({ assetIdentifier: '     ', assetCategory: 1 });
    expect(result.valid).toBe(false);
  });

  it('rejects a category outside the valid Uint<8> range', () => {
    const tooLow = validateRegisterAssetInput({ assetIdentifier: 'valid-id', assetCategory: -1 });
    const tooHigh = validateRegisterAssetInput({ assetIdentifier: 'valid-id', assetCategory: 256 });
    expect(tooLow.valid).toBe(false);
    expect(tooHigh.valid).toBe(false);
  });

  it('rejects a non-integer category', () => {
    const result = validateRegisterAssetInput({ assetIdentifier: 'valid-id', assetCategory: 1.5 });
    expect(result.valid).toBe(false);
  });
});
