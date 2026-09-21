/**
 * Wires the register-asset user flow to the Asset Passport contract: it
 * derives the public asset id, generates the caller's local ownership
 * secret, connects to the already-deployed contract, and invokes the
 * registerAsset circuit. Circuit call arguments come entirely from the
 * generated contract's own typed interface (`callTx`) - no circuit
 * signature is redeclared here.
 */

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- resolved once `compact compile` has generated ../../../../contract/managed/**
import { assetPassportCompiledContract } from '../../../../contract/src/api/compiled-contract.js';
import { createAssetPassportPrivateState } from '../../../../contract/src/witnesses.js';
import { deriveAssetId, bytesToHex } from './assetId.js';
import type { RegisterAssetInput } from './validation.js';
import type { BrowserAssetPassportProviders } from './providers.browser.js';

export type RegisterAssetSuccess = {
  readonly kind: 'success';
  readonly assetIdHex: string;
  readonly transactionId: string;
};

export type RegisterAssetFailure = {
  readonly kind: 'failure';
  readonly stage: 'preparing' | 'connecting' | 'submitting';
  readonly message: string;
  /**
   * Set when the failure surfaced from inside WalletProviderAdapter itself
   * (balancing or submitting through the connected wallet) rather than from
   * an unrelated application error. WalletProviderAdapter's logic is
   * implemented against the Midnight DApp Connector API's documented
   * behavior, but has not yet been exercised against a live connected
   * wallet - see the project README for what remains to be verified there.
   */
  readonly requiresLiveWalletVerification: boolean;
};

export type RegisterAssetResult = RegisterAssetSuccess | RegisterAssetFailure;

export type RegisterAssetOptions = {
  readonly compiledAssetsPath: string;
  readonly contractAddress: string;
  readonly privateStateId: string;
};

export const registerAsset = async (
  input: RegisterAssetInput,
  providers: BrowserAssetPassportProviders,
  options: RegisterAssetOptions
): Promise<RegisterAssetResult> => {
  let assetId: Uint8Array;
  let ownerSecretKey: Uint8Array;

  try {
    assetId = await deriveAssetId(input.assetIdentifier);
    ownerSecretKey = crypto.getRandomValues(new Uint8Array(32));
  } catch (error) {
    return {
      kind: 'failure',
      stage: 'preparing',
      message: describeError(error),
      requiresLiveWalletVerification: false
    };
  }

  const privateState = createAssetPassportPrivateState({
    ownerSecretKeys: { [bytesToHex(assetId)]: ownerSecretKey }
  });

  let deployed: Awaited<ReturnType<typeof findDeployedContract>>;
  try {
    const compiledContract = assetPassportCompiledContract(options.compiledAssetsPath);
    deployed = await findDeployedContract(providers, {
      compiledContract,
      contractAddress: options.contractAddress,
      privateStateId: options.privateStateId,
      initialPrivateState: privateState
    });
  } catch (error) {
    return {
      kind: 'failure',
      stage: 'connecting',
      message: describeError(error),
      requiresLiveWalletVerification: false
    };
  }

  try {
    const registeredAt = BigInt(Math.floor(Date.now() / 1000));
    const result = await deployed.callTx.registerAsset(
      assetId,
      BigInt(input.assetCategory),
      registeredAt
    );
    // FinalizedCallTxData is privacy-sensitive: its `private` field carries
    // the unproven transaction, ZK transcript data, and next private state.
    // Only the public transaction id is read out here - the result object
    // itself must never be logged or spread.
    return {
      kind: 'success',
      assetIdHex: bytesToHex(assetId),
      transactionId: result.public.txId
    };
  } catch (error) {
    return {
      kind: 'failure',
      stage: 'submitting',
      message: describeError(error),
      requiresLiveWalletVerification: isWalletAdapterBoundary(error)
    };
  }
};

const isWalletAdapterBoundary = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('WalletProviderAdapter.balanceTx') ||
    error.message.includes('WalletProviderAdapter.submitTx'));

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected error occurred.';
