import type { EnvironmentCheck } from './env.js';
import type { UseWalletResult } from '../wallet/useWallet.js';

/**
 * Whether the application can currently submit a transaction to the
 * contract. This is the single place the UI asks that question, so every
 * screen gives the same answer and the same explanation.
 */
export type ContractAvailability =
  | { readonly available: true }
  | {
      readonly available: false;
      readonly reason: 'not-configured' | 'wallet-disconnected' | 'wrong-network';
      readonly message: string;
    };

export const getContractAvailability = (
  envCheck: Pick<EnvironmentCheck, 'configured'>,
  wallet: Pick<UseWalletResult, 'state' | 'networkMismatch'>
): ContractAvailability => {
  if (!envCheck.configured) {
    return {
      available: false,
      reason: 'not-configured',
      message: 'The app is not configured for a network and contract yet.'
    };
  }
  if (wallet.state.status !== 'connected') {
    return {
      available: false,
      reason: 'wallet-disconnected',
      message: 'Connect a wallet using the wallet button in the header to continue.'
    };
  }
  if (wallet.networkMismatch) {
    return {
      available: false,
      reason: 'wrong-network',
      message: 'Switch the wallet to the expected network to continue.'
    };
  }
  return { available: true };
};
