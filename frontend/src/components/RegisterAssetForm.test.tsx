import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterAssetForm } from './RegisterAssetForm.js';

describe('RegisterAssetForm', () => {
  it('disables the form and shows the reason when disabled', () => {
    render(
      <RegisterAssetForm disabled disabledReason="Connect a wallet to continue." onSubmit={vi.fn()} />
    );

    expect(screen.getByText('Connect a wallet to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register asset/i })).toBeDisabled();
  });

  it('blocks submission and shows an error when the identifier is too short', async () => {
    const onSubmit = vi.fn();
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    expect(await screen.findByText(/at least/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid input and displays the resulting transaction id', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      kind: 'success',
      assetIdHex: 'abcd1234',
      transactionId: 'tx-999'
    });
    render(<RegisterAssetForm disabled={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/asset identifier/i), {
      target: { value: '1HGCM82633A123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: /register asset/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('tx-999')).toBeInTheDocument();
  });

  it('never renders a field for private witness values', () => {
    render(<RegisterAssetForm disabled={false} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/secret/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/private key/i)).not.toBeInTheDocument();
  });
});
