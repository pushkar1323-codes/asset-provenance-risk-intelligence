/**
 * Navigation model for the application shell. Each destination declares
 * whether the underlying functionality actually exists. Destinations whose
 * functionality is not wired yet stay visible (so the product structure is
 * clear) but are explicitly marked unavailable and never show data.
 */

export type ViewId =
  | 'overview'
  | 'register'
  | 'assets'
  | 'passport'
  | 'provenance'
  | 'risk'
  | 'transfer'
  | 'retire'
  | 'privacy'
  | 'settings'
  | 'more';

export type IconName =
  | 'home'
  | 'plus'
  | 'list'
  | 'file'
  | 'clock'
  | 'chart'
  | 'swap'
  | 'archive'
  | 'shield'
  | 'shieldCheck'
  | 'lock'
  | 'eye'
  | 'settings'
  | 'more'
  | 'check'
  | 'x'
  | 'alert'
  | 'info'
  | 'copy'
  | 'wallet'
  | 'globe'
  | 'arrowLeft'
  | 'arrowRight';

export type NavItem = {
  readonly id: ViewId;
  readonly label: string;
  readonly icon: IconName;
  readonly available: boolean;
  /** Why the destination is unavailable, in plain language. */
  readonly unavailableReason?: string;
  /** What the destination is intended to provide once it is implemented. */
  readonly plannedPurpose?: string;
  readonly plannedSteps?: readonly string[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'home', available: true },
  { id: 'register', label: 'Register Asset', icon: 'plus', available: true },
  {
    id: 'assets',
    label: 'My Assets',
    icon: 'list',
    available: false,
    unavailableReason:
      'Listing assets needs a way to read them back from the ledger, which has not been built yet.',
    plannedPurpose:
      'A searchable list of the assets registered from this browser, with status and category.'
  },
  {
    id: 'passport',
    label: 'Asset Passport',
    icon: 'file',
    available: false,
    unavailableReason:
      'Showing a passport needs a way to read an asset record back from the ledger, which has not been built yet.',
    plannedPurpose:
      'The public record of one asset, an explanation of what stays private, and its registration details.'
  },
  {
    id: 'provenance',
    label: 'Provenance',
    icon: 'clock',
    available: false,
    unavailableReason:
      'The contract can record provenance events, but this application does not record or read them yet.',
    plannedPurpose: 'A lifecycle timeline: registration, ownership changes, and other recorded events.'
  },
  {
    id: 'risk',
    label: 'Risk Intelligence',
    icon: 'chart',
    available: false,
    unavailableReason:
      'Risk assessments come from an off-chain analysis service that has not been built yet. Nothing is scored today.',
    plannedPurpose:
      'A risk summary and history per asset. The analysis stays off-chain; the contract only stores a reference and a coarse tier, and analysis never overrides contract state.'
  },
  {
    id: 'transfer',
    label: 'Transfer Ownership',
    icon: 'swap',
    available: false,
    unavailableReason:
      'The contract has a transfer operation, but it is not wired into this application yet.',
    plannedPurpose: 'Hand an asset to a new owner using a zero-knowledge proof.',
    plannedSteps: ['Select the asset', 'Enter the recipient', 'Generate the proof', 'Confirm the transfer']
  },
  {
    id: 'retire',
    label: 'Retire Asset',
    icon: 'archive',
    available: false,
    unavailableReason:
      'The contract has a retire operation, but it is not wired into this application yet.',
    plannedPurpose: 'Permanently mark an asset as retired.',
    plannedSteps: ['Select the asset', 'Confirm the details', 'Generate the proof', 'Retire the asset']
  },
  { id: 'privacy', label: 'Privacy & Security', icon: 'lock', available: true },
  { id: 'settings', label: 'Settings', icon: 'settings', available: true }
];

export const getNavItem = (id: ViewId): NavItem | undefined => NAV_ITEMS.find((item) => item.id === id);

const KNOWN_VIEWS: ReadonlySet<string> = new Set<ViewId>([...NAV_ITEMS.map((i) => i.id), 'more']);

/** Parses a location hash such as "#/register" into a known view id. */
export const parseHash = (hash: string): ViewId => {
  const id = hash.replace(/^#\/?/, '').split('/')[0] ?? '';
  return KNOWN_VIEWS.has(id) ? (id as ViewId) : 'overview';
};

export const toHash = (id: ViewId): string => `#/${id}`;

/** The destinations shown in the mobile bottom bar; everything else lives under "More". */
export const BOTTOM_NAV_IDS: readonly ViewId[] = ['overview', 'assets', 'register', 'privacy', 'more'];
