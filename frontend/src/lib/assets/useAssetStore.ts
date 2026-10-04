import { useCallback, useRef, useState } from 'react';
import {
  addDraft,
  clearAssets,
  findAsset,
  loadAssets,
  recordRegistration,
  removeDraft,
  saveAssets,
  type AddDraftResult,
  type LocalAsset
} from './assetStore.js';

export type SaveDraftResult =
  | { readonly kind: 'added'; readonly persisted: boolean }
  | Extract<AddDraftResult, { kind: 'exists' }>;

export type AssetStore = {
  readonly assets: readonly LocalAsset[];
  /** True when the last attempt to write to browser storage failed. */
  readonly saveFailed: boolean;
  find(assetIdHex: string): LocalAsset | undefined;
  saveDraft(input: { assetIdHex: string; identifier: string; category: number }): SaveDraftResult;
  markRegistered(input: {
    assetIdHex: string;
    identifier: string;
    category: number;
    transactionId: string;
  }): void;
  discardDraft(assetIdHex: string): void;
  clearAll(): void;
};

/**
 * React binding for the browser-local asset record. Updates are applied to
 * a ref first so a registration that finishes after a long-running wallet
 * interaction never overwrites changes made in the meantime.
 */
export const useAssetStore = (): AssetStore => {
  const [assets, setAssets] = useState<LocalAsset[]>(() => loadAssets());
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef<LocalAsset[]>(assets);

  const commit = useCallback((next: LocalAsset[]): boolean => {
    latest.current = next;
    setAssets(next);
    const persisted = saveAssets(next);
    setSaveFailed(!persisted);
    return persisted;
  }, []);

  const find = useCallback((assetIdHex: string) => findAsset(assets, assetIdHex), [assets]);

  const saveDraft = useCallback<AssetStore['saveDraft']>(
    (input) => {
      const result = addDraft(latest.current, input, Date.now());
      if (result.kind === 'exists') return result;
      return { kind: 'added', persisted: commit(result.assets) };
    },
    [commit]
  );

  const markRegistered = useCallback<AssetStore['markRegistered']>(
    (input) => commit(recordRegistration(latest.current, input, Date.now())),
    [commit]
  );

  const discardDraft = useCallback<AssetStore['discardDraft']>(
    (assetIdHex) => commit(removeDraft(latest.current, assetIdHex)),
    [commit]
  );

  const clearAll = useCallback(() => {
    latest.current = [];
    setAssets([]);
    setSaveFailed(!clearAssets());
  }, []);

  return { assets, saveFailed, find, saveDraft, markRegistered, discardDraft, clearAll };
};
