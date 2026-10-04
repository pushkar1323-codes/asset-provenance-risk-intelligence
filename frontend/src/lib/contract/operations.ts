/**
 * Which contract operations this application can actually submit.
 *
 * The contract defines more operations than the application has connected.
 * Screens for the others are built up to the point of submission, and the
 * final action stays off with an honest explanation; nothing here ever
 * reports a result that the contract did not return.
 */
export type ContractOperation =
  | 'registerAsset'
  | 'transferOwnership'
  | 'retireAsset'
  | 'addCredential'
  | 'addProvenanceEvent'
  | 'recordRiskAssessment';

const CONNECTED: Readonly<Record<ContractOperation, boolean>> = {
  registerAsset: true,
  transferOwnership: false,
  retireAsset: false,
  addCredential: false,
  addProvenanceEvent: false,
  recordRiskAssessment: false
};

export const isOperationConnected = (operation: ContractOperation): boolean => CONNECTED[operation];

export const OPERATION_NOT_CONNECTED_MESSAGE =
  'This action cannot be submitted from the app yet. Nothing has been sent, and nothing has changed.';
