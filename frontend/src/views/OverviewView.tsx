import type { EnvironmentCheck } from '../lib/contract/env.js';
import type { UseWalletResult } from '../lib/wallet/useWallet.js';
import { formatNetworkName, shortenMiddle } from '../lib/ui/format.js';
import { toHash, type IconName } from '../lib/nav/nav.js';
import { Icon } from '../components/ui/Icon.js';
import { StatusBadge, type BadgeTone } from '../components/ui/StatusBadge.js';

type Pillar = { icon: IconName; title: string; text: string; badge: string; tone: BadgeTone };

const PILLARS: readonly Pillar[] = [
  {
    icon: 'clock',
    title: 'Provenance',
    text: "Record and follow an asset's lifecycle history.",
    badge: 'Coming soon',
    tone: 'neutral'
  },
  {
    icon: 'shieldCheck',
    title: 'Privacy-preserving verification',
    text: 'Registration already proves ownership-key knowledge without revealing the key. Credential checks come later.',
    badge: 'Partly available',
    tone: 'info'
  },
  {
    icon: 'chart',
    title: 'Risk Intelligence',
    text: 'Off-chain analysis referenced on-chain by a commitment and a coarse tier. Analysis never overrides contract state.',
    badge: 'Coming soon',
    tone: 'neutral'
  },
  {
    icon: 'globe',
    title: 'Global trust',
    text: 'Public records live on the Midnight ledger so they can be checked independently. Private details stay with the owner.',
    badge: 'Principle',
    tone: 'neutral'
  }
];

const HOW_IT_WORKS: readonly { title: string; text: string; soon?: boolean }[] = [
  { title: 'Register', text: 'Enter an identifier and category.' },
  { title: 'Prove', text: 'A zero-knowledge proof is created for the registration.' },
  { title: 'Record on Midnight', text: 'The public record and commitments are written to the ledger.' },
  { title: 'Manage lifecycle', text: 'Transfer, retire, credentials and provenance.', soon: true }
];

export const OverviewView = ({
  envCheck,
  wallet
}: {
  envCheck: EnvironmentCheck;
  wallet: UseWalletResult;
}) => {
  const connected = wallet.state.status === 'connected';
  return (
    <div className="stack-lg">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Provenance &amp; Risk Intelligence</p>
          <h1 id="hero-title">Asset history you can verify. Details you keep private.</h1>
          <p className="hero-sub">
            Asset Passport registers vehicle assets on Midnight. Public records can be checked by anyone;
            ownership keys and other private details stay with the owner.
          </p>
          <div className="actions">
            <a className="btn btn-primary" href={toHash('register')}>
              Register an asset
            </a>
            <a className="btn btn-on-dark" href={toHash('privacy')}>
              How your data is protected
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="passport-card">
            <div className="passport-top">
              <Icon name="shieldCheck" size={28} />
              <span>ASSET PASSPORT</span>
            </div>
            <div className="passport-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="passport-tags">
              <span className="vis-tag vis-public">
                <Icon name="eye" size={12} />
                Public
              </span>
              <span className="vis-tag vis-private">
                <Icon name="lock" size={12} />
                Private
              </span>
              <span className="vis-tag vis-proven">
                <Icon name="shieldCheck" size={12} />
                Proven
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="status-strip" aria-label="Status">
        <div className="card status-card">
          <span className="status-label">Network</span>
          <strong>{envCheck.configured ? formatNetworkName(envCheck.environment.networkId) : 'Not configured'}</strong>
          <StatusBadge tone={envCheck.configured ? 'info' : 'neutral'}>
            {envCheck.configured ? 'Configured' : 'Not configured'}
          </StatusBadge>
        </div>
        <div className="card status-card">
          <span className="status-label">Wallet</span>
          <strong>{connected ? (wallet.state.walletName ?? 'Connected') : 'Not connected'}</strong>
          <StatusBadge tone={connected ? (wallet.networkMismatch ? 'danger' : 'success') : 'neutral'}>
            {connected ? (wallet.networkMismatch ? 'Wrong network' : 'Connected') : 'Disconnected'}
          </StatusBadge>
        </div>
        <div className="card status-card">
          <span className="status-label">Contract</span>
          <strong className="mono">
            {envCheck.configured ? shortenMiddle(envCheck.environment.contractAddress, 10, 6) : 'No address set'}
          </strong>
          <StatusBadge tone={envCheck.configured ? 'info' : 'neutral'}>
            {envCheck.configured ? 'Address configured' : 'Not configured'}
          </StatusBadge>
        </div>
      </section>

      <section className="stack" aria-labelledby="pillars-title">
        <h2 id="pillars-title" className="section-title">
          What Asset Passport is for
        </h2>
        <div className="pillars">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="card pillar">
              <span className="pillar-icon">
                <Icon name={pillar.icon} size={22} />
              </span>
              <h3>{pillar.title}</h3>
              <p className="muted">{pillar.text}</p>
              <StatusBadge tone={pillar.tone}>{pillar.badge}</StatusBadge>
            </article>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          How it works
        </h2>
        <ol className="how">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="card how-step">
              <span className="how-num" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p className="muted">{step.text}</p>
                {step.soon && <StatusBadge tone="neutral">Coming soon</StatusBadge>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
