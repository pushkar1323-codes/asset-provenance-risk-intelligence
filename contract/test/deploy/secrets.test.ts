import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadOrCreateDeploymentSecrets } from '../../src/deploy/secrets.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(path.join(os.tmpdir(), 'asset-passport-secrets-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('loadOrCreateDeploymentSecrets', () => {
  it('generates new secrets on first use and persists them to disk', () => {
    const { secrets, isNew } = loadOrCreateDeploymentSecrets('preprod', 'asset-passport', tempDir);
    expect(isNew).toBe(true);
    expect(secrets.adminSecret).toHaveLength(32);
    expect(secrets.oracleSecret).toHaveLength(32);
    expect(existsSync(path.join(tempDir, 'preprod.asset-passport.json'))).toBe(true);
  });

  it('reuses the same secrets on a later call rather than regenerating them', () => {
    const first = loadOrCreateDeploymentSecrets('preprod', 'asset-passport', tempDir);
    const second = loadOrCreateDeploymentSecrets('preprod', 'asset-passport', tempDir);

    expect(second.isNew).toBe(false);
    expect(second.secrets.adminSecret).toEqual(first.secrets.adminSecret);
    expect(second.secrets.oracleSecret).toEqual(first.secrets.oracleSecret);
  });

  it('keeps secrets for different private-state identifiers separate', () => {
    const a = loadOrCreateDeploymentSecrets('preprod', 'asset-passport-a', tempDir);
    const b = loadOrCreateDeploymentSecrets('preprod', 'asset-passport-b', tempDir);

    expect(a.secrets.adminSecret).not.toEqual(b.secrets.adminSecret);
  });

  it('stores secrets as the expected two-field JSON structure', () => {
    // Confirms the storage mechanism's shape without asserting on or
    // printing the actual secret values.
    loadOrCreateDeploymentSecrets('preprod', 'asset-passport', tempDir);
    const filePath = path.join(tempDir, 'preprod.asset-passport.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(Object.keys(raw).sort()).toEqual(['adminSecret', 'oracleSecret']);
  });
});
