/**
 * Binds the generated Asset Passport contract (produced by `compact compile`)
 * and its witness implementations into the `CompiledContract` shape that
 * Midnight.js's deployment and contract-interaction utilities expect.
 *
 * This file does not implement any contract logic itself - it only wires
 * together artifacts that already exist: the generated contract module in
 * `../../managed/asset-passport/` and the witnesses in `../witnesses.ts`.
 */

import * as CompiledContract from '@midnight-ntwrk/compact-js/effect/CompiledContract';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- resolved once `compact compile` has generated ../../managed/**
import { Contract as GeneratedAssetPassportContract, type Contract } from '../../managed/asset-passport/contract/index.js';

import { witnesses, type AssetPassportPrivateState } from '../witnesses.js';

/** The generated Asset Passport contract, specialized to its private state. */
export type AssetPassportContract = Contract<AssetPassportPrivateState>;

/**
 * Builds the `CompiledContract` binding for the Asset Passport contract.
 *
 * @param compiledAssetsPath Directory containing the compiled ZK assets
 *   (the `keys/` and `zkir/` produced under `managed/asset-passport/`).
 */
export const assetPassportCompiledContract = (compiledAssetsPath: string) =>
  CompiledContract.make<AssetPassportContract>('asset-passport', GeneratedAssetPassportContract)
    .pipe(
      CompiledContract.withWitnesses(witnesses),
      CompiledContract.withCompiledFileAssets(compiledAssetsPath)
    );
