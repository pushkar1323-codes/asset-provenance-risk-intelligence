import { useEffect, useMemo, useRef } from 'react';
import { useWallet } from './lib/wallet/useWallet.js';
import { WalletProviderAdapter } from './lib/wallet/walletProviderAdapter.js';
import { checkAppEnvironment } from './lib/contract/env.js';
import { buildBrowserAssetPassportProviders } from './lib/contract/providers.browser.js';
import { registerAsset, type RegisterAssetResult } from './lib/contract/registerAsset.js';
import type { RegisterAssetInput } from './lib/contract/validation.js';
import { getNavItem } from './lib/nav/nav.js';
import { useHashRoute } from './lib/nav/useHashRoute.js';
import { AppShell } from './components/shell/AppShell.js';
import { NotConfiguredNotice } from './components/NotConfiguredNotice.js';
import { RegisterAssetForm, type RegisterProgress } from './components/RegisterAssetForm.js';
import { OverviewView } from './views/OverviewView.js';
import { PrivacyView } from './views/PrivacyView.js';
import { SettingsView } from './views/SettingsView.js';
import { MoreView } from './views/MoreView.js';
import { UnavailableView } from './views/UnavailableView.js';
import './App.css';

export const App = () => {
  const envCheck = useMemo(() => checkAppEnvironment(), []);
  const environment = envCheck.environment;
  const wallet = useWallet(environment?.networkId ?? '');
  const { view } = useHashRoute();

  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const label = getNavItem(view)?.label ?? 'More';
    document.title = `${label} · Asset Passport`;
    // Move focus to the new view after in-app navigation (not on first load).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [view]);

  const canRegister =
    wallet.state.status === 'connected' && !wallet.networkMismatch && environment !== null;

  const connectDisabledReason = envCheck.configured
    ? undefined
    : 'Connecting a wallet is turned off until the app is configured.';

  const disabledReason = !environment
    ? 'The app is not configured for a network and contract yet.'
    : wallet.state.status !== 'connected'
      ? 'Connect a wallet using the wallet button in the header to continue.'
      : wallet.networkMismatch
        ? 'Switch the wallet to the expected network to continue.'
        : undefined;

  const handleSubmit = async (
    input: RegisterAssetInput,
    onProgress?: (progress: RegisterProgress) => void
  ): Promise<RegisterAssetResult> => {
    if (!environment || !wallet.connectedApi || wallet.state.status !== 'connected') {
      return {
        kind: 'failure',
        stage: 'preparing',
        message: 'Wallet is not connected.',
        requiresLiveWalletVerification: false
      };
    }

    const serviceConfiguration = wallet.state.serviceConfiguration;
    if (!serviceConfiguration) {
      return {
        kind: 'failure',
        stage: 'preparing',
        message: 'Wallet did not report a service configuration.',
        requiresLiveWalletVerification: false
      };
    }

    let providers: Awaited<ReturnType<typeof buildBrowserAssetPassportProviders>>;
    try {
      const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
        await wallet.connectedApi.getShieldedAddresses();

      const adapter = new WalletProviderAdapter(
        wallet.connectedApi,
        shieldedCoinPublicKey,
        shieldedEncryptionPublicKey
      );

      providers = await buildBrowserAssetPassportProviders(
        {
          zkConfigBaseUrl: environment.zkConfigBaseUrl,
          indexerUrl: serviceConfiguration.indexerUri,
          indexerWsUri: serviceConfiguration.indexerWsUri,
          proofServerUrl: serviceConfiguration.proverServerUri ?? '',
          privateStateAccountId: wallet.state.unshieldedAddress ?? 'unknown-account',
          // A demo-only in-memory password. Real deployments must source this
          // from a proper secret store, not a constant.
          privateStoragePasswordProvider: () => 'asset-passport-local-state'
        },
        {
          walletProvider: adapter,
          midnightProvider: adapter,
          getProvingProvider: wallet.connectedApi.getProvingProvider?.bind(wallet.connectedApi)
        }
      );
    } catch (error) {
      return {
        kind: 'failure',
        stage: 'preparing',
        message: error instanceof Error ? error.message : String(error),
        requiresLiveWalletVerification: false
      };
    }

    onProgress?.('proving');
    return registerAsset(input, providers, {
      compiledAssetsPath: environment.zkConfigBaseUrl,
      contractAddress: environment.contractAddress,
      privateStateId: 'asset-passport'
    });
  };

  const item = getNavItem(view);
  const notConfigured = !envCheck.configured ? <NotConfiguredNotice missing={envCheck.missing} /> : null;

  let content;
  switch (view) {
    case 'overview':
      content = (
        <>
          {notConfigured}
          <OverviewView envCheck={envCheck} wallet={wallet} />
        </>
      );
      break;
    case 'register':
      content = (
        <div className="stack-lg">
          <header className="stack-sm">
            <h1 className="page-title">Register an asset</h1>
            <p className="muted">Create a public record for an asset and keep its ownership key on this device.</p>
          </header>
          {notConfigured}
          <RegisterAssetForm disabled={!canRegister} disabledReason={disabledReason} onSubmit={handleSubmit} />
        </div>
      );
      break;
    case 'privacy':
      content = <PrivacyView />;
      break;
    case 'settings':
      content = (
        <>
          {notConfigured}
          <SettingsView envCheck={envCheck} wallet={wallet} connectDisabledReason={connectDisabledReason} />
        </>
      );
      break;
    case 'more':
      content = <MoreView />;
      break;
    default:
      content = item ? <UnavailableView item={item} /> : <OverviewView envCheck={envCheck} wallet={wallet} />;
  }

  return (
    <AppShell
      view={view}
      wallet={wallet}
      expectedNetworkId={environment?.networkId ?? null}
      connectDisabledReason={connectDisabledReason}
    >
      <main id="main" className="content" tabIndex={-1} ref={mainRef}>
        <div className="content-inner stack-lg">{content}</div>
      </main>
    </AppShell>
  );
};
