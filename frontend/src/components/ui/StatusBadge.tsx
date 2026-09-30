export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const StatusBadge = ({ tone, children }: { tone: BadgeTone; children: string }) => (
  <span className={`badge badge-${tone}`}>{children}</span>
);
