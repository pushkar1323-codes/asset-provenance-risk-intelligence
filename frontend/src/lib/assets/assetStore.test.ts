import { describe, expect, it } from 'vitest';
import {
  ASSET_STORE_KEY,
  addDraft,
  clearAssets,
  loadAssets,
  parseStoredAssets,
  recordRegistration,
  removeDraft,
  saveAssets,
  type KeyValueStorage,
  type LocalAsset
} from './assetStore.js';

const ID_A = 'aa'.repeat(32);
const ID_B = 'bb'.repeat(32);

const memoryStorage = (initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    }
  };
};

describe('local asset store', () => {
  it('adds a draft that is clearly not registered and has no transaction id', () => {
    const result = addDraft([], { assetIdHex: ID_A, identifier: '  VIN-1  ', category: 1 }, 1000);
    expect(result.kind).toBe('added');
    if (result.kind !== 'added') return;
    expect(result.asset).toMatchObject({ identifier: 'VIN-1', status: 'draft', createdAt: 1000 });
    expect(result.asset.events).toEqual([{ kind: 'draft-saved', at: 1000 }]);
    expect(JSON.stringify(result.asset)).not.toMatch(/transactionId/);
  });

  it('refuses to add a second entry for the same asset id', () => {
    const first = addDraft([], { assetIdHex: ID_A, identifier: 'VIN-1', category: 1 }, 1);
    if (first.kind !== 'added') throw new Error('expected added');
    const second = addDraft(first.assets, { assetIdHex: ID_A, identifier: 'VIN-1', category: 1 }, 2);
    expect(second.kind).toBe('exists');
  });

  it('turns a draft into a registered asset only when given a transaction id, keeping its history', () => {
    const draft = addDraft([], { assetIdHex: ID_A, identifier: 'VIN-1', category: 1 }, 1);
    if (draft.kind !== 'added') throw new Error('expected added');

    const after = recordRegistration(
      draft.assets,
      { assetIdHex: ID_A, identifier: 'VIN-1', category: 1, transactionId: 'tx-1' },
      5
    );
    expect(after).toHaveLength(1);
    expect(after[0]?.status).toBe('registered');
    expect(after[0]?.events.map((e) => e.kind)).toEqual(['draft-saved', 'registered']);
    expect(after[0]?.events[1]?.transactionId).toBe('tx-1');
  });

  it('creates a registered entry when registering without a saved draft', () => {
    const after = recordRegistration(
      [],
      { assetIdHex: ID_B, identifier: 'VIN-2', category: 3, transactionId: 'tx-2' },
      9
    );
    expect(after[0]).toMatchObject({ assetIdHex: ID_B, status: 'registered', createdAt: 9 });
  });

  it('only discards drafts, never registered assets', () => {
    const registered = recordRegistration(
      [],
      { assetIdHex: ID_A, identifier: 'VIN-1', category: 1, transactionId: 'tx' },
      1
    );
    expect(removeDraft(registered, ID_A)).toHaveLength(1);
    const draft = addDraft([], { assetIdHex: ID_B, identifier: 'VIN-2', category: 1 }, 1);
    if (draft.kind !== 'added') throw new Error('expected added');
    expect(removeDraft(draft.assets, ID_B)).toHaveLength(0);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const draft = addDraft([], { assetIdHex: ID_A, identifier: 'VIN-1', category: 2 }, 1);
    if (draft.kind !== 'added') throw new Error('expected added');
    expect(saveAssets(draft.assets, storage)).toBe(true);
    expect(loadAssets(storage)).toEqual(draft.assets);
    expect(clearAssets(storage)).toBe(true);
    expect(loadAssets(storage)).toEqual([]);
  });

  it('treats corrupt, wrongly shaped or partial stored data as empty instead of failing', () => {
    expect(parseStoredAssets(null)).toEqual([]);
    expect(parseStoredAssets('not json')).toEqual([]);
    expect(parseStoredAssets('{"a":1}')).toEqual([]);
    const valid: LocalAsset = {
      assetIdHex: ID_A,
      identifier: 'VIN-1',
      category: 1,
      status: 'draft',
      createdAt: 1,
      events: [{ kind: 'draft-saved', at: 1 }]
    };
    const mixed = JSON.stringify([valid, { assetIdHex: 'short' }, { ...valid, status: 'bogus' }, null]);
    expect(parseStoredAssets(mixed)).toEqual([valid]);
  });

  it('reports a failed write instead of pretending it was saved', () => {
    const refusing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined
    };
    expect(saveAssets([], refusing)).toBe(false);
    expect(saveAssets([], null)).toBe(false);
    expect(loadAssets(null)).toEqual([]);
  });

  it('never stores key material: only the documented fields are persisted', () => {
    const storage = memoryStorage();
    const draft = addDraft([], { assetIdHex: ID_A, identifier: 'VIN-1', category: 1 }, 1);
    if (draft.kind !== 'added') throw new Error('expected added');
    saveAssets(draft.assets, storage);
    const stored = JSON.parse(storage.data[ASSET_STORE_KEY] ?? '[]') as Record<string, unknown>[];
    expect(Object.keys(stored[0] ?? {}).sort()).toEqual(
      ['assetIdHex', 'category', 'createdAt', 'events', 'identifier', 'status'].sort()
    );
  });
});
