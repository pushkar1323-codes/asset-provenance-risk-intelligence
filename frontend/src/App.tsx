import { useMemo } from 'react';
import { useWallet } from './lib/wallet/useWallet.js';
import { WalletProviderAdapter } from './lib/wallet/walletProviderAdapter.js';
import { readAppEnvironment, MissingEnvironmentError } from './lib/contract/env.js';
import { buildBrowserAssetPassportProviders } from './lib/contract/providers.browser.js';
import { registerAsset, type RegisterAssetResult } from './lib/contract/registerAsset.js';
import type { RegisterAssetInput } from './lib/contract/validation.js';
import { WalletPanel } from './components/WalletPanel.js';
import { PrivacyNotice } from './components/PrivacyNotice.js';
import { RegisterAssetForm } from './components/RegisterAssetForm.js';
import './App.css';

const readEnvironmentSafely = () => {
  try {
    return { environment: readAppEnvironment(), error: null as string | null };
  } catch (error) {
    return {
      environment: null,
      error: error instanceof MissingEnvironmentError ? error.message : 'Invalid configuration.'
    };
  }
};

export const App = () => {
  const { environment, error: environmentError } = useMemo(readEnvironmentSafely, []);
  const wallet = useWallet(environment?.networkId ?? '');

  const canRegister =
    wallet.state.status === 'connected' && !wallet.networkMismatch && environment !== null;

  const disabledReason = !environment
    ? 'Application is not configured (see .env.example).'
    : wallet.state.status !== 'connected'
      ? 'Connect a wallet to continue.'
      : wallet.networkMismatch
        ? 'Resolve the network mismatch above to continue.'
        : undefined;

  const handleSubmit = async (input: RegisterAssetInput): Promise<RegisterAssetResult> => {
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

    const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
      await wallet.connectedApi.getShieldedAddresses();

    const adapter = new WalletProviderAdapter(
      wallet.connectedApi,
      shieldedCoinPublicKey,
      shieldedEncryptionPublicKey
    );

    const providers = await buildBrowserAssetPassportProviders(
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

    return registerAsset(input, providers, {
      compiledAssetsPath: environment.zkConfigBaseUrl,
      contractAddress: environment.contractAddress,
      privateStateId: 'asset-passport'
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Asset Passport</h1>
        <p>Privacy-preserving vehicle asset registration and verification.</p>
      </header>

      {environmentError && (
        <p className="error" role="alert">
          {environmentError}
        </p>
      )}

      <main className="app-main">
        <WalletPanel wallet={wallet} expectedNetworkId={environment?.networkId ?? '(unconfigured)'} />
        <PrivacyNotice />
        <RegisterAssetForm
          disabled={!canRegister}
          disabledReason={disabledReason}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};
