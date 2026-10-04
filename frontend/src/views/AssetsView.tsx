import { useMemo, useState } from 'react';
import type { LocalAsset, LocalAssetStatus } from '../lib/assets/assetStore.js';
import { categoryLabel, formatDateTime } from '../lib/assets/labels.js';
import { toHash } from '../lib/nav/nav.js';
import { shortenMiddle } from '../lib/ui/format.js';
import { AssetStatusBadge } from '../components/AssetStatusBadge.js';
import { Callout } from '../components/ui/Callout.js';
import { EmptyState } from '../components/ui/EmptyState.js';

type Filter = 'all' | LocalAssetStatus;

/** Lists the assets this browser has registered or saved as drafts. */
export const AssetsView = ({ assets, saveFailed }: { assets: readonly LocalAsset[]; saveFailed: boolean }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter(
      (asset) =>
        (filter === 'all' || asset.status === filter) &&
        (needle === '' ||
          asset.identifier.toLowerCase().includes(needle) ||
          asset.assetIdHex.includes(needle))
    );
  }, [assets, query, filter]);

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <h1 className="page-title">My Assets</h1>
        <p className="muted">
          Assets registered or saved as drafts in this browser. This list is kept on this device, not read from
          the ledger.
        </p>
      </header>

      {saveFailed && (
        <Callout tone="warning" icon="alert" title="Changes could not be saved">
          This browser did not allow the asset list to be saved. It will be lost when you close the page.
        </Callout>
      )}

      {assets.length === 0 ? (
        <EmptyState
          icon="list"
          title="No assets yet"
          action={
            <a className="btn btn-primary" href={toHash('register')}>
              Register an asset
            </a>
          }
        >
          You have not registered or saved any assets in this browser. You can save a draft without a wallet.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="field">
              <label htmlFor="asset-search">Search</label>
              <input
                id="asset-search"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Identifier or asset id"
              />
            </div>
            <div className="field">
              <label htmlFor="asset-filter">Status</label>
              <select id="asset-filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="registered">Registered</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon="list" title="No matching assets">
              No assets match the current search and filter.
            </EmptyState>
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <caption className="sr-only">Assets in this browser</caption>
                <thead>
                  <tr>
                    <th scope="col">Identifier</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Added</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((asset) => (
                    <tr key={asset.assetIdHex}>
                      <th scope="row">
                        <span>{asset.identifier}</span>
                        <small className="muted mono block">{shortenMiddle(asset.assetIdHex, 8, 6)}</small>
                      </th>
                      <td>{categoryLabel(asset.category)}</td>
                      <td>
                        <AssetStatusBadge status={asset.status} />
                      </td>
                      <td>{formatDateTime(asset.createdAt)}</td>
                      <td>
                        <a className="btn btn-secondary btn-sm" href={toHash('passport', asset.assetIdHex)}>
                          View passport
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
