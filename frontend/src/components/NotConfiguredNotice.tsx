import { Callout } from './ui/Callout.js';

/**
 * Neutral notice shown when the build has no network/contract configuration.
 * Developer detail (variable names) is collapsed so it is not the first
 * thing an ordinary visitor reads.
 */
export const NotConfiguredNotice = ({ missing }: { missing: readonly string[] }) => (
  <div className="stack-sm">
    <Callout icon="info" title="This app is not configured yet">
      Wallet connection and on-chain registration are switched off until the app is configured with a
      network and contract. You can still save drafts and browse your assets on this device.
    </Callout>
    <details className="tech-details">
      <summary>Technical details</summary>
      <p>This build is missing the following settings:</p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code className="mono">{name}</code>
          </li>
        ))}
      </ul>
      <p>If you run this app yourself, provide these settings in its environment configuration and rebuild.</p>
    </details>
  </div>
);
