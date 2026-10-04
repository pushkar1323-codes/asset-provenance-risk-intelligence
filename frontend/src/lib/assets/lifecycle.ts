import type { LocalAsset } from './assetStore.js';
import type { ContractAvailability } from '../contract/availability.js';
import { isOperationConnected, OPERATION_NOT_CONNECTED_MESSAGE, type ContractOperation } from '../contract/operations.js';

/** The contract identifies the new owner by a 32-byte commitment. */
const COMMITMENT_HEX = /^[0-9a-f]{64}$/i;

export type CommitmentValidation =
  | { readonly valid: true; readonly normalized: string }
  | { readonly valid: false; readonly error: string };

export const validateOwnerCommitment = (raw: string): CommitmentValidation => {
  const value = raw.trim().replace(/^0x/i, '');
  if (value.length === 0) {
    return { valid: false, error: 'Enter the new owner commitment.' };
  }
  if (!COMMITMENT_HEX.test(value)) {
    return { valid: false, error: 'The commitment must be exactly 64 hexadecimal characters (0-9, a-f).' };
  }
  return { valid: true, normalized: value.toLowerCase() };
};

/**
 * Everything that currently prevents a lifecycle action from being
 * submitted, in the order a user can act on it. An empty list means the
 * action could be submitted.
 */
export const lifecycleBlockers = (
  asset: LocalAsset,
  operation: ContractOperation,
  availability: ContractAvailability
): string[] => {
  const blockers: string[] = [];
  if (asset.status === 'draft') {
    blockers.push('Register this asset on Midnight first. A draft has no on-chain record to change.');
  }
  if (asset.status === 'retired') {
    blockers.push('This asset is retired and can no longer be changed.');
  }
  if (!availability.available) {
    blockers.push(availability.message);
  }
  if (!isOperationConnected(operation)) {
    blockers.push(OPERATION_NOT_CONNECTED_MESSAGE);
  }
  return blockers;
};
