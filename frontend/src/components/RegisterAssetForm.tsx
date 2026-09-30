import { useState, type FormEvent } from 'react';
import { validateRegisterAssetInput, type RegisterAssetInput } from '../lib/contract/validation.js';
import { deriveAssetId, bytesToHex } from '../lib/contract/assetId.js';
import type { RegisterAssetResult } from '../lib/contract/registerAsset.js';
import { describeRegisterFailure } from '../lib/contract/errorMessages.js';
import {
  IDENTIFIER_LIMITATION,
  KEY_HANDLING_NOTE,
  REGISTRATION_LIMITATION
} from '../lib/content/privacy.js';
import { toHash } from '../lib/nav/nav.js';
import { Callout } from './ui/Callout.js';
import { CopyField } from './ui/CopyField.js';
import { DisclosureColumns } from './ui/DisclosureColumns.js';
import { Icon } from './ui/Icon.js';
import { StepIndicator } from './ui/StepIndicator.js';

const ASSET_CATEGORIES: ReadonlyArray<{ readonly value: number; readonly label: string }> = [
  { value: 1, label: 'Passenger vehicle' },
  { value: 2, label: 'Commercial vehicle' },
  { value: 3, label: 'Motorcycle' }
];

/** Progress the application can genuinely observe while submitting. */
export type RegisterProgress = 'preparing' | 'proving';

const STEPS = ['Details', 'Review', 'Approve & prove', 'Result'] as const;

type Flow =
  | { readonly step: 'details' }
  | { readonly step: 'review'; readonly assetIdHash: string | null }
  | { readonly step: 'processing'; readonly progress: RegisterProgress }
  | { readonly step: 'result'; readonly result: RegisterAssetResult; readonly assetIdHash: string | null };

type RegisterAssetFormProps = {
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly onSubmit: (
    input: RegisterAssetInput,
    onProgress?: (progress: RegisterProgress) => void
  ) => Promise<RegisterAssetResult>;
};

const categoryLabel = (value: number): string =>
  ASSET_CATEGORIES.find((c) => c.value === value)?.label ?? `Category ${value}`;

