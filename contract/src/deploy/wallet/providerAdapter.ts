/**
 * Implements the contract-interaction layer's WalletProvider and
 * MidnightProvider interfaces on top of a connected Node WalletFacade.
 *
 * Unlike the browser wallet adapter (which bridges to a wallet extension's
 * string-based wire format and has a documented unsupported boundary),
 * the Wallet SDK works directly with the same typed transaction objects
 * WalletProvider/MidnightProvider expect, so no serialization step is
 * needed here - this is a real, complete implementation.
 */

import type { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import type {
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { firstValueFrom } from 'rxjs';

import type { DerivedWalletKeys } from './keys.js';

export class NodeWalletProviderAdapter implements WalletProvider, MidnightProvider {
  private constructor(
    private readonly facade: WalletFacade,
    private readonly secretKeys: DerivedWalletKeys,
    private readonly coinPublicKey: CoinPublicKey,
    private readonly encryptionPublicKey: EncPublicKey
  ) {}

  /**
   * Reads the facade's current synced state once to capture the public
   * keys WalletProvider needs synchronously, then returns a ready adapter.
   * The facade itself must already be started and synced (see facade.ts).
   */
  static async create(
    facade: WalletFacade,
    keys: DerivedWalletKeys
  ): Promise<NodeWalletProviderAdapter> {
    const state = await firstValueFrom(facade.state());
    return new NodeWalletProviderAdapter(
      facade,
      keys,
      state.shielded.coinPublicKey.toHexString(),
      state.shielded.encryptionPublicKey.toHexString()
    );
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.encryptionPublicKey;
  }

  async balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> {
    const recipe = await this.facade.balanceUnboundTransaction(
      tx,
      {
        shieldedSecretKeys: this.secretKeys.shieldedSecretKeys,
        dustSecretKey: this.secretKeys.dustSecretKey
      },
      { ttl: ttl ?? new Date(Date.now() + 60 * 60 * 1000) }
    );
    return this.facade.finalizeRecipe(recipe);
  }

  async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
    return this.facade.submitTransaction(tx);
  }
}
