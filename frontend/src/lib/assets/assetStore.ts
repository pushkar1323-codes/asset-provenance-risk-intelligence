/**
 * Browser-local record of the assets this browser has prepared or
 * registered. It is an application convenience, not a source of truth:
 *
 * - A "draft" exists only here. It has not been submitted anywhere.
 * - A "registered" record is created only after the contract call returned
 *   a transaction id, and that id is stored with it.
 * - Anything the application cannot read back from the ledger (credentials,
 *   risk assessments, ownership changes made elsewhere) is never invented
 *   here; the views say so instead.
 *
 * The ownership key is NOT stored here. It lives in the Midnight.js
 * private-state store and is never written to this record.
 */

export type LocalAssetStatus = 'draft' | 'registered' | 'retired';

export type LocalAssetEventKind = 'draft-saved' | 'registered' | 'retired';

export type LocalAssetEvent = {
  readonly kind: LocalAssetEventKind;
  /** Milliseconds since the Unix epoch, taken from this browser's clock. */
  readonly at: number;
  /** Present only for events confirmed by a returned transaction id. */
  readonly transactionId?: string;
};

export type LocalAsset = {
  /** Hex of the SHA-256 identifier hash used as the public asset id. */
  readonly assetIdHex: string;
  /** The identifier text the user entered. Kept on this device only. */
  readonly identifier: string;
  readonly category: number;
  readonly status: LocalAssetStatus;
  readonly createdAt: number;
  readonly events: readonly LocalAssetEvent[];
};

export const ASSET_STORE_KEY = 'asset-passport.local-assets.v1';

const STATUSES: ReadonlySet<string> = new Set<LocalAssetStatus>(['draft', 'registered', 'retired']);
const EVENT_KINDS: ReadonlySet<string> = new Set<LocalAssetEventKind>(['draft-saved', 'registered', 'retired']);
const HEX_ID = /^[0-9a-f]{64}$/;

const isEvent = (value: unknown): value is LocalAssetEvent => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.kind === 'string' &&
    EVENT_KINDS.has(v.kind) &&
    typeof v.at === 'number' &&
    Number.isFinite(v.at) &&
    (v.transactionId === undefined || typeof v.transactionId === 'string')
  );
};

const isAsset = (value: unknown): value is LocalAsset => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.assetIdHex === 'string' &&
    HEX_ID.test(v.assetIdHex) &&
    typeof v.identifier === 'string' &&
    typeof v.category === 'number' &&
    Number.isInteger(v.category) &&
    typeof v.status === 'string' &&
    STATUSES.has(v.status) &&
    typeof v.createdAt === 'number' &&
    Number.isFinite(v.createdAt) &&
    Array.isArray(v.events) &&
    v.events.every(isEvent)
  );
};

/** Parses stored text, dropping anything malformed instead of failing. */
export const parseStoredAssets = (raw: string | null): LocalAsset[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAsset) : [];
  } catch {
    return [];
  }
};

export const findAsset = (assets: readonly LocalAsset[], assetIdHex: string): LocalAsset | undefined =>
  assets.find((asset) => asset.assetIdHex === assetIdHex);

export type AddDraftResult =
  | { readonly kind: 'added'; readonly assets: LocalAsset[]; readonly asset: LocalAsset }
  | { readonly kind: 'exists'; readonly asset: LocalAsset };

/** Adds a draft unless an entry with the same asset id already exists. */
export const addDraft = (
  assets: readonly LocalAsset[],
  input: { assetIdHex: string; identifier: string; category: number },
  now: number
): AddDraftResult => {
  const existing = findAsset(assets, input.assetIdHex);
  if (existing) return { kind: 'exists', asset: existing };
  const asset: LocalAsset = {
    assetIdHex: input.assetIdHex,
    identifier: input.identifier.trim(),
    category: input.category,
    status: 'draft',
    createdAt: now,
    events: [{ kind: 'draft-saved', at: now }]
  };
  return { kind: 'added', assets: [asset, ...assets], asset };
};

/**
 * Records a confirmed registration. Updates a matching draft, or creates
 * the entry if the registration was submitted without saving a draft.
 * Only call this with a transaction id the contract call actually returned.
 */
export const recordRegistration = (
  assets: readonly LocalAsset[],
  input: { assetIdHex: string; identifier: string; category: number; transactionId: string },
  now: number
): LocalAsset[] => {
  const event: LocalAssetEvent = { kind: 'registered', at: now, transactionId: input.transactionId };
  const existing = findAsset(assets, input.assetIdHex);
  if (!existing) {
    return [
      {
        assetIdHex: input.assetIdHex,
        identifier: input.identifier.trim(),
        category: input.category,
        status: 'registered',
        createdAt: now,
        events: [event]
      },
      ...assets
    ];
  }
  return assets.map((asset) =>
    asset.assetIdHex === input.assetIdHex
      ? { ...asset, status: 'registered' as const, events: [...asset.events, event] }
      : asset
  );
};

export const removeDraft = (assets: readonly LocalAsset[], assetIdHex: string): LocalAsset[] =>
  assets.filter((asset) => !(asset.assetIdHex === assetIdHex && asset.status === 'draft'));

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultStorage = (): KeyValueStorage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const loadAssets = (storage: KeyValueStorage | null = defaultStorage()): LocalAsset[] => {
  if (!storage) return [];
  try {
    return parseStoredAssets(storage.getItem(ASSET_STORE_KEY));
  } catch {
    return [];
  }
};

/** Returns false when the browser refused the write, so callers can say so. */
export const saveAssets = (
  assets: readonly LocalAsset[],
  storage: KeyValueStorage | null = defaultStorage()
): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(ASSET_STORE_KEY, JSON.stringify(assets));
    return true;
  } catch {
    return false;
  }
};

export const clearAssets = (storage: KeyValueStorage | null = defaultStorage()): boolean => {
  if (!storage) return false;
  try {
    storage.removeItem(ASSET_STORE_KEY);
    return true;
  } catch {
    return false;
  }
};
