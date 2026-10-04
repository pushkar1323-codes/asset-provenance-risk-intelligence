import type { LocalAsset } from '../lib/assets/assetStore.js';
import { toHash, type ViewId } from '../lib/nav/nav.js';
import { shortenMiddle } from '../lib/ui/format.js';
import { categoryLabel } from '../lib/assets/labels.js';
import { AssetStatusBadge } from './AssetStatusBadge.js';
import { EmptyState } from './ui/EmptyState.js';

/** Lets the user choose which asset an asset-scoped destination should show. */
export const AssetPicker = ({
  title,
  intro,
  view,
  assets
}: {
  title: string;
  intro: string;
  view: ViewId;
  assets: readonly LocalAsset[];
}) => (
  <div className="stack-lg">
    <header className="stack-sm">
      <h1 className="page-title">{title}</h1>
      <p className="muted">{intro}</p>
    </header>
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
        Assets you register or save as a draft in this browser will appear here.
      </EmptyState>
    ) : (
      <ul className="card pick-list" aria-label="Choose an asset">
        {assets.map((asset) => (
          <li key={asset.assetIdHex}>
            <a className="pick-link" href={toHash(view, asset.assetIdHex)}>
              <span className="pick-main">
                <strong>{asset.identifier}</strong>
                <small className="muted">
                  {categoryLabel(asset.category)} · <span className="mono">{shortenMiddle(asset.assetIdHex, 8, 6)}</span>
                </small>
              </span>
              <AssetStatusBadge status={asset.status} />
            </a>
          </li>
        ))}
      </ul>
    )}
  </div>
);
