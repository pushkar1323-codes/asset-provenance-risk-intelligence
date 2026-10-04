import { useState, type FormEvent } from 'react';
import type { LocalAsset } from '../lib/assets/assetStore.js';
import { lifecycleBlockers, validateOwnerCommitment } from '../lib/assets/lifecycle.js';
import type { ContractAvailability } from '../lib/contract/availability.js';
import { LifecycleBlockers } from '../components/LifecycleBlockers.js';
import { Callout } from '../components/ui/Callout.js';
import { AssetScopedFrame } from './AssetScopedFrame.js';

/** Transfer flow up to submission. The final action stays off until the operation is connected. */
export const TransferView = ({ asset, availability }: { asset: LocalAsset; availability: ContractAvailability }) => {
  const [commitment, setCommitment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);

  const blockers = lifecycleBlockers(asset, 'transferOwnership', availability);

  const review = (event: FormEvent) => {
    event.preventDefault();
    const result = validateOwnerCommitment(commitment);
    if (!result.valid) {
      setError(result.error);
      setReviewed(null);
      return;
    }
    setError(null);
    setReviewed(result.normalized);
  };

  return (
    <AssetScopedFrame asset={asset} view="transfer" title="Transfer Ownership">
      <form className="card stack" onSubmit={review} noValidate>
        <div>
          <h2 className="card-title">New owner</h2>
          <p className="muted">
            Ownership moves by replacing the owner commitment recorded for the asset. Only the current owner can
            do this, and the proof is created without revealing the ownership key.
          </p>
        </div>
        <div className="field">
          <label htmlFor="newOwnerCommitment">New owner commitment (64 hexadecimal characters)</label>
          <input
            id="newOwnerCommitment"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="newOwnerCommitment-help"
          />
          <p id="newOwnerCommitment-help" className="field-help">
            The recipient provides this value. Do not enter anyone&apos;s ownership key here.
          </p>
          {error && <p className="error-text">{error}</p>}
        </div>
        <div>
          <button type="submit" className="btn btn-secondary">
            Review transfer
          </button>
        </div>
      </form>

      {reviewed && (
        <section className="card stack" aria-labelledby="transfer-review">
          <h2 id="transfer-review" className="card-title">
            Review transfer
          </h2>
          <dl className="facts">
            <dt>Asset</dt>
            <dd className="mono">{asset.identifier}</dd>
            <dt>New owner commitment</dt>
            <dd className="mono">{reviewed}</dd>
          </dl>
          <Callout tone="warning" icon="alert" title="Transfers cannot be undone by you">
            After a transfer, only the new owner can act on this asset.
          </Callout>
          <LifecycleBlockers blockers={blockers} />
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={blockers.length > 0}>
              Confirm transfer
            </button>
          </div>
        </section>
      )}
    </AssetScopedFrame>
  );
};
