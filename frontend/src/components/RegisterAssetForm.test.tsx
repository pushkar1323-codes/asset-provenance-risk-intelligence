import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterAssetForm } from './RegisterAssetForm.js';
import type { RegisterAssetResult } from '../lib/contract/registerAsset.js';

const onSaveDraft = vi.fn();

const fillAndReview = async (identifier = '1HGCM82633A123456') => {
  fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: identifier } });
  fireEvent.click(screen.getByRole('button', { name: /^review$/i }));
  await screen.findByRole('heading', { name: /review your registration/i });
};

describe('RegisterAssetForm', () => {
  it('keeps the details editable and offers a draft when registering is unavailable', async () => {
    const onSubmit = vi.fn();
    onSaveDraft.mockResolvedValue({ kind: 'saved', assetIdHex: 'ab'.repeat(32), persisted: true });
    render(
      <RegisterAssetForm
        canSubmit={false}
        unavailableReason="Connect a wallet to continue."
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
      />
    );

    expect(screen.getByText(/connect a wallet to continue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/asset identifier/i)).toBeEnabled();
    await fillAndReview();

    expect(screen.getByRole('button', { name: /register asset/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    expect(await screen.findByRole('heading', { name: /draft saved on this device/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing has been registered on midnight/i)).toBeInTheDocument();
    expect(screen.queryByText(/asset registered/i)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSaveDraft).toHaveBeenCalledWith({ assetIdentifier: '1HGCM82633A123456', assetCategory: 1 });
  });

  it('says so when a draft already exists instead of adding a duplicate', async () => {
    onSaveDraft.mockResolvedValue({ kind: 'exists', assetIdHex: 'cd'.repeat(32), status: 'draft' });
    render(<RegisterAssetForm canSubmit onSubmit={vi.fn()} onSaveDraft={onSaveDraft} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    expect(await screen.findByRole('heading', { name: /already in your list/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open existing asset/i })).toBeInTheDocument();
  });

  it('warns when the browser would not store the draft', async () => {
    onSaveDraft.mockResolvedValue({ kind: 'saved', assetIdHex: 'ab'.repeat(32), persisted: false });
    render(<RegisterAssetForm canSubmit onSubmit={vi.fn()} onSaveDraft={onSaveDraft} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    expect(await screen.findByText(/did not allow the draft to be stored/i)).toBeInTheDocument();
  });

  it('starts from provided values, for registering a saved draft', () => {
    render(
      <RegisterAssetForm
        canSubmit
        initial={{ identifier: 'SAVED-DRAFT-1', category: 2 }}
        onSubmit={vi.fn()}
        onSaveDraft={onSaveDraft}
      />
    );
    expect(screen.getByLabelText(/asset identifier/i)).toHaveValue('SAVED-DRAFT-1');
    expect(screen.getByLabelText(/category/i)).toHaveValue('2');
  });

  it('blocks the review step and shows an error when the identifier is too short', async () => {
    const onSubmit = vi.fn();
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);

    fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: /^review$/i }));

    expect(await screen.findByText(/at least/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /review your registration/i })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('review step separates public, private and proven information without calling the wallet', async () => {
    const onSubmit = vi.fn();
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
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
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
    await fillAndReview();

    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('tx-999')).toBeInTheDocument();
    expect(screen.getByText('abcd1234')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /asset registered/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view passport/i })).toHaveAttribute('href', '#/passport/abcd1234');
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
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    expect(await screen.findByRole('heading', { name: /registering your asset/i })).toBeInTheDocument();
    expect(screen.getByText(/keep this page open/i)).toBeInTheDocument();
    expect(screen.getByText(/progress inside the second step is not reported/i)).toBeInTheDocument();

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
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
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
    render(<RegisterAssetForm canSubmit onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
    await fillAndReview();
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: /review your registration/i })).toBeInTheDocument();
  });

  it('never renders a field for private witness values', () => {
    render(<RegisterAssetForm canSubmit onSubmit={vi.fn()} onSaveDraft={onSaveDraft} />);
    expect(screen.queryByLabelText(/secret/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/private key/i)).not.toBeInTheDocument();
  });
});
