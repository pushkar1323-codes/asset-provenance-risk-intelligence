import { VISIBILITY_TERMS, type VisibilityKind } from '../../lib/content/privacy.js';
import type { IconName } from '../../lib/nav/nav.js';
import { Icon } from './Icon.js';

const ICONS: Record<VisibilityKind, IconName> = { public: 'eye', private: 'lock', proven: 'shieldCheck' };

/** The three privacy concepts, always shown as icon + text so colour is never the only signal. */
export const VisibilityTag = ({ kind }: { kind: VisibilityKind }) => (
  <span className={`vis-tag vis-${kind}`}>
    <Icon name={ICONS[kind]} size={14} />
    {VISIBILITY_TERMS[kind].label}
  </span>
);
