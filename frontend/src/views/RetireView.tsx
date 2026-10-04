import { useState } from 'react';
import type { LocalAsset } from '../lib/assets/assetStore.js';
import { lifecycleBlockers } from '../lib/assets/lifecycle.js';
import type { ContractAvailability } from '../lib/contract/availability.js';
import { LifecycleBlockers } from '../components/LifecycleBlockers.js';
import { Callout } from '../components/ui/Callout.js';
import { AssetScopedFrame } from './AssetScopedFrame.js';

/** Retire flow up to submission. The final action stays off until the operation is connected. */
export const RetireView = ({ asset, availability }: { asset: LocalAsset; availability: ContractAvailability }) => {
  const [confirmed, setConfirmed] = useState(false);
  const blockers = lifecycleBlockers(asset, 'retireAsset', availability);

  return (
    <AssetScopedFrame asset={asset} view="retire" title="Retire Asset">
      <section className="card stack">
        <div>
          <h2 className="card-title">Retire this asset</h2>
          <p className="muted">
            Retiring permanently marks the asset as retired. Only the current owner can do this, and it cannot be
            reversed.
          </p>
        </div>
        <Callout tone="warning" icon="alert" title="This is permanent">
          A retired asset can no longer be transferred or changed.
        </Callout>
        <div className="check-row">
          <input
            id="retire-confirm"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <label htmlFor="retire-confirm">I understand that retiring this asset cannot be undone.</label>
        </div>
        <LifecycleBlockers blockers={blockers} />
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={!confirmed || blockers.length > 0}>
            Retire asset
          </button>
        </div>
      </section>
    </AssetScopedFrame>
  );
};
