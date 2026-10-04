import { describe, expect, it } from 'vitest';
import { describeRegisterFailure, sanitizeTechnicalMessage } from './errorMessages.js';
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
    expect(view.technicalDetail).toContain('Step: Preparing the registration');
  });

  it('does not claim that nothing was recorded after an unexpected failure', () => {
    const view = describeRegisterFailure(failure('something odd'));
    expect(view.message).not.toMatch(/nothing (was|is known)/i);
  });

  it('keeps internal class names and file paths out of the technical details', () => {
    const view = describeRegisterFailure(
      failure('WalletProviderAdapter.submitTx: no identifiers at /home/dev/app/node_modules/pkg/index.js:10:5', 'submitting', true)
    );
    expect(view.technicalDetail).not.toMatch(/WalletProviderAdapter/);
    expect(view.technicalDetail).not.toMatch(/node_modules|\/home\//);
    expect(view.technicalDetail).toContain('no identifiers');
    expect(view.message).not.toMatch(/adapter/i);
  });

  it('removes stack frames and caps very long messages', () => {
    const long = `boom\n    at fn (/srv/x/y.js:1:1)\n${'x'.repeat(500)}`;
    const cleaned = sanitizeTechnicalMessage(long);
    expect(cleaned).not.toContain('/srv/');
    expect(cleaned.length).toBeLessThanOrEqual(301);
  });
});
