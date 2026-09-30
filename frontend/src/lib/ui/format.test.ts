import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard, formatNetworkName, shortenMiddle } from './format.js';

describe('format helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shortens long values and leaves short ones alone', () => {
    expect(shortenMiddle('abcdefghijklmnopqrstuvwxyz', 4, 3)).toBe('abcd…xyz');
    expect(shortenMiddle('short')).toBe('short');
  });

  it('capitalises network names', () => {
    expect(formatNetworkName('preprod')).toBe('Preprod');
    expect(formatNetworkName('')).toBe('');
  });

  it('reports failure when the clipboard is unavailable instead of pretending to succeed', async () => {
    vi.stubGlobal('navigator', {});
    expect(await copyToClipboard('x')).toBe(false);
  });

  it('reports success when the clipboard write resolves and failure when it rejects', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyToClipboard('abc')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');

    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    expect(await copyToClipboard('abc')).toBe(false);
  });
});
