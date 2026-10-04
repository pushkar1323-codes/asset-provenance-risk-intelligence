import type { LocalAssetEventKind, LocalAssetStatus } from './assetStore.js';
import type { BadgeTone } from '../../components/ui/StatusBadge.js';

export const ASSET_CATEGORIES: ReadonlyArray<{ readonly value: number; readonly label: string }> = [
  { value: 1, label: 'Passenger vehicle' },
  { value: 2, label: 'Commercial vehicle' },
  { value: 3, label: 'Motorcycle' }
];

export const categoryLabel = (value: number): string =>
  ASSET_CATEGORIES.find((c) => c.value === value)?.label ?? `Category ${value}`;

export const STATUS_LABELS: Record<LocalAssetStatus, { label: string; tone: BadgeTone; meaning: string }> = {
  draft: {
    label: 'Draft',
    tone: 'neutral',
    meaning: 'Saved on this device only. Nothing has been recorded on Midnight.'
  },
  registered: {
    label: 'Registered',
    tone: 'success',
    meaning: 'Recorded on Midnight when it was registered from this browser.'
  },
  retired: { label: 'Retired', tone: 'warning', meaning: 'Permanently marked as retired.' }
};

export const EVENT_LABELS: Record<LocalAssetEventKind, { title: string; detail: string }> = {
  'draft-saved': { title: 'Draft saved', detail: 'Saved on this device. Not recorded on Midnight.' },
  registered: { title: 'Registered on Midnight', detail: 'The contract returned a transaction id for this registration.' },
  retired: { title: 'Retired', detail: 'The asset was marked as retired.' }
};

export const formatDateTime = (millis: number): string =>
  new Date(millis).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
