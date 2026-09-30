import { useState } from 'react';
import { copyToClipboard } from '../../lib/ui/format.js';
import { Icon } from './Icon.js';

/** A labelled, monospace value with a copy button that reports failure honestly. */
export const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = async () => {
    const ok = await copyToClipboard(value);
    setStatus(ok ? 'copied' : 'failed');
  };

  return (
    <div className="copy-field">
      <span className="copy-label">{label}</span>
      <div className="copy-row">
        <code className="mono">{value}</code>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onCopy} aria-label={`Copy ${label}`}>
          <Icon name="copy" size={18} />
        </button>
      </div>
      <span className="copy-status" role="status" aria-live="polite">
        {status === 'copied' && 'Copied'}
        {status === 'failed' && 'Could not copy automatically. Select the value and copy it manually.'}
      </span>
    </div>
  );
};
