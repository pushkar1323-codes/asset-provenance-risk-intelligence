import { describe, expect, it } from 'vitest';
import { configureNetwork, getConfiguredNetwork } from '../../src/api/network.js';

describe('network configuration', () => {
  it('returns whatever network was configured', () => {
    configureNetwork('undeployed');
    expect(getConfiguredNetwork()).toBe('undeployed');
  });
});
