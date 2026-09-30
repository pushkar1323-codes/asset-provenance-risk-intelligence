import { toHash, type NavItem } from '../lib/nav/nav.js';
import { Icon } from '../components/ui/Icon.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';

/** Explains a destination whose functionality is not implemented. It never shows data. */
export const UnavailableView = ({ item }: { item: NavItem }) => (
  <div className="stack-lg">
    <header className="stack-sm">
      <h1 className="page-title">{item.label}</h1>
      <StatusBadge tone="neutral">Not available yet</StatusBadge>
    </header>

    <section className="card unavailable stack">
      <span className="pillar-icon">
        <Icon name={item.icon} size={24} />
      </span>
      <div className="stack-sm">
        <h2 className="card-title">Why this is unavailable</h2>
        <p>{item.unavailableReason}</p>
      </div>
      {item.plannedPurpose && (
        <div className="stack-sm">
          <h2 className="card-title">What it will do</h2>
          <p className="muted">{item.plannedPurpose}</p>
        </div>
      )}
      {item.plannedSteps && (
        <div className="stack-sm">
          <h2 className="card-title">Planned steps</h2>
          <ol className="planned-steps">
            {item.plannedSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="actions">
        <a className="btn btn-primary" href={toHash('register')}>
          Register an asset
        </a>
        <a className="btn btn-secondary" href={toHash('overview')}>
          Back to overview
        </a>
      </div>
    </section>
  </div>
);
