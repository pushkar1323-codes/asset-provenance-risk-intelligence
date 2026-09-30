import { DisclosureColumns } from '../components/ui/DisclosureColumns.js';
import { Callout } from '../components/ui/Callout.js';
import { IDENTIFIER_LIMITATION, KEY_HANDLING_NOTE, REGISTRATION_LIMITATION, VISIBILITY_TERMS } from '../lib/content/privacy.js';
import { VisibilityTag } from '../components/ui/VisibilityTag.js';

export const PrivacyView = () => (
  <div className="stack-lg">
    <header className="stack-sm">
      <h1 className="page-title">Privacy &amp; Security</h1>
      <p className="muted">
        Three terms are used everywhere in this app. The lists below describe what registering an asset does
        today.
      </p>
      <ul className="term-list">
        {(['public', 'private', 'proven'] as const).map((kind) => (
          <li key={kind}>
            <VisibilityTag kind={kind} />
            <span>{VISIBILITY_TERMS[kind].definition}</span>
          </li>
        ))}
      </ul>
    </header>

    <DisclosureColumns />

    <section className="stack-sm" aria-labelledby="limits-title">
      <h2 id="limits-title" className="section-title">
        Limits worth knowing
      </h2>
      <Callout tone="warning" icon="alert" title="The identifier hash is not confidential">
        {IDENTIFIER_LIMITATION}
      </Callout>
      <Callout tone="warning" icon="alert" title="Browser-local ownership key">
        {KEY_HANDLING_NOTE}
      </Callout>
      <Callout icon="info" title="Registration does not verify real-world ownership">
        {REGISTRATION_LIMITATION}
      </Callout>
    </section>
  </div>
);
