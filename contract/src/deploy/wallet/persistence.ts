/**
 * Persists each sub-wallet's serialized sync state locally, so a
 * deployment run that is interrupted (or simply re-run) does not have to
 * repeat the lengthy historical ledger scan a brand-new wallet otherwise
 * requires on Preprod.
 *
 * What is stored: each Wallet SDK sub-wallet's own serializeState() output
 * - sync progress and discovered coin/UTXO data. This module never
 * touches the wallet's secret keys; they are re-derived from the
 * configured seed on every run (see keys.ts) and passed to facade.start()
 * separately, exactly as before this module existed. The serialized state
 * is still local, sensitive deployment data, so it is stored under the
 * same gitignored directory as the deployment's admin/oracle secrets
 * (see ../secrets.ts), with the same restrictive file permissions, keyed
 * by network and the wallet's own (non-secret) address rather than by
 * private-state id, since wallet sync progress and contract private state
 * are different concepts that happen to currently be configured together.
 */

import {
  mkdirSync,
  readFileSync,
  existsSync,
  chmodSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type WalletKind = 'shielded' | 'dust' | 'unshielded';

const contractRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const defaultWalletStateDir = path.join(contractRoot, '.deployment-secrets', 'wallet-state');

const stateFilePath = (baseDir: string, networkId: string, walletAddressHex: string, wallet: WalletKind): string =>
  path.join(baseDir, `${networkId}.${walletAddressHex}.${wallet}.json`);

/** Reads a previously saved serialized wallet state, if one exists. */
export const loadSerializedWalletState = (
  networkId: string,
  walletAddressHex: string,
  wallet: WalletKind,
  baseDir: string = defaultWalletStateDir
): string | undefined => {
  const filePath = stateFilePath(baseDir, networkId, walletAddressHex, wallet);
  if (!existsSync(filePath)) {
    return undefined;
  }
  return readFileSync(filePath, 'utf8');
};

/**
 * Persists a wallet's serialized state, creating the directory if needed.
 *
 * The content is written in full to a temporary file in the same
 * directory (so the final rename stays on one filesystem), flushed to
 * disk, restricted to 0o600, and then renamed over the target. A reader
 * therefore only ever sees the previous complete file or the new complete
 * file, never a partially written one. If any step fails, the temporary
 * file is removed, the previous target file (if any) is left untouched,
 * and the error is rethrown.
 */
export const saveSerializedWalletState = (
  networkId: string,
  walletAddressHex: string,
  wallet: WalletKind,
  serialized: string,
  baseDir: string = defaultWalletStateDir
): void => {
  const filePath = stateFilePath(baseDir, networkId, walletAddressHex, wallet);
  const tempPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  mkdirSync(baseDir, { recursive: true });

  let fd: number | undefined;
  try {
    // 'wx' fails rather than reusing an existing path; the mode applies
    // from creation so the content is never readable more widely.
    fd = openSync(tempPath, 'wx', 0o600);
    writeSync(fd, serialized);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try {
      chmodSync(tempPath, 0o600);
    } catch {
      // Best-effort only - not all filesystems support POSIX permission bits.
    }
    renameSync(tempPath, filePath);
  } catch (error) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // Already closed or unusable; nothing further to release.
      }
    }
    try {
      unlinkSync(tempPath);
    } catch {
      // The temporary file may never have been created.
    }
    throw error;
  }
};

/**
 * Restores a wallet from previously saved state, falling back to a fresh
 * wallet when that state cannot be restored.
 *
 * Only the `restore` callback is guarded: if it throws (the saved state is
 * malformed, corrupted, or incompatible with the installed Wallet SDK's
 * schema), one warning naming only the wallet kind is logged, the saved
 * state is ignored, and `startFresh` is used instead so normal
 * synchronization begins from the start. Errors thrown by `startFresh`
 * itself are not caught. With no saved state, `startFresh` is used
 * directly.
 */
export const restoreOrStartFresh = <T>(
  wallet: WalletKind,
  saved: string | undefined,
  restore: (saved: string) => T,
  startFresh: () => T
): T => {
  if (saved === undefined) {
    return startFresh();
  }
  let restored: T;
  try {
    restored = restore(saved);
  } catch {
    console.warn(
      `Wallet sync: saved ${wallet} state could not be restored; ignoring it and starting a fresh sync.`
    );
    return startFresh();
  }
  return restored;
};

export const walletStateDirectory = (): string => defaultWalletStateDir;
