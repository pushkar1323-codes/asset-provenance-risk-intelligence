/**
 * Generates (or reuses) the local secret material behind the contract's
 * administrator and risk-oracle roles.
 *
 * These secrets are never transmitted anywhere - only the public
 * commitments derived from them (see ../src/api/commitments.ts) are
 * supplied to the contract's constructor. They are persisted locally so
 * that future administrative circuit calls (credential revocation, risk
 * assessment recording) can reuse the same identity a deployment
 * established, without ever being logged or committed to source control.
 */

import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DeploymentSecrets = {
  readonly adminSecret: Uint8Array;
  readonly oracleSecret: Uint8Array;
};

const contractRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const defaultSecretsDir = path.join(contractRoot, '.deployment-secrets');

const secretsFilePath = (baseDir: string, networkId: string, privateStateId: string): string =>
  path.join(baseDir, `${networkId}.${privateStateId}.json`);

const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');
const fromHex = (hex: string): Uint8Array => new Uint8Array(Buffer.from(hex, 'hex'));

/**
 * Loads previously generated admin/oracle secrets for this network and
 * private-state identifier, or generates and persists new ones if none
 * exist yet. The returned values are never logged by this function.
 *
 * @param baseDir Directory to store secrets under. Defaults to a
 *   `.deployment-secrets` directory alongside the contract package
 *   (gitignored); tests may supply an isolated directory instead.
 */
export const loadOrCreateDeploymentSecrets = (
  networkId: string,
  privateStateId: string,
  baseDir: string = defaultSecretsDir
): { readonly secrets: DeploymentSecrets; readonly isNew: boolean } => {
  const filePath = secretsFilePath(baseDir, networkId, privateStateId);

  if (existsSync(filePath)) {
    const stored = JSON.parse(readFileSync(filePath, 'utf8')) as {
      adminSecret: string;
      oracleSecret: string;
    };
    return {
      secrets: {
        adminSecret: fromHex(stored.adminSecret),
        oracleSecret: fromHex(stored.oracleSecret)
      },
      isNew: false
    };
  }

  const secrets: DeploymentSecrets = {
    adminSecret: new Uint8Array(randomBytes(32)),
    oracleSecret: new Uint8Array(randomBytes(32))
  };

  mkdirSync(baseDir, { recursive: true });
  writeFileSync(
    filePath,
    JSON.stringify({
      adminSecret: toHex(secrets.adminSecret),
      oracleSecret: toHex(secrets.oracleSecret)
    }),
    { mode: 0o600 }
  );
  // Restrict access on platforms where chmod at file-creation time is not
  // honored consistently; a no-op (and safe to ignore) on platforms that
  // don't support POSIX permission bits.
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Best-effort only - not all filesystems support this.
  }

  return { secrets, isNew: true };
};

export const deploymentSecretsDirectory = (): string => defaultSecretsDir;
