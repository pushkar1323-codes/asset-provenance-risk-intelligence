import type { UseWalletResult } from '../lib/wallet/useWallet.js';
import { shortenMiddle } from '../lib/ui/format.js';
import { Icon } from './ui/Icon.js';
import { StatusBadge } from './ui/StatusBadge.js';

type WalletPanelProps = {
  readonly wallet: UseWalletResult;
  readonly expectedNetworkId: string;
  /** When set, connecting is disabled and this reason is shown instead. */
  readonly connectDisabledReason?: string;
  /** Renders without the surrounding card, for use inside a menu. */
  readonly bare?: boolean;
};

export const WalletPanel = ({ wallet, expectedNetworkId, connectDisabledReason, bare }: WalletPanelProps) => {
  const { state, availableWallets, networkMismatch, connect, disconnect } = wallet;

  return (
    <section className={bare ? 'wallet-panel' : 'card wallet-panel'} aria-label="Wallet connection">
      <div className="card-head">
        <h2 className="card-title">Wallet</h2>
        {state.status === 'connected' && (
          <StatusBadge tone={networkMismatch ? 'danger' : 'success'}>
            {networkMismatch ? 'Wrong network' : 'Connected'}
          </StatusBadge>
        )}
      </div>

      {state.status === 'disconnected' && (
        <div>
          {connectDisabledReason && <p className="muted">{connectDisabledReason}</p>}
          {availableWallets.length === 0 ? (
            <p className="muted">
              No compatible wallet extension was detected. Install a Midnight-compatible wallet and
              reload this page.
            </p>
          ) : (
            <ul className="wallet-list">
              {availableWallets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="btn btn-secondary wallet-option"
                    disabled={Boolean(connectDisabledReason)}
                    onClick={() => connect(w.id)}
                  >
                    {w.icon ? <img src={w.icon} alt="" width={24} height={24} /> : <Icon name="wallet" />}
                    Connect {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.status === 'connecting' && (
        <p className="loading-row" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Waiting for wallet authorization…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="stack">
          <p className="error-text">{state.error}</p>
          <div>
            <button type="button" className="btn btn-secondary" onClick={disconnect}>
              Try again
            </button>
          </div>
        </div>
      )}

      {state.status === 'connected' && (
        <div className="stack">
          <dl className="facts">
            <dt>Wallet</dt>
            <dd>{state.walletName}</dd>
            <dt>Address</dt>
            <dd className="mono" title={state.unshieldedAddress ?? undefined}>
              {state.unshieldedAddress ? shortenMiddle(state.unshieldedAddress) : '—'}
            </dd>
            <dt>Network</dt>
            <dd>{state.networkId}</dd>
          </dl>

          {networkMismatch ? (
            <p className="error-text" role="alert">
              {networkMismatch}
            </p>
          ) : (
            <p className="muted">Connected to the expected network ({expectedNetworkId}).</p>
          )}

          <div>
            <button type="button" className="btn btn-secondary" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
