import {
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  chmodSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NoOpTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import {
  loadSerializedWalletState,
  restoreOrStartFresh,
  saveSerializedWalletState
} from '../../../src/deploy/wallet/persistence.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(os.tmpdir(), 'asset-passport-wallet-state-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('wallet state persistence', () => {
  it('reports no saved state before anything has been written', () => {
    expect(loadSerializedWalletState('preprod', '02aabbcc', 'shielded', tempDir)).toBeUndefined();
  });

  it('saves and reloads a serialized wallet state unchanged', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', '{"appliedIndex":"123"}', tempDir);

    const loaded = loadSerializedWalletState('preprod', '02aabbcc', 'shielded', tempDir);

    expect(loaded).toBe('{"appliedIndex":"123"}');
    expect(existsSync(path.join(tempDir, 'preprod.02aabbcc.shielded.json'))).toBe(true);
  });

  it('keeps the three wallet kinds separate for the same address', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'shielded-state', tempDir);
    saveSerializedWalletState('preprod', '02aabbcc', 'dust', 'dust-state', tempDir);
    saveSerializedWalletState('preprod', '02aabbcc', 'unshielded', 'unshielded-state', tempDir);

    expect(loadSerializedWalletState('preprod', '02aabbcc', 'shielded', tempDir)).toBe('shielded-state');
    expect(loadSerializedWalletState('preprod', '02aabbcc', 'dust', tempDir)).toBe('dust-state');
    expect(loadSerializedWalletState('preprod', '02aabbcc', 'unshielded', tempDir)).toBe('unshielded-state');
  });

  it('keeps state for different wallet addresses separate', () => {
    saveSerializedWalletState('preprod', '02aaaa', 'shielded', 'wallet-a', tempDir);
    saveSerializedWalletState('preprod', '02bbbb', 'shielded', 'wallet-b', tempDir);

    expect(loadSerializedWalletState('preprod', '02aaaa', 'shielded', tempDir)).toBe('wallet-a');
    expect(loadSerializedWalletState('preprod', '02bbbb', 'shielded', tempDir)).toBe('wallet-b');
  });

  it('keeps state for different networks separate, even for the same address', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'dust', 'preprod-state', tempDir);
    saveSerializedWalletState('undeployed', '02aabbcc', 'dust', 'undeployed-state', tempDir);

    expect(loadSerializedWalletState('preprod', '02aabbcc', 'dust', tempDir)).toBe('preprod-state');
    expect(loadSerializedWalletState('undeployed', '02aabbcc', 'dust', tempDir)).toBe('undeployed-state');
  });

  it('overwrites a previous save for the same key rather than appending', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'first', tempDir);
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'second', tempDir);

    expect(loadSerializedWalletState('preprod', '02aabbcc', 'shielded', tempDir)).toBe('second');
  });
});

describe('atomic state file writes', () => {
  const targetName = 'preprod.02aabbcc.shielded.json';

  it('leaves no temporary files behind after a successful save', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'one', tempDir);
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'two', tempDir);

    expect(readdirSync(tempDir)).toEqual([targetName]);
  });

  it.skipIf(process.platform === 'win32')('writes the state file with owner-only permissions', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'state', tempDir);

    expect(statSync(path.join(tempDir, targetName)).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')('restores owner-only permissions when replacing a file with wider ones', () => {
    const target = path.join(tempDir, targetName);
    writeFileSync(target, 'old');
    chmodSync(target, 0o644);

    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'new', tempDir);

    expect(readFileSync(target, 'utf8')).toBe('new');
    expect(statSync(target).mode & 0o777).toBe(0o600);
  });

  it('keeps the previous file intact and removes the temporary file when the write fails', () => {
    saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'previous', tempDir);

    // A non-string payload makes the write step fail after the temporary
    // file has been created.
    expect(() =>
      saveSerializedWalletState('preprod', '02aabbcc', 'shielded', undefined as unknown as string, tempDir)
    ).toThrow();

    expect(loadSerializedWalletState('preprod', '02aabbcc', 'shielded', tempDir)).toBe('previous');
    expect(readdirSync(tempDir)).toEqual([targetName]);
  });

  it('removes the temporary file when the final rename fails', () => {
    // A directory occupying the target path makes the rename step fail.
    mkdirSync(path.join(tempDir, targetName));

    expect(() => saveSerializedWalletState('preprod', '02aabbcc', 'shielded', 'state', tempDir)).toThrow();

    expect(readdirSync(tempDir)).toEqual([targetName]);
    expect(statSync(path.join(tempDir, targetName)).isDirectory()).toBe(true);
  });
});

describe('restoring saved wallet state', () => {
  // Minimal configuration for constructing real Wallet SDK wallets. restore()
  // deserializes the saved state synchronously and opens no connections here.
  const config = {
    networkId: 'preprod',
    indexerClientConnection: {
      indexerHttpUrl: 'http://127.0.0.1:1/api/v4/graphql',
      indexerWsUrl: 'ws://127.0.0.1:1/api/v4/graphql/ws'
    },
    relayURL: new URL('ws://127.0.0.1:1'),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { feeBlocksMargin: 10 }
  } as never;

  const restorers: Record<'shielded' | 'unshielded' | 'dust', (saved: string) => unknown> = {
    shielded: (saved) => ShieldedWallet(config).restore(saved),
    unshielded: (saved) => UnshieldedWallet(config).restore(saved),
    dust: (saved) => DustWallet(config).restore(saved)
  };

  const unusableStates: readonly [string, string][] = [
    ['empty', ''],
    ['malformed JSON', '{"appliedIndex":'],
    ['not JSON', 'not json'],
    ['valid JSON with an incompatible schema', '{"unexpected":"schema"}']
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const kind of ['shielded', 'unshielded', 'dust'] as const) {
    for (const [description, saved] of unusableStates) {
      it(`falls back to a fresh ${kind} wallet when the saved state is ${description}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const fresh = { fresh: true };

        const result = restoreOrStartFresh(kind, saved, restorers[kind], () => fresh);

        expect(result).toBe(fresh);
        expect(warn).toHaveBeenCalledTimes(1);
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).toContain(kind);
        expect(message).not.toContain(saved || 'unreachable-empty-state');
      });
    }
  }

  it('starts fresh without warning when nothing was saved', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const restore = vi.fn();
    const fresh = { fresh: true };

    expect(restoreOrStartFresh('dust', undefined, restore, () => fresh)).toBe(fresh);
    expect(restore).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns the restored wallet, without starting fresh, when restore succeeds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const restored = { restored: true };
    const startFresh = vi.fn();

    expect(restoreOrStartFresh('shielded', 'saved', () => restored, startFresh)).toBe(restored);
    expect(startFresh).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not classify a failure of the fresh start as a restore failure', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failure = new Error('fresh start failed');

    expect(() =>
      restoreOrStartFresh<unknown>(
        'shielded',
        'not json',
        restorers.shielded,
        () => {
          throw failure;
        }
      )
    ).toThrow(failure);
  });
});
