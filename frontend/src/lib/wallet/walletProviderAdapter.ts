/**
 * Adapts a connected wallet (DApp Connector API) to the WalletProvider and
 * MidnightProvider interfaces used by the contract integration layer
 * (see contract/src/api/providers.ts) to balance and submit transactions.
 *
 * Boundary note: the DApp Connector API's balanceUnsealedTransaction and
 * submitTransaction methods exchange transactions as opaque strings, while
 * WalletProvider/MidnightProvider (from @midnight-ntwrk/midnight-js-types)
 * exchange typed Transaction objects from @midnight-ntwrk/ledger-v8. This
 * adapter bridges the two using that package's own serialize()/deserialize()
 * methods. The Midnight DApp Connector API specification does not itself
 * mandate a wire format for the string it accepts, so the exact encoding
 * this adapter uses has not been confirmed against a live wallet. Balancing
 * and submitting a transaction through this adapter requires that
 * verification (see project README).
 */

import type { WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import type {
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ConnectedWalletApi } from './types.js';

export class WalletProviderAdapter implements WalletProvider, MidnightProvider {
  constructor(
    private readonly api: ConnectedWalletApi,
    private readonly coinPublicKey: CoinPublicKey,
    private readonly encryptionPublicKey: EncPublicKey
  ) {}

  getCoinPublicKey(): CoinPublicKey {
    return this.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.encryptionPublicKey;
  }

  async balanceTx(tx: { serialize(): Uint8Array }): Promise<FinalizedTransaction> {
    const serialized = uint8ArrayToBase64(tx.serialize());
    await this.api.balanceUnsealedTransaction(serialized);
    // Reconstructing a real FinalizedTransaction from the balanced string
    // requires the exact ledger package build the connected wallet uses,
    // plus its signature/proof/binding type markers, which cannot be
    // safely assumed without a live wallet to verify against.
    throw new Error(
      'WalletProviderAdapter.balanceTx: transaction deserialization is not implemented. ' +
        'Requires verification against the connected wallet in a live environment.'
    );
  }

  async submitTx(tx: { serialize(): Uint8Array }): Promise<TransactionId> {
    const serialized = uint8ArrayToBase64(tx.serialize());
    await this.api.submitTransaction(serialized);
    // The connector API's submitTransaction does not return a transaction
    // identifier. Deriving one requires calling an identifier method (e.g.
    // transactionHash()) on the real ledger Transaction object, which this
    // adapter's minimal Transaction-like parameter type does not expose.
    throw new Error(
      'WalletProviderAdapter.submitTx: transaction identifier retrieval is not implemented. ' +
        'Requires verification against the connected wallet in a live environment.'
    );
  }
}

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};
