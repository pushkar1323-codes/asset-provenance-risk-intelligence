import { useEffect, useRef, useState } from 'react';
import type { UseWalletResult } from '../../lib/wallet/useWallet.js';
import { shortenMiddle } from '../../lib/ui/format.js';
import { WalletPanel } from '../WalletPanel.js';
import { Icon } from '../ui/Icon.js';

/** Header wallet control: shows connection status and opens the wallet panel. */
export const WalletMenu = ({
  wallet,
  expectedNetworkId,
  connectDisabledReason
}: {
  wallet: UseWalletResult;
  expectedNetworkId: string;
  connectDisabledReason?: string;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { state } = wallet;
  const connected = state.status === 'connected';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="wallet-menu" ref={rootRef}>
      <button
        type="button"
        className={`wallet-chip${connected ? ' is-connected' : ''}`}
        aria-expanded={open}
        aria-controls="wallet-menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="wallet" size={18} />
        <span className="wallet-chip-text">
          {connected
            ? state.unshieldedAddress
              ? shortenMiddle(state.unshieldedAddress, 8, 4)
              : (state.walletName ?? 'Connected')
            : state.status === 'connecting'
              ? 'Connecting…'
              : 'Connect wallet'}
        </span>
      </button>
      {open && (
        <div id="wallet-menu-panel" className="wallet-popover">
          <WalletPanel
            wallet={wallet}
            expectedNetworkId={expectedNetworkId}
            connectDisabledReason={connectDisabledReason}
            bare
          />
        </div>
      )}
    </div>
  );
};
