/**
 * Connects to an already-deployed instance of the Asset Passport contract,
 * so an application/backend can call its circuits outside of the unit-test
 * simulator.
 */

import { findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';

import { assetPassportCompiledContract, type AssetPassportContract } from './compiled-contract.js';
import type { AssetPassportProviders } from './providers.js';
import type { AssetPassportPrivateState } from '../witnesses.js';

export type ConnectAssetPassportOptions = {
  /** Directory containing the compiled ZK assets for the contract. */
  readonly compiledAssetsPath: string;
  /** Ledger address of the already-deployed contract. */
  readonly contractAddress: ContractAddress;
  /** Identifier under which this participant's private state is stored. */
  readonly privateStateId: string;
  /**
   * Private state to store under `privateStateId`. Omit to use whatever is
   * already stored locally for that identifier (e.g. after a previous
   * deployment or connection in the same environment).
   */
  readonly initialPrivateState?: AssetPassportPrivateState;
  /** Optional contract-maintenance-authority signing key (see Midnight.js docs). */
  readonly signingKey?: SigningKey;
};

export type ConnectedAssetPassport = FoundContract<AssetPassportContract>;

/** Connects to an existing, already-deployed Asset Passport contract. */
export const connectAssetPassport = async (
  providers: AssetPassportProviders,
  options: ConnectAssetPassportOptions
): Promise<ConnectedAssetPassport> => {
  const compiledContract = assetPassportCompiledContract(options.compiledAssetsPath);

  if (options.initialPrivateState !== undefined) {
    return findDeployedContract(providers, {
      compiledContract,
      contractAddress: options.contractAddress,
      privateStateId: options.privateStateId,
      initialPrivateState: options.initialPrivateState,
      signingKey: options.signingKey
    });
  }

  return findDeployedContract(providers, {
    compiledContract,
    contractAddress: options.contractAddress,
    privateStateId: options.privateStateId,
    signingKey: options.signingKey
  });
};
