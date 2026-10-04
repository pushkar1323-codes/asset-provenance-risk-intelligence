import { render, screen, within, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The provider factory and contract call pull in the full Midnight.js runtime.
// These tests exercise the application shell and presentation only.
vi.mock('./lib/contract/providers.browser.js', () => ({
  buildBrowserAssetPassportProviders: vi.fn()
}));
vi.mock('./lib/contract/registerAsset.js', () => ({ registerAsset: vi.fn() }));

import { App } from './App.js';

const go = (view: string) => window.history.replaceState(null, '', `#/${view}`);
const primaryNav = () => screen.getByRole('navigation', { name: 'Primary' });

describe('App shell', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_MIDNIGHT_NETWORK_ID', '');
    vi.stubEnv('VITE_ASSET_PASSPORT_CONTRACT_ADDRESS', '');
    vi.stubEnv('VITE_ZK_CONFIG_BASE_URL', '');
    window.localStorage.clear();
    go('overview');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as { midnight?: unknown }).midnight;
  });

  it('shows a neutral not-configured notice with every missing variable behind collapsed details', () => {
    render(<App />);

    expect(screen.getByText(/this app is not configured yet/i)).toBeInTheDocument();
    // No raw developer instruction is shown as a prominent alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/set it in your \.env file/i)).not.toBeInTheDocument();

    const details = screen.getByText('Technical details').closest('details');
    expect(details).not.toHaveAttribute('open');
    for (const name of [
      'VITE_MIDNIGHT_NETWORK_ID',
      'VITE_ASSET_PASSPORT_CONTRACT_ADDRESS',
      'VITE_ZK_CONFIG_BASE_URL'
    ]) {
      expect(within(details as HTMLElement).getByText(name)).toBeInTheDocument();
    }
  });

  it('renders the overview with status cards and no claim of a deployed contract', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/asset history you can verify/i);
    expect(screen.getByText('No address set')).toBeInTheDocument();
    expect(screen.queryByText(/deployed/i)).not.toBeInTheDocument();
  });

  it('lists every destination in navigation with no placeholder markers', () => {
    render(<App />);
    const nav = within(primaryNav());

    for (const name of [/register asset/i, /my assets/i, /asset passport/i, /provenance/i, /risk intelligence/i, /transfer ownership/i, /retire asset/i]) {
      expect(nav.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.queryByText('Soon')).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon|not available yet/i)).not.toBeInTheDocument();
  });

  it('shows an honest empty state for My Assets and never invents assets', () => {
    go('assets');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'My Assets' })).toBeInTheDocument();
    expect(screen.getByText(/you have not registered or saved any assets/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each(['passport', 'provenance', 'risk', 'transfer', 'retire'])(
    'shows an asset picker with an empty state for %s when there are no assets',
    (view) => {
      go(view);
      render(<App />);

      expect(screen.getByRole('heading', { name: 'No assets yet' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /register an asset/i })).toHaveAttribute('href', '#/register');
    }
  );

  it('reports an unknown asset id as not found', () => {
    go(`passport/${'ab'.repeat(32)}`);
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Asset not found' })).toBeInTheDocument();
  });

  it('keeps the form usable while unconfigured, but never enables on-chain registration', async () => {
    go('register');
    render(<App />);

    expect(screen.getByLabelText(/asset identifier/i)).toBeEnabled();
    expect(screen.getByText(/not configured for a network and contract yet/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: 'VIN-DRAFT-0001' } });
    fireEvent.click(screen.getByRole('button', { name: /^review$/i }));
    await screen.findByRole('heading', { name: /review your registration/i });

    expect(screen.getByRole('button', { name: /register asset/i })).toBeDisabled();
  });

  it('saves a draft without a wallet, lists it as a draft, and never reports it as registered', async () => {
    go('register');
    render(<App />);

    fireEvent.change(screen.getByLabelText(/asset identifier/i), { target: { value: 'VIN-DRAFT-0002' } });
    fireEvent.click(screen.getByRole('button', { name: /^review$/i }));
    await screen.findByRole('heading', { name: /review your registration/i });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    expect(await screen.findByRole('heading', { name: /draft saved on this device/i })).toBeInTheDocument();
    expect(screen.queryByText(/asset registered/i)).not.toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem('asset-passport.local-assets.v1') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ identifier: 'VIN-DRAFT-0002', status: 'draft' });
    expect(JSON.stringify(stored)).not.toMatch(/transactionId/);

    // The draft opens its passport, which says plainly that nothing is on-chain.
    fireEvent.click(screen.getByRole('link', { name: /open draft/i }));
    expect(await screen.findByRole('heading', { name: 'Asset Passport' })).toBeInTheDocument();
    expect(screen.getByText(/this asset is a draft/i)).toBeInTheDocument();
    expect(screen.getByText(/no ownership has been recorded/i)).toBeInTheDocument();
    expect(screen.getByText('None loaded')).toBeInTheDocument();
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
  });

  it('turns wallet connection off while unconfigured, even when a wallet is present', () => {
    (window as { midnight?: unknown }).midnight = {
      'org.example': { name: 'Example', icon: '', apiVersion: '4.0.1', rdns: 'org.example', connect: vi.fn() }
    };
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(screen.getByRole('button', { name: /connect example/i })).toBeDisabled();
    expect(screen.getByText(/turned off until the app is configured/i)).toBeInTheDocument();
  });

  it('states the privacy limits plainly on the privacy page', () => {
    go('privacy');
    render(<App />);

    expect(screen.getByRole('heading', { name: /privacy & security/i })).toBeInTheDocument();
    expect(screen.getAllByText(/does not make it secret/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fixed built-in password/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no backup or export yet/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not check real-world ownership/i).length).toBeGreaterThan(0);
  });

  it('shows the remaining destinations under More for small screens', () => {
    go('more');
    render(<App />);
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(main.getByRole('link', { name: /transfer ownership/i })).toBeInTheDocument();
  });

  it('shows configured status without raw developer errors when everything is set', () => {
    vi.stubEnv('VITE_MIDNIGHT_NETWORK_ID', 'preprod');
    vi.stubEnv('VITE_ASSET_PASSPORT_CONTRACT_ADDRESS', '0200aabbccddeeff00112233');
    vi.stubEnv('VITE_ZK_CONFIG_BASE_URL', 'http://localhost:8080/zk');
    render(<App />);

    expect(screen.queryByText(/this app is not configured yet/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Preprod').length).toBeGreaterThan(0);
    expect(screen.getByText('Address configured')).toBeInTheDocument();
  });
});
