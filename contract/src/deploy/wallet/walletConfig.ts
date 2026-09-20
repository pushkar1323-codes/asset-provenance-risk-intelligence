/**
 * Configuration for constructing a real Node wallet via the Wallet SDK.
 * Kept separate from ../config.ts (which the deployment runner's
 * non-wallet steps already depend on and have tests pinned against) since
 * this introduces genuinely new requirements: a local wallet seed and a
 * node/relay endpoint for transaction submission.
 */

export type WalletNetworkConfig = {
  readonly networkId: 'preprod';
  readonly indexerUrl: string;
  readonly indexerWsUrl: string;
  readonly relayUrl: string;
  /** Optional: if unset, the wallet proves transactions locally instead of using a server. */
  readonly proofServerUrl?: string;
};

export class MissingWalletConfigurationError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `Missing required environment variable(s) for the Node wallet: ${missing.join(', ')}. ` +
        'Set them in .env (see .env.example) to construct a real deployment wallet.'
    );
    this.name = 'MissingWalletConfigurationError';
  }
}

export class MissingWalletSeedError extends Error {
  constructor() {
    super(
      'DEPLOYMENT_WALLET_SEED_HEX is not set. This local-only environment variable must hold a ' +
        '64-character hex-encoded seed for the deployment wallet - see .env.example and the ' +
        'project README for how to generate one. It must never be committed or shared.'
    );
    this.name = 'MissingWalletSeedError';
  }
}

const REQUIRED_NETWORK_KEYS = [
  'MIDNIGHT_INDEXER_URL',
  'MIDNIGHT_INDEXER_WS_URL',
  'MIDNIGHT_RELAY_URL'
] as const;

/**
 * Loads the network side of the wallet configuration (indexer, relay,
 * optional proof server). Does not read the wallet seed - see
 * `loadWalletSeedHex` - so seed handling stays isolated from general
 * configuration validation.
 */
export const loadWalletNetworkConfig = (
  env: NodeJS.ProcessEnv = process.env
): WalletNetworkConfig => {
  const missing = REQUIRED_NETWORK_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new MissingWalletConfigurationError(missing);
  }

  return {
    networkId: 'preprod',
    indexerUrl: env.MIDNIGHT_INDEXER_URL!,
    indexerWsUrl: env.MIDNIGHT_INDEXER_WS_URL!,
    relayUrl: env.MIDNIGHT_RELAY_URL!,
    proofServerUrl: env.MIDNIGHT_PROOF_SERVER_URL || undefined
  };
};

/**
 * Reads the local wallet seed from the environment. Never logs the value;
 * only ever returns it to the caller or throws a description-only error.
 */
export const loadWalletSeedHex = (env: NodeJS.ProcessEnv = process.env): string => {
  const seed = env.DEPLOYMENT_WALLET_SEED_HEX;
  if (!seed) {
    throw new MissingWalletSeedError();
  }
  return seed;
};
