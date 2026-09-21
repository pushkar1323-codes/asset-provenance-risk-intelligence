/**
 * Adapts a connected wallet (DApp Connector API) to the WalletProvider and
 * MidnightProvider interfaces used by the contract integration layer
 * (see contract/src/api/providers.ts) to balance and submit transactions.
 *
 * Boundary note: the DApp Connector API's balanceUnsealedTransaction and
 * submitTransaction methods exchange transactions as strings, while
 * WalletProvider/MidnightProvider (from @midnight-ntwrk/midnight-js-types)
 * exchange typed Transaction objects from @midnight-ntwrk/ledger-v8. The
 * installed @midnight-ntwrk/dapp-connector-api (v4.0.1) documents this
 * boundary directly in its own type declarations: balanceUnsealedTransaction
 * "expects a serialized transaction of type Transaction<SignatureEnabled,
 * Proof, PreBinding>" (exactly midnight-js-types' UnboundTransaction), and
 * submitTransaction expects one "cryptographically bound
 * (Transaction<SignatureEnabled, Proof, Binding> type)" (exactly
 * FinalizedTransaction). The string itself is the hex encoding of that
 * transaction's own serialize() output, using the toHex/fromHex helpers
 * @midnight-ntwrk/midnight-js-utils ships for exactly this purpose - the
 * same encoding used throughout the Midnight ecosystem for transaction
 * hashes and identifiers (both hex-encoded strings per ledger-v8's own
 * type declarations).
 *
 * submitTransaction() itself returns void - the connector uses the wallet
 * purely as a relayer and does not hand back an identifier. The
 * transaction identifier midnight-js-contracts needs (to watch the
 * indexer for the submitted transaction) is instead read directly off the
 * already-finalized Transaction object passed into submitTx(), via its own
 * identifiers() method - no invented conversion is needed for this either.
 */

import type { WalletProvider, MidnightProvider, UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import type {
  Binding,
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
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

  async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
    const { tx: balancedHex } = await this.api.balanceUnsealedTransaction(toHex(tx.serialize()));
    // balanceUnsealedTransaction returns a transaction ready for submission:
    // balanced, fee-paid, signed, and cryptographically bound by the wallet.
    return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
      'signature',
      'proof',
      'binding',
      fromHex(balancedHex)
    );
  }

  async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
    await this.api.submitTransaction(toHex(tx.serialize()));
    const [transactionId] = tx.identifiers();
    if (!transactionId) {
      throw new Error(
        'WalletProviderAdapter.submitTx: the submitted transaction reported no identifiers.'
      );
    }
    return transactionId;
  }
}
