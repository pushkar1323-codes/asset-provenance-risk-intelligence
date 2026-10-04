/**
 * Navigation model for the application shell. Destinations marked
 * `assetScoped` act on one asset: they accept an asset id in the route
 * (for example `#/passport/<asset id>`) and show an asset picker without it.
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
  /** Whether the destination operates on a single asset chosen via the route. */
  readonly assetScoped?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'register', label: 'Register Asset', icon: 'plus' },
  { id: 'assets', label: 'My Assets', icon: 'list' },
  { id: 'passport', label: 'Asset Passport', icon: 'file', assetScoped: true },
  { id: 'provenance', label: 'Provenance', icon: 'clock', assetScoped: true },
  { id: 'risk', label: 'Risk Intelligence', icon: 'chart', assetScoped: true },
  { id: 'transfer', label: 'Transfer Ownership', icon: 'swap', assetScoped: true },
  { id: 'retire', label: 'Retire Asset', icon: 'archive', assetScoped: true },
  { id: 'privacy', label: 'Privacy & Security', icon: 'lock' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

export const getNavItem = (id: ViewId): NavItem | undefined => NAV_ITEMS.find((item) => item.id === id);

const KNOWN_VIEWS: ReadonlySet<string> = new Set<ViewId>([...NAV_ITEMS.map((i) => i.id), 'more']);

/** Parses a location hash such as "#/register" into a known view id. */
export const parseHash = (hash: string): ViewId => parseRoute(hash).view;

export type Route = { readonly view: ViewId; readonly param: string | null };

/** Parses "#/passport/<asset id>" into its view and optional parameter. */
export const parseRoute = (hash: string): Route => {
  const [id = '', param] = hash.replace(/^#\/?/, '').split('/');
  const view: ViewId = KNOWN_VIEWS.has(id) ? (id as ViewId) : 'overview';
  return { view, param: view === id && param ? decodeURIComponent(param) : null };
};

export const toHash = (id: ViewId, param?: string): string =>
  param ? `#/${id}/${encodeURIComponent(param)}` : `#/${id}`;

/** The destinations shown in the mobile bottom bar; everything else lives under "More". */
export const BOTTOM_NAV_IDS: readonly ViewId[] = ['overview', 'assets', 'register', 'privacy', 'more'];
