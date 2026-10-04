import type { LocalAssetStatus } from '../lib/assets/assetStore.js';
import { STATUS_LABELS } from '../lib/assets/labels.js';
import { StatusBadge } from './ui/StatusBadge.js';

export const AssetStatusBadge = ({ status }: { status: LocalAssetStatus }) => (
  <StatusBadge tone={STATUS_LABELS[status].tone}>{STATUS_LABELS[status].label}</StatusBadge>
);
