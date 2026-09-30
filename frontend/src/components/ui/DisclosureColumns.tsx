import { REGISTRATION_DISCLOSURE, VISIBILITY_TERMS, type VisibilityKind } from '../../lib/content/privacy.js';
import { VisibilityTag } from './VisibilityTag.js';

const ORDER: readonly VisibilityKind[] = ['public', 'private', 'proven'];

/** Public / Private / Proven side by side (stacked on small screens). */
export const DisclosureColumns = () => (
  <div className="disclosure">
    {ORDER.map((kind) => (
      <section key={kind} className={`disclosure-col vis-panel-${kind}`} aria-labelledby={`disc-${kind}`}>
        <h3 id={`disc-${kind}`}>
          <VisibilityTag kind={kind} />
        </h3>
        <p className="muted">{VISIBILITY_TERMS[kind].definition}</p>
        <ul>
          {REGISTRATION_DISCLOSURE[kind].map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);
