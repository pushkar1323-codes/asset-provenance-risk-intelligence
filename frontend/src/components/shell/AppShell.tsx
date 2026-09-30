import type { ReactNode } from 'react';
import { BOTTOM_NAV_IDS, NAV_ITEMS, getNavItem, toHash, type IconName, type ViewId } from '../../lib/nav/nav.js';
import type { UseWalletResult } from '../../lib/wallet/useWallet.js';
import { Icon } from '../ui/Icon.js';
import { NetworkBadge } from './NetworkBadge.js';
import { WalletMenu } from './WalletMenu.js';

type AppShellProps = {
  readonly view: ViewId;
  readonly wallet: UseWalletResult;
  readonly expectedNetworkId: string | null;
  readonly connectDisabledReason?: string;
  readonly children: ReactNode;
};

const BOTTOM_ITEMS: readonly { id: ViewId; label: string; icon: IconName }[] = BOTTOM_NAV_IDS.map((id) => {
  const item = getNavItem(id);
  return { id, label: item?.label ?? 'More', icon: item?.icon ?? 'more' };
});

const SHORT_LABELS: Partial<Record<ViewId, string>> = {
  register: 'Register',
  assets: 'Assets',
  overview: 'Home',
  privacy: 'Privacy'
};

export const AppShell = ({ view, wallet, expectedNetworkId, connectDisabledReason, children }: AppShellProps) => {
  const title = getNavItem(view)?.label ?? 'More';
  const activeBottom: ViewId = BOTTOM_NAV_IDS.includes(view) ? view : 'more';

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="sidebar">
        <a className="brand" href={toHash('overview')}>
          <span className="brand-mark">
            <Icon name="shieldCheck" size={26} />
          </span>
          <span className="brand-text">
            <strong>Asset Passport</strong>
            <small>Provenance &amp; Risk Intelligence</small>
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="side-nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={toHash(item.id)}
                  className={`side-link${view === item.id ? ' is-active' : ''}`}
                  aria-current={view === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {!item.available && <span className="soon">Soon</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <a className="topbar-brand" href={toHash('overview')} aria-label="Asset Passport home">
            <Icon name="shieldCheck" size={22} />
          </a>
          <p className="topbar-title">{title}</p>
          <div className="topbar-actions">
            <NetworkBadge
              expectedNetworkId={expectedNetworkId}
              walletConnected={wallet.state.status === 'connected'}
              networkMismatch={Boolean(wallet.networkMismatch)}
            />
            <WalletMenu
              wallet={wallet}
              expectedNetworkId={expectedNetworkId ?? ''}
              connectDisabledReason={connectDisabledReason}
            />
          </div>
        </header>

        {children}
      </div>

      <nav className="bottom-nav" aria-label="Primary mobile">
        <ul>
          {BOTTOM_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={toHash(item.id)}
                className={`bottom-link${activeBottom === item.id ? ' is-active' : ''}`}
                aria-current={activeBottom === item.id ? 'page' : undefined}
              >
                <Icon name={item.icon} size={22} />
                <span>{SHORT_LABELS[item.id] ?? item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
