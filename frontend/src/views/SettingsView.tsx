import { useState } from 'react';
import type { EnvironmentCheck } from '../lib/contract/env.js';
import type { LocalAsset } from '../lib/assets/assetStore.js';
import type { UseWalletResult } from '../lib/wallet/useWallet.js';
import { WalletPanel } from '../components/WalletPanel.js';
import { CopyField } from '../components/ui/CopyField.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { formatNetworkName } from '../lib/ui/format.js';

export const SettingsView = ({
  envCheck,
  wallet,
  connectDisabledReason,
  assets,
  onClearAssets
}: {
  envCheck: EnvironmentCheck;
  wallet: UseWalletResult;
  connectDisabledReason?: string;
  assets: readonly LocalAsset[];
  onClearAssets: () => void;
}) => {
  const [confirmingClear, setConfirmingClear] = useState(false);
  return (
  <div className="stack-lg">
    <h1 className="page-title">Settings</h1>

    <section className="card stack-sm" aria-labelledby="set-network">
      <div className="card-head">
        <h2 id="set-network" className="card-title">
          Network
        </h2>
        <StatusBadge tone={envCheck.configured ? 'info' : 'neutral'}>
          {envCheck.configured ? 'Configured' : 'Not configured'}
        </StatusBadge>
      </div>
      <dl className="facts">
        <dt>Application network</dt>
        <dd>{envCheck.configured ? formatNetworkName(envCheck.environment.networkId) : 'Not configured'}</dd>
        <dt>Wallet network</dt>
        <dd>{wallet.state.status === 'connected' ? (wallet.state.networkId ?? 'Unknown') : 'No wallet connected'}</dd>
      </dl>
    </section>

    <WalletPanel
      wallet={wallet}
      expectedNetworkId={envCheck.configured ? envCheck.environment.networkId : '(unconfigured)'}
      connectDisabledReason={connectDisabledReason}
    />

    <section className="card stack-sm" aria-labelledby="set-contract">
      <h2 id="set-contract" className="card-title">
        Contract
      </h2>
      {envCheck.configured ? (
        <>
          <CopyField label="Contract address" value={envCheck.environment.contractAddress} />
          <p className="field-help">
            This is the address the app is configured to use. The app does not check that a contract exists
            there until you submit a registration.
          </p>
        </>
      ) : (
        <p className="muted">No contract address is configured.</p>
      )}
    </section>

    <section className="card stack-sm" aria-labelledby="set-app">
      <h2 id="set-app" className="card-title">
        Application
      </h2>
      <dl className="facts">
        <dt>Name</dt>
        <dd>Asset Passport</dd>
        <dt>Submits to the contract</dt>
        <dd>Asset registration</dd>
        <dt>Not submitted from this app yet</dt>
        <dd>Transfer, retire, credentials, provenance events and risk assessments</dd>
      </dl>
    </section>

    <section className="card stack-sm" aria-labelledby="set-local">
      <h2 id="set-local" className="card-title">
        Local data
      </h2>
      <p className="muted">
        The ownership key for each asset you register is kept in this browser&apos;s local app storage. This
        page does not display it, back it up, or delete it. See Privacy &amp; Security for the limits of that
        storage.
      </p>
      <p className="muted">
        The list of assets on the My Assets page ({assets.length} saved) is stored separately in this browser.
        Clearing it removes drafts and the local history, not anything recorded on Midnight and not the
        ownership keys.
      </p>
      {confirmingClear ? (
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClearAssets();
              setConfirmingClear(false);
            }}
          >
            Yes, clear the list
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmingClear(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={assets.length === 0}
            onClick={() => setConfirmingClear(true)}
          >
            Clear asset list
          </button>
        </div>
      )}
    </section>
  </div>
  );
};
