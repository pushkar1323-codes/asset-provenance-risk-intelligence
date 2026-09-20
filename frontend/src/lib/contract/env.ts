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
