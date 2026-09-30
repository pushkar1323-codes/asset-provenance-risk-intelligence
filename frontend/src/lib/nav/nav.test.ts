import { describe, expect, it } from 'vitest';
import { BOTTOM_NAV_IDS, NAV_ITEMS, getNavItem, parseHash, toHash } from './nav.js';

describe('navigation model', () => {
  it('marks only functionality that exists as available', () => {
    const available = NAV_ITEMS.filter((i) => i.available).map((i) => i.id);
    expect(available).toEqual(['overview', 'register', 'privacy', 'settings']);
  });

  it('gives every unavailable destination a plain-language reason', () => {
    for (const item of NAV_ITEMS.filter((i) => !i.available)) {
      expect(item.unavailableReason, item.id).toBeTruthy();
    }
  });

  it('parses hashes and falls back to the overview for unknown routes', () => {
    expect(parseHash('#/register')).toBe('register');
    expect(parseHash('#/more')).toBe('more');
    expect(parseHash('')).toBe('overview');
    expect(parseHash('#/does-not-exist')).toBe('overview');
    expect(toHash('privacy')).toBe('#/privacy');
  });

  it('keeps the mobile bottom bar to five destinations that all resolve', () => {
    expect(BOTTOM_NAV_IDS).toHaveLength(5);
    for (const id of BOTTOM_NAV_IDS.filter((i) => i !== 'more')) {
      expect(getNavItem(id)).toBeDefined();
    }
  });
});
