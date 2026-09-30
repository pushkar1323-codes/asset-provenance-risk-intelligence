/**
 * Reads build-time configuration from Vite's environment variables. Vite
 * only exposes variables prefixed with VITE_ to client code, and inlines
 * them at build time - nothing here is a runtime secret.
 */

export type AppEnvironment = {
  readonly networkId: string;
  readonly contractAddress: string;
  readonly zkConfigBaseUrl: string;
};

const requireEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new MissingEnvironmentError(key);
  }
  return value;
};

export class MissingEnvironmentError extends Error {
  constructor(key: string) {
    super(`Missing required environment variable: ${key}. Set it in your .env file.`);
    this.name = 'MissingEnvironmentError';
  }
}

/** Reads and validates the environment configuration this application needs. */
export const readAppEnvironment = (): AppEnvironment => ({
  networkId: requireEnv('VITE_MIDNIGHT_NETWORK_ID', import.meta.env.VITE_MIDNIGHT_NETWORK_ID),
  contractAddress: requireEnv(
    'VITE_ASSET_PASSPORT_CONTRACT_ADDRESS',
    import.meta.env.VITE_ASSET_PASSPORT_CONTRACT_ADDRESS
  ),
  zkConfigBaseUrl: requireEnv('VITE_ZK_CONFIG_BASE_URL', import.meta.env.VITE_ZK_CONFIG_BASE_URL)
});

/** Names of the build-time variables this application requires. */
export const REQUIRED_ENVIRONMENT_KEYS = [
  'VITE_MIDNIGHT_NETWORK_ID',
  'VITE_ASSET_PASSPORT_CONTRACT_ADDRESS',
  'VITE_ZK_CONFIG_BASE_URL'
] as const;

export type EnvironmentCheck =
  | { readonly configured: true; readonly environment: AppEnvironment; readonly missing: readonly [] }
  | { readonly configured: false; readonly environment: null; readonly missing: readonly string[] };

/**
 * Reports configuration status without throwing, listing every missing
 * variable rather than only the first. Intended for UI code that needs to
 * show a neutral "not configured" state and keep the details available for
 * developers.
 */
export const checkAppEnvironment = (
  env: Record<string, string | undefined> = import.meta.env
): EnvironmentCheck => {
  const missing = REQUIRED_ENVIRONMENT_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    return { configured: false, environment: null, missing };
  }
  return {
    configured: true,
    environment: {
      networkId: env.VITE_MIDNIGHT_NETWORK_ID as string,
      contractAddress: env.VITE_ASSET_PASSPORT_CONTRACT_ADDRESS as string,
      zkConfigBaseUrl: env.VITE_ZK_CONFIG_BASE_URL as string
    },
    missing: []
  };
};
