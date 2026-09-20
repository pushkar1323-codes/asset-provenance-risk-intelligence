import type { UseWalletResult } from '../lib/wallet/useWallet.js';

type WalletPanelProps = {
  readonly wallet: UseWalletResult;
  readonly expectedNetworkId: string;
};

const shortenAddress = (address: string): string =>
  address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;

export const WalletPanel = ({ wallet, expectedNetworkId }: WalletPanelProps) => {
  const { state, availableWallets, networkMismatch, connect, disconnect } = wallet;

  return (
    <section className="panel" aria-label="Wallet connection">
      <h2>Wallet</h2>

      {state.status === 'disconnected' && (
        <div>
          {availableWallets.length === 0 ? (
            <p className="hint">
              No compatible wallet extension was detected. Install a Midnight-compatible wallet
              and reload this page.
            </p>
          ) : (
            <ul className="wallet-list">
              {availableWallets.map((w) => (
                <li key={w.id}>
                  <button type="button" onClick={() => connect(w.id)}>
                    Connect {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.status === 'connecting' && (
        <p role="status" aria-live="polite">
          Waiting for wallet authorization…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert">
          <p className="error">{state.error}</p>
          <button type="button" onClick={disconnect}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'connected' && (
        <div>
          <dl className="wallet-info">
            <dt>Wallet</dt>
            <dd>{state.walletName}</dd>
            <dt>Address</dt>
            <dd title={state.unshieldedAddress ?? undefined}>
              {state.unshieldedAddress ? shortenAddress(state.unshieldedAddress) : '—'}
            </dd>
            <dt>Network</dt>
            <dd>{state.networkId}</dd>
          </dl>

          {networkMismatch && (
            <p className="error" role="alert">
              {networkMismatch}
            </p>
          )}
          {!networkMismatch && (
            <p className="hint">Connected to the expected network ({expectedNetworkId}).</p>
          )}

          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}
    </section>
  );
};
