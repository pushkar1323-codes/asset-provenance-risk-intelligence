import type { ReactNode } from 'react';
import { Icon } from './Icon.js';
import type { IconName } from '../../lib/nav/nav.js';

/** A calm, explicit empty state with an optional next action. */
export const EmptyState = ({
  icon,
  title,
  children,
  action
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <div className="card empty-state stack-sm">
    <span className="pillar-icon">
      <Icon name={icon} size={24} />
    </span>
    <h2 className="card-title">{title}</h2>
    <p className="muted">{children}</p>
    {action && <div className="actions">{action}</div>}
  </div>
);
