import { Callout } from './ui/Callout.js';

/**
 * Neutral notice shown when the build has no network/contract configuration.
 * Developer detail (variable names) is collapsed so it is not the first
 * thing an ordinary visitor reads.
 */
export const NotConfiguredNotice = ({ missing }: { missing: readonly string[] }) => (
  <div className="stack-sm">
    <Callout icon="info" title="This app is not configured yet">
      Wallet connection and registration are switched off until the app is configured with a network and
      contract.
    </Callout>
    <details className="tech-details">
      <summary>Technical details</summary>
      <p>The following build-time variables are missing or empty:</p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code className="mono">{name}</code>
          </li>
        ))}
      </ul>
      <p>Set them in the frontend environment file (see the example environment file), then rebuild.</p>
    </details>
  </div>
);
