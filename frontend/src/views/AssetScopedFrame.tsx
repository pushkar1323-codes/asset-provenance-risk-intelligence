import type { ReactNode } from 'react';
import type { LocalAsset } from '../lib/assets/assetStore.js';
import { categoryLabel } from '../lib/assets/labels.js';
import { toHash, type ViewId } from '../lib/nav/nav.js';
import { shortenMiddle } from '../lib/ui/format.js';
import { AssetStatusBadge } from '../components/AssetStatusBadge.js';

const TABS: ReadonlyArray<{ view: ViewId; label: string }> = [
  { view: 'passport', label: 'Passport' },
  { view: 'provenance', label: 'Provenance' },
  { view: 'risk', label: 'Risk' },
  { view: 'transfer', label: 'Transfer' },
  { view: 'retire', label: 'Retire' }
];

/** Shared heading and section links for every screen about one asset. */
export const AssetScopedFrame = ({
  asset,
  view,
  title,
  children
}: {
  asset: LocalAsset;
  view: ViewId;
  title: string;
  children: ReactNode;
}) => (
  <div className="stack-lg">
    <header className="stack-sm">
      <a className="back-link" href={toHash('assets')}>
        ← My Assets
      </a>
      <h1 className="page-title">{title}</h1>
      <p className="asset-line">
        <strong>{asset.identifier}</strong>
        <span className="muted">{categoryLabel(asset.category)}</span>
        <span className="muted mono">{shortenMiddle(asset.assetIdHex, 8, 6)}</span>
        <AssetStatusBadge status={asset.status} />
      </p>
      <nav aria-label="Asset sections">
        <ul className="subnav">
          {TABS.map((tab) => (
            <li key={tab.view}>
              <a
                href={toHash(tab.view, asset.assetIdHex)}
                className={`subnav-link${tab.view === view ? ' is-active' : ''}`}
                aria-current={tab.view === view ? 'page' : undefined}
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
    {children}
  </div>
);
