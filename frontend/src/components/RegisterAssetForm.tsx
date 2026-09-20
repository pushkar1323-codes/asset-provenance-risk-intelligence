import { useState, type FormEvent } from 'react';
import { validateRegisterAssetInput, type RegisterAssetInput } from '../lib/contract/validation.js';
import type { RegisterAssetResult } from '../lib/contract/registerAsset.js';

const ASSET_CATEGORIES: ReadonlyArray<{ readonly value: number; readonly label: string }> = [
  { value: 1, label: 'Passenger vehicle' },
  { value: 2, label: 'Commercial vehicle' },
  { value: 3, label: 'Motorcycle' }
];

type SubmissionState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'submitting' }
  | { readonly phase: 'done'; readonly result: RegisterAssetResult };

type RegisterAssetFormProps = {
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly onSubmit: (input: RegisterAssetInput) => Promise<RegisterAssetResult>;
};

export const RegisterAssetForm = ({ disabled, disabledReason, onSubmit }: RegisterAssetFormProps) => {
  const [assetIdentifier, setAssetIdentifier] = useState('');
  const [assetCategory, setAssetCategory] = useState(ASSET_CATEGORIES[0].value);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<SubmissionState>({ phase: 'idle' });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const input: RegisterAssetInput = { assetIdentifier, assetCategory };
    const validation = validateRegisterAssetInput(input);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setSubmission({ phase: 'submitting' });

    const result = await onSubmit(input);
    setSubmission({ phase: 'done', result });
  };

  return (
    <section className="panel" aria-label="Register an asset">
      <h2>Register an asset</h2>
      {disabled && disabledReason && <p className="hint">{disabledReason}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="assetIdentifier">Asset identifier (e.g. VIN)</label>
        <input
          id="assetIdentifier"
          type="text"
          value={assetIdentifier}
          onChange={(e) => setAssetIdentifier(e.target.value)}
          disabled={disabled || submission.phase === 'submitting'}
        />
        {fieldErrors.assetIdentifier && <p className="error">{fieldErrors.assetIdentifier}</p>}

        <label htmlFor="assetCategory">Category</label>
        <select
          id="assetCategory"
          value={assetCategory}
          onChange={(e) => setAssetCategory(Number(e.target.value))}
          disabled={disabled || submission.phase === 'submitting'}
        >
          {ASSET_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {fieldErrors.assetCategory && <p className="error">{fieldErrors.assetCategory}</p>}

        <p className="hint">
          Only the identifier (hashed) and category are recorded publicly. No ownership key
          material is entered here - it is generated automatically.
        </p>

        <button type="submit" disabled={disabled || submission.phase === 'submitting'}>
          {submission.phase === 'submitting' ? 'Submitting…' : 'Register asset'}
        </button>
      </form>

      {submission.phase === 'submitting' && (
        <p role="status" aria-live="polite">
          Building the proof and preparing the transaction…
        </p>
      )}

      {submission.phase === 'done' && submission.result.kind === 'success' && (
        <div role="status">
          <p>Asset registered.</p>
          <dl>
            <dt>Asset id</dt>
            <dd>{submission.result.assetIdHex}</dd>
            <dt>Transaction id</dt>
            <dd>{submission.result.transactionId}</dd>
          </dl>
        </div>
      )}

      {submission.phase === 'done' && submission.result.kind === 'failure' && (
        <div role="alert">
          <p className="error">{submission.result.message}</p>
          {submission.result.requiresLiveWalletVerification && (
            <p className="hint">
              This step requires verifying the wallet integration against a live wallet and
              network - it has not been completed in this environment.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
