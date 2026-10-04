import { useEffect, useMemo, useRef } from 'react';
import { useWallet } from './lib/wallet/useWallet.js';
import { WalletProviderAdapter } from './lib/wallet/walletProviderAdapter.js';
import { checkAppEnvironment } from './lib/contract/env.js';
import { buildBrowserAssetPassportProviders } from './lib/contract/providers.browser.js';
import { registerAsset, type RegisterAssetResult } from './lib/contract/registerAsset.js';
import type { RegisterAssetInput } from './lib/contract/validation.js';
import { getContractAvailability } from './lib/contract/availability.js';
import { deriveAssetId, bytesToHex } from './lib/contract/assetId.js';
import { useAssetStore } from './lib/assets/useAssetStore.js';
import { getNavItem } from './lib/nav/nav.js';
import { useHashRoute } from './lib/nav/useHashRoute.js';
import { AppShell } from './components/shell/AppShell.js';
import { NotConfiguredNotice } from './components/NotConfiguredNotice.js';
import { RegisterAssetForm, type RegisterProgress, type SaveDraftOutcome } from './components/RegisterAssetForm.js';
import { OverviewView } from './views/OverviewView.js';
import { PrivacyView } from './views/PrivacyView.js';
import { SettingsView } from './views/SettingsView.js';
import { MoreView } from './views/MoreView.js';
import { AssetsView } from './views/AssetsView.js';
import { AssetRouteView } from './views/AssetRouteView.js';
import './App.css';

export const App = () => {
  const envCheck = useMemo(() => checkAppEnvironment(), []);
  const environment = envCheck.environment;
  const wallet = useWallet(environment?.networkId ?? '');
  const { view, param } = useHashRoute();
  const store = useAssetStore();

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

  const availability = getContractAvailability(envCheck, wallet);
  const canRegister = availability.available && environment !== null;

  const connectDisabledReason = envCheck.configured
    ? undefined
    : 'Connecting a wallet is turned off until the app is configured.';

  const handleSubmit = async (
    input: RegisterAssetInput,
    onProgress?: (progress: RegisterProgress) => void
  ): Promise<RegisterAssetResult> => {
    if (!environment || !wallet.connectedApi || wallet.state.status !== 'connected') {
      return recordOutcome(input, {
        kind: 'failure',
        stage: 'preparing',
        message: 'Wallet is not connected.',
        requiresLiveWalletVerification: false
      });
    }

    const serviceConfiguration = wallet.state.serviceConfiguration;
    if (!serviceConfiguration) {
      return recordOutcome(input, {
        kind: 'failure',
        stage: 'preparing',
        message: 'Wallet did not report a service configuration.',
        requiresLiveWalletVerification: false
      });
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
      return recordOutcome(input, {
        kind: 'failure',
        stage: 'preparing',
        message: error instanceof Error ? error.message : String(error),
        requiresLiveWalletVerification: false
      });
    }

    onProgress?.('proving');
    const result = await registerAsset(input, providers, {
      compiledAssetsPath: environment.zkConfigBaseUrl,
      contractAddress: environment.contractAddress,
      privateStateId: 'asset-passport'
    });
    return recordOutcome(input, result);
  };

  // A local record is created only from a result that carries a transaction
  // id returned by the contract call. Failures are logged for developers and
  // never recorded as registrations.
  const recordOutcome = (input: RegisterAssetInput, result: RegisterAssetResult): RegisterAssetResult => {
    if (result.kind === 'success') {
      store.markRegistered({
        assetIdHex: result.assetIdHex,
        identifier: input.assetIdentifier,
        category: input.assetCategory,
        transactionId: result.transactionId
      });
    } else {
      console.error('Asset registration failed', { stage: result.stage, message: result.message });
    }
    return result;
  };

  const handleSaveDraft = async (input: RegisterAssetInput): Promise<SaveDraftOutcome> => {
    try {
      const assetIdHex = bytesToHex(await deriveAssetId(input.assetIdentifier));
      const result = store.saveDraft({
        assetIdHex,
        identifier: input.assetIdentifier,
        category: input.assetCategory
      });
      return result.kind === 'exists'
        ? { kind: 'exists', assetIdHex, status: result.asset.status }
        : { kind: 'saved', assetIdHex, persisted: result.persisted };
    } catch (error) {
      console.error('Saving a draft failed', error);
      return { kind: 'failure' };
    }
  };

  const notConfigured = !envCheck.configured ? <NotConfiguredNotice missing={envCheck.missing} /> : null;
  const draftToRegister = view === 'register' && param ? store.find(param) : undefined;
  const registrationStart = draftToRegister?.status === 'draft' ? draftToRegister : undefined;

  let content;
  switch (view) {
    case 'overview':
      content = (
        <>
          {notConfigured}
          <OverviewView envCheck={envCheck} wallet={wallet} assets={store.assets} />
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
          <RegisterAssetForm
            key={registrationStart?.assetIdHex ?? 'new'}
            canSubmit={canRegister}
            unavailableReason={availability.available ? undefined : availability.message}
            initial={
              registrationStart
                ? { identifier: registrationStart.identifier, category: registrationStart.category }
                : undefined
            }
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      );
      break;
    case 'assets':
      content = <AssetsView assets={store.assets} saveFailed={store.saveFailed} />;
      break;
    case 'passport':
    case 'provenance':
    case 'risk':
    case 'transfer':
    case 'retire':
      content = (
        <AssetRouteView
          view={view}
          assetIdHex={param}
          assets={store.assets}
          availability={availability}
          onDiscardDraft={store.discardDraft}
        />
      );
      break;
    case 'privacy':
      content = <PrivacyView />;
      break;
    case 'settings':
      content = (
        <>
          {notConfigured}
          <SettingsView
            envCheck={envCheck}
            wallet={wallet}
            connectDisabledReason={connectDisabledReason}
            assets={store.assets}
            onClearAssets={store.clearAll}
          />
        </>
      );
      break;
    default:
      content = <MoreView />;
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
