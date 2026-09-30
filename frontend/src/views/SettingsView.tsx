import type { EnvironmentCheck } from '../lib/contract/env.js';
import type { UseWalletResult } from '../lib/wallet/useWallet.js';
import { WalletPanel } from '../components/WalletPanel.js';
import { CopyField } from '../components/ui/CopyField.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { formatNetworkName } from '../lib/ui/format.js';

export const SettingsView = ({
  envCheck,
  wallet,
  connectDisabledReason
}: {
  envCheck: EnvironmentCheck;
  wallet: UseWalletResult;
  connectDisabledReason?: string;
}) => (
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
        <dt>Available now</dt>
        <dd>Asset registration</dd>
        <dt>Not available yet</dt>
        <dd>Asset list and passport view, provenance, risk, transfer, retire, credentials</dd>
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
    </section>
  </div>
);
