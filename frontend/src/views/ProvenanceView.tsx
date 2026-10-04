import type { LocalAsset } from '../lib/assets/assetStore.js';
import { EVENT_LABELS, formatDateTime } from '../lib/assets/labels.js';
import { Callout } from '../components/ui/Callout.js';
import { CopyField } from '../components/ui/CopyField.js';
import { AssetScopedFrame } from './AssetScopedFrame.js';

/** Timeline of the lifecycle events this browser has recorded for the asset. */
export const ProvenanceView = ({ asset }: { asset: LocalAsset }) => {
  const events = [...asset.events].sort((a, b) => b.at - a.at);
  return (
    <AssetScopedFrame asset={asset} view="provenance" title="Provenance">
      <Callout icon="info" title="What this timeline shows">
        Events recorded by this browser. Provenance events written to the ledger by others are not read back
        into this view.
      </Callout>
      {events.length === 0 ? (
        <p className="muted">No events have been recorded.</p>
      ) : (
        <ol className="timeline card" aria-label="Asset events, newest first">
          {events.map((event) => (
            <li key={`${event.kind}-${event.at}`} className="timeline-item">
              <span className="timeline-dot" aria-hidden="true" />
              <div className="stack-sm">
                <strong>{EVENT_LABELS[event.kind].title}</strong>
                <time dateTime={new Date(event.at).toISOString()} className="muted">
                  {formatDateTime(event.at)}
                </time>
                <p className="muted">{EVENT_LABELS[event.kind].detail}</p>
                {event.transactionId && <CopyField label="Transaction id" value={event.transactionId} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </AssetScopedFrame>
  );
};
