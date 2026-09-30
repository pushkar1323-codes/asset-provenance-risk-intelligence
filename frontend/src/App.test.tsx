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

  it('marks unavailable destinations as Soon in navigation', () => {
    render(<App />);
    const nav = within(primaryNav());

    expect(nav.getByRole('link', { name: /register asset/i })).toBeInTheDocument();
    expect(within(nav.getByRole('link', { name: /my assets/i })).getByText('Soon')).toBeInTheDocument();
    expect(within(nav.getByRole('link', { name: /transfer ownership/i })).getByText('Soon')).toBeInTheDocument();
    expect(within(nav.getByRole('link', { name: /risk intelligence/i })).getByText('Soon')).toBeInTheDocument();
  });

  it.each([
    ['assets', /listing assets needs a way to read/i],
    ['risk', /nothing is scored today/i],
    ['transfer', /not wired into this application yet/i],
    ['retire', /not wired into this application yet/i],
    ['provenance', /does not record or read them yet/i]
  ])('shows %s as unavailable and never fabricates data', (view, reason) => {
    go(view);
    render(<App />);

    expect(screen.getByText('Not available yet')).toBeInTheDocument();
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/VIN/)).not.toBeInTheDocument();
  });

  it('keeps registration disabled and explains why while unconfigured', () => {
    go('register');
    render(<App />);

    expect(screen.getByLabelText(/asset identifier/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^review$/i })).toBeDisabled();
    expect(screen.getByText(/not configured for a network and contract yet/i)).toBeInTheDocument();
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
