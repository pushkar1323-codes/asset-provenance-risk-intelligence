import type { ReactNode } from 'react';
import type { IconName } from '../../lib/nav/nav.js';
import { Icon } from './Icon.js';

export const Callout = ({
  tone = 'info',
  icon = 'info',
  title,
  children
}: {
  tone?: 'info' | 'warning';
  icon?: IconName;
  title?: string;
  children: ReactNode;
}) => (
  <div className={`callout callout-${tone}`}>
    <Icon name={icon} />
    <div>
      {title && <strong>{title}</strong>}
      <p>{children}</p>
    </div>
  </div>
);
