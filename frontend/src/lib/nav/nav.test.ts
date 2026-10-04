import { describe, expect, it } from 'vitest';
import { BOTTOM_NAV_IDS, NAV_ITEMS, getNavItem, parseHash, parseRoute, toHash } from './nav.js';

describe('navigation model', () => {
  it('lists every destination the application implements', () => {
    expect(NAV_ITEMS.map((i) => i.id)).toEqual([
      'overview',
      'register',
      'assets',
      'passport',
      'provenance',
      'risk',
      'transfer',
      'retire',
      'privacy',
      'settings'
    ]);
  });

  it('marks the per-asset destinations as asset-scoped', () => {
    expect(NAV_ITEMS.filter((i) => i.assetScoped).map((i) => i.id)).toEqual([
      'passport',
      'provenance',
      'risk',
      'transfer',
      'retire'
    ]);
  });

  it('parses hashes and falls back to the overview for unknown routes', () => {
    expect(parseHash('#/register')).toBe('register');
    expect(parseHash('#/more')).toBe('more');
    expect(parseHash('')).toBe('overview');
    expect(parseHash('#/does-not-exist')).toBe('overview');
    expect(toHash('privacy')).toBe('#/privacy');
  });

  it('parses and builds routes that carry an asset id', () => {
    const id = 'ab'.repeat(32);
    expect(parseRoute(`#/passport/${id}`)).toEqual({ view: 'passport', param: id });
    expect(parseRoute('#/passport')).toEqual({ view: 'passport', param: null });
    expect(parseRoute('#/nope/abc')).toEqual({ view: 'overview', param: null });
    expect(toHash('passport', id)).toBe(`#/passport/${id}`);
  });

  it('keeps the mobile bottom bar to five destinations that all resolve', () => {
    expect(BOTTOM_NAV_IDS).toHaveLength(5);
    for (const id of BOTTOM_NAV_IDS.filter((i) => i !== 'more')) {
      expect(getNavItem(id)).toBeDefined();
    }
  });
});
