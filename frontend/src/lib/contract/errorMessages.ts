import type { RegisterAssetFailure } from './registerAsset.js';

export type FailureCategory =
  | 'already-registered'
  | 'wallet-rejected'
  | 'wrong-network'
  | 'proof-unavailable'
  | 'network'
  | 'contract-unavailable'
  | 'unexpected';

export type FailureView = {
  readonly category: FailureCategory;
  readonly title: string;
  readonly message: string;
  /** Whether trying the same submission again could reasonably succeed. */
  readonly retryable: boolean;
  /** Whether the user should change their input instead of retrying. */
  readonly editDetails: boolean;
  /** Raw information for the collapsed technical-details section. */
  readonly technicalDetail: string;
};

/*
 * Categorisation is heuristic. The only message this application can be sure
 * of is the contract's own "Asset is already registered" assertion. The
 * other patterns are reasonable matches on common wording from wallets,
 * proof services and the network stack; they have not been checked against
 * a live wallet or Preprod, so anything unrecognised is reported as an
 * unexpected error with the raw message kept in the technical details.
 */
const ALREADY_REGISTERED = /already registered/i;
const REJECTED = /(reject|declin|denied|cancel|refus)/i;
const WRONG_NETWORK = /(network id|wrong network|network mismatch)/i;
const PROOF = /(proof server|prover|proving|zk config|zero-knowledge proof)/i;
const NETWORK =
  /(failed to fetch|networkerror|network request|timed? ?out|websocket|econnrefused|unreachable|indexer)/i;

export const describeRegisterFailure = (failure: RegisterAssetFailure): FailureView => {
  const raw = failure.message;
  const technicalDetail = [
    `Stage: ${failure.stage}`,
    `Message: ${raw}`,
    failure.requiresLiveWalletVerification
      ? 'Note: raised inside the wallet adapter, which has not yet been exercised against a live wallet.'
      : null
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const make = (
    category: FailureCategory,
    title: string,
    message: string,
    options: { retryable: boolean; editDetails?: boolean }
  ): FailureView => ({
    category,
    title,
    message,
    retryable: options.retryable,
    editDetails: options.editDetails ?? false,
    technicalDetail
  });

  if (ALREADY_REGISTERED.test(raw)) {
    return make(
      'already-registered',
      'This asset is already registered',
      'An asset with this identifier has already been registered, so it cannot be registered again. Check the identifier, or use a different one.',
      { retryable: false, editDetails: true }
    );
  }
  if (REJECTED.test(raw)) {
    return make(
      'wallet-rejected',
      'The request was not approved',
      'The wallet did not approve the request, or it was cancelled. You can try again when you are ready to approve it.',
      { retryable: true }
    );
  }
  if (WRONG_NETWORK.test(raw)) {
    return make(
      'wrong-network',
      'The wallet is on a different network',
      'Switch the wallet to the network this application uses, then try again.',
      { retryable: true }
    );
  }
  if (PROOF.test(raw)) {
    return make(
      'proof-unavailable',
      'The proof could not be generated',
      'The zero-knowledge proof could not be created. If your wallet relies on a local proof server, check that it is running, then try again.',
      { retryable: true }
    );
  }
  if (NETWORK.test(raw)) {
    return make(
      'network',
      'Could not reach the network',
      'A network service did not respond. Check your connection, then try again.',
      { retryable: true }
    );
  }
  if (failure.stage === 'connecting') {
    return make(
      'contract-unavailable',
      'Could not reach the contract',
      'The application could not connect to the configured contract. It may not be deployed on this network, or the configuration may be out of date.',
      { retryable: true }
    );
  }
  return make(
    'unexpected',
    'Something went wrong',
    'The registration did not complete. If you try again and are told the asset is already registered, the earlier attempt may have been recorded. The technical details below may help if this keeps happening.',
    { retryable: true }
  );
};
