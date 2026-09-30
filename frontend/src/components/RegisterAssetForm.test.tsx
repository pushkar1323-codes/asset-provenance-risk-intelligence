import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterAssetForm } from './RegisterAssetForm.js';
import type { RegisterAssetResult } from '../lib/contract/registerAsset.js';

const fillAndReview = async (identifier = '1HGCM82633A123456') => {
  fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: identifier } });
  fireEvent.click(screen.getByRole('button', { name: /^review$/i }));
  await screen.findByRole('heading', { name: /review your registration/i });
};

describe('RegisterAssetForm', () => {
  it('disables the form and shows the reason when disabled', () => {
    render(
      <RegisterAssetForm disabled disabledReason="Connect a wallet to continue." onSubmit={vi.fn()} />
    );

    expect(screen.getByText('Connect a wallet to continue.')).toBeInTheDocument();
    expect(screen.getByLabelText(/asset identifier/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^review$/i })).toBeDisabled();
  });

  it('blocks the review step and shows an error when the identifier is too short', async () => {
    const onSubmit = vi.fn();
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: /^review$/i }));

    expect(await screen.findByText(/at least/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /review your registration/i })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('review step separates public, private and proven information without calling the wallet', async () => {
    const onSubmit = vi.fn();
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);
    await fillAndReview();

    expect(screen.getByRole('heading', { name: /public/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /private/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /proven/i })).toBeInTheDocument();
    // The hash limitation is stated plainly, not hidden.
    expect(screen.getAllByText(/does not make it secret/i).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits after review and shows the result with copyable ids', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      kind: 'success',
      assetIdHex: 'abcd1234',
      transactionId: 'tx-999'
    } satisfies RegisterAssetResult);
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);
    await fillAndReview();

    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('tx-999')).toBeInTheDocument();
    expect(screen.getByText('abcd1234')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /asset registered/i })).toBeInTheDocument();
    // Passport viewing is not implemented, so the control is present but disabled.
    expect(screen.getByRole('button', { name: /view passport/i })).toBeDisabled();
  });

  it('shows the processing state, reporting only progress the app can observe', async () => {
    let finish: (r: RegisterAssetResult) => void = () => undefined;
    const onSubmit = vi.fn(
      (_input: unknown, onProgress?: (p: 'preparing' | 'proving') => void) =>
        new Promise<RegisterAssetResult>((resolve) => {
          onProgress?.('proving');
          finish = resolve;
        })
    );
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    expect(await screen.findByRole('heading', { name: /registering your asset/i })).toBeInTheDocument();
    expect(screen.getByText(/keep this page open/i)).toBeInTheDocument();
    expect(screen.getByText(/do not report progress/i)).toBeInTheDocument();

    finish({ kind: 'success', assetIdHex: 'aa', transactionId: 'bb' });
    expect(await screen.findByRole('heading', { name: /asset registered/i })).toBeInTheDocument();
  });

  it('shows a categorised failure with retry, edit, and collapsed technical details', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      kind: 'failure',
      stage: 'submitting',
      message: 'Asset is already registered',
      requiresLiveWalletVerification: false
    } satisfies RegisterAssetResult);
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    expect(await screen.findByRole('heading', { name: /already registered/i })).toBeInTheDocument();
    // "Already registered" cannot succeed on retry, so only editing is offered.
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByText(/technical details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));
    expect(screen.getByLabelText(/asset identifier/i)).toHaveValue('1HGCM82633A123456');
  });

  it('offers a retry that returns to review after a retryable failure', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      kind: 'failure',
      stage: 'submitting',
      message: 'User rejected the request',
      requiresLiveWalletVerification: false
    } satisfies RegisterAssetResult);
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: /review your registration/i })).toBeInTheDocument();
  });

  it('never renders a field for private witness values', () => {
    render(<RegisterAssetForm disabled={false} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/secret/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/private key/i)).not.toBeInTheDocument();
  });
});
