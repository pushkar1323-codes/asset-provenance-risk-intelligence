import { describe, expect, it } from 'vitest';
import { describeRegisterFailure } from './errorMessages.js';
import type { RegisterAssetFailure } from './registerAsset.js';

const failure = (
  message: string,
  stage: RegisterAssetFailure['stage'] = 'submitting',
  requiresLiveWalletVerification = false
): RegisterAssetFailure => ({ kind: 'failure', stage, message, requiresLiveWalletVerification });

describe('describeRegisterFailure', () => {
  it("recognises the contract's own already-registered assertion and does not offer a retry", () => {
    const view = describeRegisterFailure(failure('Asset is already registered'));
    expect(view.category).toBe('already-registered');
    expect(view.retryable).toBe(false);
    expect(view.editDetails).toBe(true);
  });

  it.each([
    ['User rejected the request', 'wallet-rejected'],
    ['Transaction was declined', 'wallet-rejected'],
    ['Wallet is on the wrong network', 'wrong-network'],
    ['proof server returned an error', 'proof-unavailable'],
    ['Failed to fetch', 'network'],
    ['WebSocket connection timed out', 'network']
  ])('categorises "%s" as %s', (message, category) => {
    expect(describeRegisterFailure(failure(message)).category).toBe(category);
  });

  it('treats an unrecognised failure while connecting as a contract problem', () => {
    expect(describeRegisterFailure(failure('boom', 'connecting')).category).toBe('contract-unavailable');
  });

  it('falls back to unexpected and never hides the raw message', () => {
    const view = describeRegisterFailure(failure('something odd', 'preparing'));
    expect(view.category).toBe('unexpected');
    expect(view.technicalDetail).toContain('something odd');
    expect(view.technicalDetail).toContain('Stage: preparing');
  });

  it('does not claim that nothing was recorded after an unexpected failure', () => {
    const view = describeRegisterFailure(failure('something odd'));
    expect(view.message).not.toMatch(/nothing (was|is known)/i);
  });

  it('flags adapter-originated failures in the technical details only', () => {
    const view = describeRegisterFailure(failure('WalletProviderAdapter.submitTx: no identifiers', 'submitting', true));
    expect(view.technicalDetail).toMatch(/wallet adapter/i);
    expect(view.message).not.toMatch(/adapter/i);
  });
});