export const RegisterAssetForm = ({ disabled, disabledReason, onSubmit }: RegisterAssetFormProps) => {
  const [assetIdentifier, setAssetIdentifier] = useState('');
  const [assetCategory, setAssetCategory] = useState(ASSET_CATEGORIES[0].value);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [flow, setFlow] = useState<Flow>({ step: 'details' });

  const input: RegisterAssetInput = { assetIdentifier, assetCategory };
  const stepIndex = flow.step === 'details' ? 0 : flow.step === 'review' ? 1 : flow.step === 'processing' ? 2 : 3;

  const goToReview = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateRegisterAssetInput(input);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    // The preview is informational. If hashing is unavailable the review still
    // works; the real registration derives the id itself.
    let assetIdHash: string | null = null;
    try {
      assetIdHash = bytesToHex(await deriveAssetId(assetIdentifier));
    } catch {
      assetIdHash = null;
    }
    setFlow({ step: 'review', assetIdHash });
  };

  const submit = async (assetIdHash: string | null) => {
    setFlow({ step: 'processing', progress: 'preparing' });
    const result = await onSubmit(input, (progress) => setFlow({ step: 'processing', progress }));
    setFlow({ step: 'result', result, assetIdHash });
  };

  const startOver = () => {
    setAssetIdentifier('');
    setAssetCategory(ASSET_CATEGORIES[0].value);
    setFieldErrors({});
    setFlow({ step: 'details' });
  };

  return (
    <section className="stack" aria-label="Register an asset">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {flow.step === 'details' && (
        <div className="register-grid">
          <form className="card stack" onSubmit={goToReview} noValidate>
            <div>
              <h2 className="card-title">Asset details</h2>
              <p className="muted">Enter the identifier and category of the asset you want to register.</p>
            </div>

            {disabled && disabledReason && (
              <Callout icon="info" title="Registration is not available yet">
                {disabledReason}
              </Callout>
            )}

            <div className="field">
              <label htmlFor="assetIdentifier">Asset identifier (e.g. VIN)</label>
              <input
                id="assetIdentifier"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={assetIdentifier}
                onChange={(e) => setAssetIdentifier(e.target.value)}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.assetIdentifier)}
                aria-describedby="assetIdentifier-help"
              />
              <p id="assetIdentifier-help" className="field-help">
                Only a SHA-256 hash of this identifier is submitted. The hash is public and is not a secret.
              </p>
              {fieldErrors.assetIdentifier && <p className="error-text">{fieldErrors.assetIdentifier}</p>}
            </div>

            <div className="field">
              <label htmlFor="assetCategory">Category</label>
              <select
                id="assetCategory"
                value={assetCategory}
                onChange={(e) => setAssetCategory(Number(e.target.value))}
                disabled={disabled}
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {fieldErrors.assetCategory && <p className="error-text">{fieldErrors.assetCategory}</p>}
            </div>

            <div>
              <button type="submit" className="btn btn-primary btn-block" disabled={disabled}>
                Review
              </button>
            </div>
          </form>

          <aside className="card stack-sm" aria-label="What registration records">
            <h3 className="card-title">What gets recorded</h3>
            <p className="muted">
              Registration writes a public record and keeps an ownership key on this device. You will see the
              full breakdown before anything is submitted.
            </p>
            <Callout icon="lock">{IDENTIFIER_LIMITATION}</Callout>
          </aside>
        </div>
      )}

      {flow.step === 'review' && (
        <div className="stack">
          <div className="card stack">
            <div>
              <h2 className="card-title">Review your registration</h2>
              <p className="muted">Check the details, and what will be public, before you continue.</p>
            </div>
            <dl className="facts">
              <dt>Identifier</dt>
              <dd className="mono">{assetIdentifier.trim()}</dd>
              <dt>Category</dt>
              <dd>{categoryLabel(assetCategory)}</dd>
              <dt>Public asset id</dt>
              <dd className="mono">
                {flow.assetIdHash ?? 'Preview unavailable in this browser. It is derived when you submit.'}
              </dd>
            </dl>
          </div>

          <DisclosureColumns />

          <div className="stack-sm">
            <Callout tone="warning" icon="alert" title="Identifier hash is not confidential">
              {IDENTIFIER_LIMITATION}
            </Callout>
            <Callout tone="warning" icon="alert" title="About your ownership key">
              {KEY_HANDLING_NOTE}
            </Callout>
            <Callout icon="info" title="What registration does not verify">
              {REGISTRATION_LIMITATION}
            </Callout>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => setFlow({ step: 'details' })}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={disabled}
              onClick={() => void submit(flow.assetIdHash)}
            >
              Register asset
            </button>
          </div>
        </div>
      )}

      {flow.step === 'processing' && (
        <div className="card stack processing" role="status" aria-live="polite">
          <div className="processing-head">
            <span className="spinner spinner-lg" aria-hidden="true" />
            <div>
              <h2 className="card-title">Registering your asset…</h2>
              <p className="muted">Keep this page open. Your wallet may ask you to approve the transaction.</p>
            </div>
          </div>
          <ol className="checklist">
            <li className={flow.progress === 'preparing' ? 'is-active' : 'is-done'}>
              <span className="check-mark" aria-hidden="true">
                {flow.progress === 'preparing' ? '' : <Icon name="check" size={14} />}
              </span>
              Preparing the asset data and wallet connection
            </li>
            <li className={flow.progress === 'proving' ? 'is-active' : 'is-todo'}>
              <span className="check-mark" aria-hidden="true" />
              Contract lookup, zero-knowledge proof, wallet approval and submission
            </li>
            <li className="is-todo">
              <span className="check-mark" aria-hidden="true" />
              Result
            </li>
          </ol>
          <p className="field-help">
            The wallet and SDK do not report progress inside the second step, so it is shown as one step. This
            can take a while.
          </p>
        </div>
      )}

      {flow.step === 'result' && flow.result.kind === 'success' && (
        <div className="card stack result result-success">
          <div className="result-head">
            <span className="result-icon">
              <Icon name="check" size={28} />
            </span>
            <div>
              <h2 className="card-title">Asset registered</h2>
              <p className="muted">The contract accepted the registration.</p>
            </div>
          </div>
          <CopyField label="Asset ID (SHA-256 of the identifier)" value={flow.result.assetIdHex} />
          <CopyField label="Transaction ID" value={flow.result.transactionId} />
          <Callout icon="lock" title="Your ownership key stays on this device">
            <a href={toHash('privacy')}>Read how the key is handled</a>, including its limits.
          </Callout>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={startOver}>
              Register another
            </button>
            <button type="button" className="btn btn-secondary" disabled aria-describedby="passport-soon">
              View passport
            </button>
          </div>
          <p id="passport-soon" className="field-help">
            Viewing a passport is not available yet.
          </p>
        </div>
      )}

      {flow.step === 'result' && flow.result.kind === 'failure' && (
        <FailureCard
          result={flow.result}
          onRetry={() => setFlow({ step: 'review', assetIdHash: flow.assetIdHash })}
          onEdit={() => setFlow({ step: 'details' })}
        />
      )}
    </section>
  );
};

const FailureCard = ({
  result,
  onRetry,
  onEdit
}: {
  result: Extract<RegisterAssetResult, { kind: 'failure' }>;
  onRetry: () => void;
  onEdit: () => void;
}) => {
  const view = describeRegisterFailure(result);
  return (
    <div className="card stack result result-failure" role="alert">
      <div className="result-head">
        <span className="result-icon">
          <Icon name="alert" size={28} />
        </span>
        <div>
          <h2 className="card-title">{view.title}</h2>
          <p>{view.message}</p>
        </div>
      </div>
      <div className="actions">
        {view.retryable && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        <button type="button" className={view.retryable ? 'btn btn-secondary' : 'btn btn-primary'} onClick={onEdit}>
          Edit details
        </button>
      </div>
      <details className="tech-details">
        <summary>Technical details</summary>
        <pre className="mono">{view.technicalDetail}</pre>
      </details>
    </div>
  );
};
