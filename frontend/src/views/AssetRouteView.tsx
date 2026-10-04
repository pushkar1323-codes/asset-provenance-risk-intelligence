import type { LocalAsset } from '../lib/assets/assetStore.js';
import type { ContractAvailability } from '../lib/contract/availability.js';
import { toHash, type ViewId } from '../lib/nav/nav.js';
import { AssetPicker } from '../components/AssetPicker.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { PassportView } from './PassportView.js';
import { ProvenanceView } from './ProvenanceView.js';
import { RiskView } from './RiskView.js';
import { TransferView } from './TransferView.js';
import { RetireView } from './RetireView.js';

const PICKER_COPY: Record<string, { title: string; intro: string }> = {
  passport: { title: 'Asset Passport', intro: 'Choose an asset to see its record.' },
  provenance: { title: 'Provenance', intro: 'Choose an asset to see its history.' },
  risk: { title: 'Risk Intelligence', intro: 'Choose an asset to see its risk summary.' },
  transfer: { title: 'Transfer Ownership', intro: 'Choose the asset you want to transfer.' },
  retire: { title: 'Retire Asset', intro: 'Choose the asset you want to retire.' }
};

/** Resolves the asset in the route and renders the matching asset-scoped screen. */
export const AssetRouteView = ({
  view,
  assetIdHex,
  assets,
  availability,
  onDiscardDraft
}: {
  view: ViewId;
  assetIdHex: string | null;
  assets: readonly LocalAsset[];
  availability: ContractAvailability;
  onDiscardDraft: (assetIdHex: string) => void;
}) => {
  const copy = PICKER_COPY[view] ?? PICKER_COPY.passport!;
  if (!assetIdHex) {
    return <AssetPicker title={copy.title} intro={copy.intro} view={view} assets={assets} />;
  }
  const asset = assets.find((a) => a.assetIdHex === assetIdHex);
  if (!asset) {
    return (
      <div className="stack-lg">
        <h1 className="page-title">{copy.title}</h1>
        <EmptyState
          icon="file"
          title="Asset not found"
          action={
            <a className="btn btn-primary" href={toHash('assets')}>
              Go to My Assets
            </a>
          }
        >
          This browser has no asset with that id. The list only includes assets registered or saved here.
        </EmptyState>
      </div>
    );
  }
  switch (view) {
    case 'provenance':
      return <ProvenanceView asset={asset} />;
    case 'risk':
      return <RiskView asset={asset} />;
    case 'transfer':
      return <TransferView asset={asset} availability={availability} />;
    case 'retire':
      return <RetireView asset={asset} availability={availability} />;
    default:
      return <PassportView asset={asset} availability={availability} onDiscardDraft={onDiscardDraft} />;
  }
};
