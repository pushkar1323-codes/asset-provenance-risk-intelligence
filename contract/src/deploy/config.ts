/**
 * Loads and validates the configuration the Preprod deployment runner
 * needs from environment variables, reusing the same variable names the
 * project's `.env.example` already documents.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path of the repository root. This file lives at
 * contract/src/deploy/config.ts, four path segments below the root, which
 * is where the canonical local .env lives. It is derived from this
 * module's own location, so it does not depend on the directory (or npm
 * workspace) the process was started from.
 */
export const repoRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');

/**
 * Resolves a configured file-system path. Relative paths are interpreted
 * relative to the repository root (the same base the documented .env
 * values use), never the process's current working directory. Absolute
 * paths are returned unchanged.
 */
export const resolveFromRepoRoot = (configuredPath: string, root: string = repoRoot): string =>
  path.isAbsolute(configuredPath) ? configuredPath : path.resolve(root, configuredPath);

export type DeploymentConfig = {
  readonly networkId: 'preprod';
  readonly zkConfigPath: string;
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly proofServerUrl: string;
  readonly privateStateAccountId: string;
  readonly privateStateId: string;
  readonly privateStoragePasswordProvider: () => string;
};

export class MissingConfigurationError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them in .env (see .env.example) before running the deployment runner.'
    );
    this.name = 'MissingConfigurationError';
  }
}

export class UnsupportedNetworkError extends Error {
  constructor(actual: string | undefined) {
    super(
      `MIDNIGHT_NETWORK must be set to "preprod" to use this runner, got ${
        actual ? `"${actual}"` : '(unset)'
      }.`
    );
    this.name = 'UnsupportedNetworkError';
  }
}

const REQUIRED_KEYS = [
  'ZK_CONFIG_PATH',
  'MIDNIGHT_INDEXER_URL',
  'MIDNIGHT_INDEXER_WS_URL',
  'MIDNIGHT_PROOF_SERVER_URL',
  'PRIVATE_STATE_ACCOUNT_ID',
  'PRIVATE_STATE_STORAGE_PASSWORD'
] as const;

/**
 * Loads deployment configuration from the given environment (defaults to
 * `process.env`). A relative `ZK_CONFIG_PATH` is resolved against
 * `root` (the repository root by default). Throws `UnsupportedNetworkError` if `MIDNIGHT_NETWORK` is
 * not exactly `"preprod"`, and `MissingConfigurationError` listing every
 * missing required variable otherwise. Never logs any value it reads.
 */
export const loadDeploymentConfig = (
  env: NodeJS.ProcessEnv = process.env,
  root: string = repoRoot
): DeploymentConfig => {
  if (env.MIDNIGHT_NETWORK !== 'preprod') {
    throw new UnsupportedNetworkError(env.MIDNIGHT_NETWORK);
  }

  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new MissingConfigurationError(missing);
  }

  return {
    networkId: 'preprod',
    zkConfigPath: resolveFromRepoRoot(env.ZK_CONFIG_PATH!, root),
    indexerUrl: env.MIDNIGHT_INDEXER_URL!,
    indexerWsUrl: env.MIDNIGHT_INDEXER_WS_URL!,
    proofServerUrl: env.MIDNIGHT_PROOF_SERVER_URL!,
    privateStateAccountId: env.PRIVATE_STATE_ACCOUNT_ID!,
    privateStateId: env.PRIVATE_STATE_ID || 'asset-passport',
    privateStoragePasswordProvider: () => env.PRIVATE_STATE_STORAGE_PASSWORD!
  };
};
