import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LocalAsset } from '../lib/assets/assetStore.js';
import type { ContractAvailability } from '../lib/contract/availability.js';
import { AssetsView } from './AssetsView.js';
import { AssetRouteView } from './AssetRouteView.js';

const ID_1 = '11'.repeat(32);
const ID_2 = '22'.repeat(32);

const registered: LocalAsset = {
  assetIdHex: ID_1,
  identifier: 'VIN-REGISTERED',
  category: 2,
  status: 'registered',
  createdAt: Date.UTC(2026, 0, 2),
  events: [
    { kind: 'draft-saved', at: Date.UTC(2026, 0, 2) },
    { kind: 'registered', at: Date.UTC(2026, 0, 3), transactionId: 'tx-abc' }
  ]
};
const draft: LocalAsset = {
  assetIdHex: ID_2,
  identifier: 'VIN-DRAFT',
  category: 1,
  status: 'draft',
  createdAt: Date.UTC(2026, 0, 4),
  events: [{ kind: 'draft-saved', at: Date.UTC(2026, 0, 4) }]
};

const ready: ContractAvailability = { available: true };
const blocked: ContractAvailability = {
  available: false,
  reason: 'wallet-disconnected',
  message: 'Connect a wallet using the wallet button in the header to continue.'
};

const route = (
  view: string,
  id: string | null,
  availability: ContractAvailability = ready,
  assets: LocalAsset[] = [registered, draft]
) =>
  render(
    <AssetRouteView
      view={view as never}
      assetIdHex={id}
      assets={assets}
      availability={availability}
      onDiscardDraft={vi.fn()}
    />
  );

describe('AssetsView', () => {
  it('lists assets with status badges and filters by search and status', () => {
    render(<AssetsView assets={[registered, draft]} saveFailed={false} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('VIN-REGISTERED')).toBeInTheDocument();
    expect(within(table).getByText('Draft')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } });
    expect(within(screen.getByRole('table')).queryByText('VIN-REGISTERED')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'nothing-matches' } });
    expect(screen.getByRole('heading', { name: 'No matching assets' })).toBeInTheDocument();
  });

  it('warns when the browser could not save the list', () => {
    render(<AssetsView assets={[draft]} saveFailed />);
    expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
  });
});

describe('asset passport', () => {
  it('shows summary, ownership, and honest credential and risk states for a registered asset', () => {
    route('passport', ID_1);
    expect(screen.getByRole('heading', { name: 'Asset Passport' })).toBeInTheDocument();
    expect(screen.getByText('tx-abc')).toBeInTheDocument();
    expect(screen.getByText(/the ledger holds only a commitment/i)).toBeInTheDocument();
    expect(screen.getByText('None loaded')).toBeInTheDocument();
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
    expect(screen.queryByText(/this asset is a draft/i)).not.toBeInTheDocument();
  });

  it('explains that a draft is not on-chain and offers to register or delete it', () => {
    route('passport', ID_2, blocked);
    expect(screen.getByText(/this asset is a draft/i)).toBeInTheDocument();
    expect(screen.getByText(/connect a wallet using the wallet button/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register this asset/i })).toHaveAttribute('href', `#/register/${ID_2}`);
    expect(screen.getByRole('button', { name: /delete draft/i })).toBeInTheDocument();
  });
});

describe('provenance timeline', () => {
  it('shows newest first, labels draft events as not on Midnight, and shows transaction ids only when present', () => {
    route('provenance', ID_1);
    const items = within(screen.getByRole('list', { name: /asset events/i })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Registered on Midnight')).toBeInTheDocument();
    expect(within(items[0]!).getByText('tx-abc')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Draft saved')).toBeInTheDocument();
    expect(within(items[1]!).queryByText(/transaction id/i)).not.toBeInTheDocument();
  });
});

describe('risk view', () => {
  it('states that nothing has been scored and keeps contract state authoritative', () => {
    route('risk', ID_1);
    expect(screen.getByRole('heading', { name: 'No risk assessment' })).toBeInTheDocument();
    expect(screen.getByText(/never overrides what the contract records/i)).toBeInTheDocument();
  });
});

describe('transfer and retire', () => {
  it('validates the new owner commitment before showing a review', () => {
    route('transfer', ID_1);
    fireEvent.change(screen.getByLabelText(/new owner commitment/i), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    expect(screen.getByText(/exactly 64 hexadecimal/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm transfer/i })).not.toBeInTheDocument();
  });

  it('never enables the final transfer action while the operation is not connected', () => {
    route('transfer', ID_1, ready);
    fireEvent.change(screen.getByLabelText(/new owner commitment/i), { target: { value: 'cd'.repeat(32) } });
    fireEvent.click(screen.getByRole('button', { name: /review transfer/i }));

    expect(screen.getByRole('button', { name: /confirm transfer/i })).toBeDisabled();
    expect(screen.getByText(/cannot be submitted from the app yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/transfer(red)? (complete|succe)/i)).not.toBeInTheDocument();
  });

  it('blocks transfer for a draft and says why', () => {
    route('transfer', ID_2, ready);
    fireEvent.change(screen.getByLabelText(/new owner commitment/i), { target: { value: 'cd'.repeat(32) } });
    fireEvent.click(screen.getByRole('button', { name: /review transfer/i }));
    expect(screen.getByText(/register this asset on midnight first/i)).toBeInTheDocument();
  });

  it('requires confirmation for retire and keeps it disabled while the operation is not connected', () => {
    route('retire', ID_1, ready);
    const button = screen.getByRole('button', { name: /^retire asset$/i });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/i understand that retiring/i));
    expect(button).toBeDisabled();
    expect(screen.getByText(/cannot be submitted from the app yet/i)).toBeInTheDocument();
  });
});
