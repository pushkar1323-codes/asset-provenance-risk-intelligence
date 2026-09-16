/**
 * Tests for the Asset Passport CompiledContract binding. These exercise the
 * wiring logic only (tag, witnesses, compiled-assets path) - no network
 * access, wallet, or live Midnight infrastructure is required.
 */

import { describe, expect, it } from 'vitest';
import { getCompiledAssetsPath } from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { assetPassportCompiledContract } from '../../src/api/compiled-contract.js';

describe('assetPassportCompiledContract', () => {
  it('tags the binding with a stable contract identifier', () => {
    const compiled = assetPassportCompiledContract('/tmp/does-not-need-to-exist');
    expect(compiled.tag).toBe('asset-passport');
  });

  it('carries through the compiled ZK assets path it was given', () => {
    const compiled = assetPassportCompiledContract('/some/zk/assets/path');
    expect(getCompiledAssetsPath(compiled)).toBe('/some/zk/assets/path');
  });
});
