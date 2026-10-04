import type { LocalAsset } from '../lib/assets/assetStore.js';
import { Callout } from '../components/ui/Callout.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { AssetScopedFrame } from './AssetScopedFrame.js';

/** Risk summary for one asset. Shows only assessments that were actually loaded. */
export const RiskView = ({ asset }: { asset: LocalAsset }) => (
  <AssetScopedFrame asset={asset} view="risk" title="Risk Intelligence">
    <EmptyState icon="chart" title="No risk assessment">
      No assessment has been loaded for this asset, and nothing has been scored. This app cannot read
      assessments from the ledger in this version.
    </EmptyState>
    <Callout icon="shieldCheck" title="How assessments relate to the contract">
      Analysis happens off-chain. The contract stores only a commitment to an assessment and a coarse risk
      tier, recorded by an authorized assessor. Analysis can inform a decision but never overrides what the
      contract records.
    </Callout>
  </AssetScopedFrame>
);
