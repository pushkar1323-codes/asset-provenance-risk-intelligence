/**
 * Deploys the Asset Passport contract to a Midnight network.
 *
 * This wraps Midnight.js's `deployContract` with the Asset Passport's own
 * compiled-contract binding; it does not reimplement any contract logic -
 * the constructor arguments and resulting ledger state are entirely
 * determined by `asset-passport.compact`.
 */

import { deployContract, type DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { SigningKey } from '@midnight-ntwrk/compact-runtime';

import { assetPassportCompiledContract, type AssetPassportContract } from './compiled-contract.js';
import type { AssetPassportProviders } from './providers.js';
import { createAssetPassportPrivateState, type AssetPassportPrivateState } from '../witnesses.js';

export type DeployAssetPassportOptions = {
  /** Directory containing the compiled ZK assets for the contract. */
  readonly compiledAssetsPath: string;
  /**
   * Public-key-style commitment authorizing the protocol administrator role
   * (see `adminPublicKey` in the contract). Computed off-chain from a
   * secret that is never submitted to the contract.
   */
  readonly adminKey: Uint8Array;
  /**
   * Public-key-style commitment authorizing the risk oracle role (see
   * `oraclePublicKey` in the contract).
   */
  readonly oracleKey: Uint8Array;
  /** Identifier under which this deployment's private state will be stored. */
  readonly privateStateId: string;
  /** Initial private state for the deploying participant (defaults to empty). */
  readonly initialPrivateState?: AssetPassportPrivateState;
  /**
   * Optional contract-maintenance-authority signing key. If omitted,
   * Midnight.js generates and stores one automatically.
   */
  readonly signingKey?: SigningKey;
};

export type DeployedAssetPassport = DeployedContract<AssetPassportContract>;

/** Deploys a new instance of the Asset Passport contract. */
export const deployAssetPassport = async (
  providers: AssetPassportProviders,
  options: DeployAssetPassportOptions
): Promise<DeployedAssetPassport> => {
  const compiledContract = assetPassportCompiledContract(options.compiledAssetsPath);

  return deployContract(providers, {
    compiledContract,
    args: [options.adminKey, options.oracleKey],
    privateStateId: options.privateStateId,
    initialPrivateState: options.initialPrivateState ?? createAssetPassportPrivateState(),
    signingKey: options.signingKey
  });
};
