/**
 * Constructs and starts a Node WalletFacade: the Wallet SDK's unified
 * interface over the shielded, unshielded, and DUST wallets, used here to
 * balance and submit real transactions for the deployment runner.
 *
 * Connecting requires reaching the configured indexer and node/relay over
 * the network and is not exercised by this project's automated tests -
 * only the configuration and construction logic are.
 *
 * A brand-new wallet must scan the full relevant history of the shielded
 * and DUST ledgers before it is considered synced, which can legitimately
 * take a long time on Preprod. To avoid repeating that scan on every run,
 * this module saves each sub-wallet's sync progress locally (see
 * ./persistence.ts) and resumes from it on the next run instead of
 * starting over. Progress is also logged periodically so a long sync is
 * visibly moving rather than silent.
 */

import * as ledger from '@midnight-ntwrk/ledger-v8';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { NoOpTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import type { SyncProgress as SyncProgressNS } from '@midnight-ntwrk/wallet-sdk-abstractions';
import * as rx from 'rxjs';

import type { WalletNetworkConfig } from './walletConfig.js';
import type { DerivedWalletKeys } from './keys.js';
import { loadSerializedWalletState, restoreOrStartFresh, saveSerializedWalletState } from './persistence.js';

/**
 * Builds the shared configuration object the shielded, unshielded, DUST,
 * and submission/proving services all read their relevant fields from.
 * Transaction history is not needed for deployment, so a no-op storage
 * is used rather than persisting entries nobody reads.
 */
const buildFacadeConfiguration = (network: WalletNetworkConfig) => ({
  networkId: network.networkId,
  indexerClientConnection: {
    indexerHttpUrl: network.indexerUrl,
    indexerWsUrl: network.indexerWsUrl
  },
  relayURL: new URL(network.relayUrl),
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
  // The DUST wallet's fee-estimation safety margin (in blocks). The
  // installed package does not document or provide a default for this
  // value; it should be verified against current Preprod guidance rather
  // than assumed correct.
  costParameters: { feeBlocksMargin: 10 },
  // Omitted entirely (not set to undefined) when no proof server is
  // configured, so the facade falls back to local WASM-based proving
  // rather than requiring one to be running.
  ...(network.proofServerUrl ? { provingServerUrl: new URL(network.proofServerUrl) } : {})
});

/**
 * Subscribes to a sub-wallet's already-public `.state` observable purely
 * to read the `.progress` value the SDK already computes and exposes (see
 * @midnight-ntwrk/wallet-sdk-abstractions' SyncProgress). This does not
 * alter state, subscriptions, retry behavior, or configuration - it is a
 * passive observer, throttled to at most one log line roughly every 10
 * seconds per wallet rather than once per emission. It logs only ledger
 * sync-position counters, never raw events, addresses, or key material.
 */
const logSyncProgress = (
  label: 'shielded' | 'dust',
  state$: rx.Observable<{ readonly progress: SyncProgressNS.SyncProgress }>
): rx.Subscription =>
  state$.pipe(rx.map((s) => s.progress), rx.auditTime(10_000)).subscribe({
    next: (progress) => {
      const applyGap = progress.highestRelevantWalletIndex - progress.appliedIndex;
      console.log(
        `Wallet sync (${label}): applied ${progress.appliedIndex} of ${progress.highestRelevantWalletIndex}` +
          ` (${applyGap} remaining)${progress.isCompleteWithin(0n) ? ' - caught up' : ''}`
      );
    },
    error: (err) => {
      console.error(`Wallet sync (${label}): progress stream error`, err);
    }
  });

/**
 * As logSyncProgress above, but for unshielded, whose own SyncProgress
 * (@midnight-ntwrk/wallet-sdk-unshielded-wallet/dist/v1/SyncProgress.d.ts)
 * genuinely has a different, simpler shape than shielded/dust's shared one
 * (appliedId/highestTransactionId rather than appliedIndex/
 * highestRelevantWalletIndex), so it is logged separately rather than
 * forced into the same fields.
 */
const logUnshieldedSyncProgress = (
  state$: rx.Observable<{
    readonly progress: {
      readonly appliedId: bigint;
      readonly highestTransactionId: bigint;
      isCompleteWithin(maxGap?: bigint): boolean;
    };
  }>
): rx.Subscription =>
  state$.pipe(rx.map((s) => s.progress), rx.auditTime(10_000)).subscribe({
    next: (progress) => {
      console.log(
        `Wallet sync (unshielded): applied ${progress.appliedId} of ${progress.highestTransactionId}` +
          `${progress.isCompleteWithin(0n) ? ' - caught up' : ''}`
      );
    },
    error: (err) => {
      console.error('Wallet sync (unshielded): progress stream error', err);
    }
  });

type SerializableWallet = { serializeState(): Promise<string> };

/**
 * Saves all three sub-wallets' current sync progress to disk. Errors are
 * logged, not thrown - a failed save should not interrupt an otherwise
 * working sync, since the worst case is simply re-scanning on next run.
 */
const saveProgress = async (
  networkId: string,
  walletAddressHex: string,
  shielded: SerializableWallet,
  dust: SerializableWallet,
  unshielded: SerializableWallet
): Promise<void> => {
  const wallets: readonly [WalletNameKind, SerializableWallet][] = [
    ['shielded', shielded],
    ['dust', dust],
    ['unshielded', unshielded]
  ];
  for (const [kind, wallet] of wallets) {
    try {
      const serialized = await wallet.serializeState();
      saveSerializedWalletState(networkId, walletAddressHex, kind, serialized);
    } catch (error) {
      // Only the error type/code is logged: filesystem error messages
      // include the state file path, which embeds the wallet address.
      const reason =
        error instanceof Error
          ? `${error.name}${(error as NodeJS.ErrnoException).code ? ` (${(error as NodeJS.ErrnoException).code})` : ''}`
          : 'unknown error';
      console.error(`Wallet sync: failed to save ${kind} progress locally: ${reason}`);
    }
  }
};

type WalletNameKind = 'shielded' | 'dust' | 'unshielded';

/** How often sync progress is saved to disk while waiting to sync, in milliseconds. */
const PROGRESS_SAVE_INTERVAL_MS = 60_000;

/** Upper bound on how long shutdown waits for the facade to stop, in milliseconds. */
const FACADE_STOP_TIMEOUT_MS = 5_000;

/**
 * Stops the facade through its public stop() API during shutdown. Called
 * only after progress has been saved, and bounded by a timeout so an
 * unresponsive connection can never prevent the process from exiting.
 * Failures are logged and otherwise ignored.
 */
const stopFacade = async (facade: WalletFacade): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), FACADE_STOP_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([facade.stop().then(() => 'stopped' as const), timeout]);
    if (result === 'timeout') {
      console.warn('Wallet sync: timed out waiting for the wallet to stop; exiting anyway.');
    }
  } catch (error) {
    console.error('Wallet sync: error while stopping the wallet', error);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Constructs the three underlying wallets, wires them into a WalletFacade,
 * starts them, and waits for the facade to finish its initial sync.
 *
 * If a previous run already saved progress for this wallet address on
 * this network, each sub-wallet resumes from it instead of starting a
 * fresh historical scan. Progress is saved periodically while waiting,
 * on SIGINT/SIGTERM (followed by a clean facade stop), and once more after a
 * successful sync. If a saved state cannot be restored, it is ignored and
 * that wallet starts a fresh sync.
 */
export const connectNodeWalletFacade = async (
  network: WalletNetworkConfig,
  keys: DerivedWalletKeys
): Promise<WalletFacade> => {
  const configuration = buildFacadeConfiguration(network);
  const dustParameters = ledger.LedgerParameters.initialParameters().dust;
  const walletAddressHex = keys.unshieldedPublicKey.addressHex;

  const savedShielded = loadSerializedWalletState(network.networkId, walletAddressHex, 'shielded');
  const savedDust = loadSerializedWalletState(network.networkId, walletAddressHex, 'dust');
  const savedUnshielded = loadSerializedWalletState(network.networkId, walletAddressHex, 'unshielded');

  if (savedShielded || savedDust || savedUnshielded) {
    console.log('Wallet sync: resuming from previously saved local progress.');
  }

  const facade = await WalletFacade.init({
    configuration,
    shielded: (config) =>
      restoreOrStartFresh(
        'shielded',
        savedShielded,
        (saved) => ShieldedWallet(config).restore(saved),
        () => ShieldedWallet(config).startWithSecretKeys(keys.shieldedSecretKeys)
      ),
    unshielded: (config) =>
      restoreOrStartFresh(
        'unshielded',
        savedUnshielded,
        (saved) => UnshieldedWallet(config).restore(saved),
        () => UnshieldedWallet(config).startWithPublicKey(keys.unshieldedPublicKey)
      ),
    dust: (config) =>
      restoreOrStartFresh(
        'dust',
        savedDust,
        (saved) => DustWallet(config).restore(saved),
        () => DustWallet(config).startWithSecretKey(keys.dustSecretKey, dustParameters)
      )
  });

  await facade.start(keys.shieldedSecretKeys, keys.dustSecretKey);

  // At most one save runs at a time. The periodic timer skips a tick while
  // a save is still running; the final saves (after sync, and on a signal)
  // wait for it to finish and then take a fresh snapshot, so a newer
  // snapshot is never overwritten by an older, slower one.
  let inFlightSave: Promise<void> | undefined;
  const runSave = (): Promise<void> => {
    const save: Promise<void> = saveProgress(
      network.networkId,
      walletAddressHex,
      facade.shielded,
      facade.dust,
      facade.unshielded
    ).finally(() => {
      if (inFlightSave === save) {
        inFlightSave = undefined;
      }
    });
    inFlightSave = save;
    return save;
  };
  const persistPeriodically = () => {
    if (inFlightSave) return;
    void runSave();
  };
  const persistLatest = async (): Promise<void> => {
    if (inFlightSave) {
      await inFlightSave;
    }
    await runSave();
  };

  const progressSubscriptions = [
    logSyncProgress('shielded', facade.shielded.state),
    logSyncProgress('dust', facade.dust.state),
    logUnshieldedSyncProgress(facade.unshielded.state)
  ];
  const saveInterval = setInterval(persistPeriodically, PROGRESS_SAVE_INTERVAL_MS);

  // Ensures a sync that is interrupted part-way (Ctrl+C) does not lose all
  // progress made so far - the next run can resume close to where this
  // one was stopped, rather than from the beginning.
  let exiting = false;
  const onSignal = (signal: NodeJS.Signals) => {
    if (exiting) return;
    exiting = true;
    console.log(`Wallet sync: received ${signal}, saving progress before exiting...`);
    void persistProgressAndExit();
  };
  const persistProgressAndExit = async () => {
    clearInterval(saveInterval);
    try {
      await persistLatest();
    } catch (error) {
      console.error('Wallet sync: failed to save progress before exiting', error);
    }
    for (const subscription of progressSubscriptions) {
      subscription.unsubscribe();
    }
    await stopFacade(facade);
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await facade.waitForSyncedState();
    await persistLatest();
  } finally {
    clearInterval(saveInterval);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    for (const subscription of progressSubscriptions) {
      subscription.unsubscribe();
    }
  }

  return facade;
};
