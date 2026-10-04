import type { LocalAsset } from '../lib/assets/assetStore.js';
import { categoryLabel, formatDateTime, STATUS_LABELS } from '../lib/assets/labels.js';
import type { ContractAvailability } from '../lib/contract/availability.js';
import { toHash } from '../lib/nav/nav.js';
import { AssetStatusBadge } from '../components/AssetStatusBadge.js';
import { Callout } from '../components/ui/Callout.js';
import { CopyField } from '../components/ui/CopyField.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { AssetScopedFrame } from './AssetScopedFrame.js';

/** One asset's record: summary, ownership, lifecycle, credentials and risk. */
export const PassportView = ({
  asset,
  availability,
  onDiscardDraft
}: {
  asset: LocalAsset;
  availability: ContractAvailability;
  onDiscardDraft: (assetIdHex: string) => void;
}) => {
  const registration = asset.events.find((event) => event.kind === 'registered');
  return (
    <AssetScopedFrame asset={asset} view="passport" title="Asset Passport">
      <section className="card stack" aria-labelledby="pp-summary">
        <div className="card-head">
          <h2 id="pp-summary" className="card-title">
            Summary
          </h2>
          <AssetStatusBadge status={asset.status} />
        </div>
        <p className="muted">{STATUS_LABELS[asset.status].meaning}</p>
        <dl className="facts">
          <dt>Identifier</dt>
          <dd className="mono">{asset.identifier}</dd>
          <dt>Category</dt>
          <dd>{categoryLabel(asset.category)}</dd>
          <dt>Added in this browser</dt>
          <dd>{formatDateTime(asset.createdAt)}</dd>
          {registration && (
            <>
              <dt>Registered</dt>
              <dd>{formatDateTime(registration.at)}</dd>
            </>
          )}
        </dl>
        <CopyField label="Public asset id (SHA-256 of the identifier)" value={asset.assetIdHex} />
        {registration?.transactionId && <CopyField label="Registration transaction id" value={registration.transactionId} />}
      </section>

      {asset.status === 'draft' && (
        <Callout icon="info" title="This asset is a draft">
          It has not been registered on Midnight, so there is no public record, ownership key or proof yet.{' '}
          {availability.available
            ? 'You can register it now.'
            : availability.message}
          <span className="actions callout-actions">
            <a className="btn btn-primary" href={toHash('register', asset.assetIdHex)}>
              Register this asset
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => onDiscardDraft(asset.assetIdHex)}>
              Delete draft
            </button>
          </span>
        </Callout>
      )}

      <section className="card stack-sm" aria-labelledby="pp-owner">
        <h2 id="pp-owner" className="card-title">
          Ownership
        </h2>
        {asset.status === 'draft' ? (
          <p className="muted">No ownership has been recorded. An ownership key is created when the asset is registered.</p>
        ) : (
          <p className="muted">
            Registered from this browser. The ledger holds only a commitment to the owner, never the ownership key,
            and the key is not shown here. This app does not read ownership changes back from the ledger.
          </p>
        )}
      </section>

      <div className="two-up">
        <section className="card stack-sm" aria-labelledby="pp-cred">
          <div className="card-head">
            <h2 id="pp-cred" className="card-title">
              Credentials
            </h2>
            <StatusBadge tone="neutral">None loaded</StatusBadge>
          </div>
          <p className="muted">
            No credentials are shown for this asset. This app does not record or read credentials yet, so this is
            not a statement about what exists on the ledger.
          </p>
        </section>
        <section className="card stack-sm" aria-labelledby="pp-risk">
          <div className="card-head">
            <h2 id="pp-risk" className="card-title">
              Risk
            </h2>
            <StatusBadge tone="neutral">Not assessed</StatusBadge>
          </div>
          <p className="muted">No risk assessment is shown for this asset.</p>
          <a href={toHash('risk', asset.assetIdHex)}>About risk assessments</a>
        </section>
      </div>
    </AssetScopedFrame>
  );
};
