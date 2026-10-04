import { Callout } from './ui/Callout.js';

/** Explains why a lifecycle action cannot be submitted right now. */
export const LifecycleBlockers = ({ blockers }: { blockers: readonly string[] }) =>
  blockers.length === 0 ? null : (
    <Callout icon="info" title="Not ready to submit">
      <span className="stack-sm">
        {blockers.map((message) => (
          <span key={message} className="block">
            {message}
          </span>
        ))}
      </span>
    </Callout>
  );
