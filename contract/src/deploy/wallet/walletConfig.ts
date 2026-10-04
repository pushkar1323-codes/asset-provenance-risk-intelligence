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

/**
 * Thrown when an endpoint variable is set but uses the wrong URL scheme for
 * the component that consumes it. Only the variable name and the scheme are
 * reported, never the full value.
 */
export class InvalidWalletConfigurationError extends Error {
  constructor(
    readonly variable: string,
    problem: string
  ) {
    super(`${variable} is invalid: ${problem}`);
    this.name = 'InvalidWalletConfigurationError';
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
 * Each endpoint is consumed by a different client, and each client needs a
 * specific scheme. Values are validated as written and never rewritten:
 *   - MIDNIGHT_INDEXER_URL     GraphQL over HTTP(S).
 *   - MIDNIGHT_INDEXER_WS_URL  GraphQL subscriptions over WS(S).
 *   - MIDNIGHT_RELAY_URL       The node's WebSocket endpoint: the Wallet
 *                              SDK hands it to a Polkadot WsProvider, which
 *                              accepts only ws:// or wss://. The node's
 *                              HTTP RPC address is a different endpoint and
 *                              is not accepted here.
 */
const ENDPOINT_RULES: ReadonlyArray<{
  readonly key: (typeof REQUIRED_NETWORK_KEYS)[number];
  readonly protocols: readonly string[];
  readonly example: string;
}> = [
  {
    key: 'MIDNIGHT_INDEXER_URL',
    protocols: ['http:', 'https:'],
    example: 'https://indexer.preprod.midnight.network/api/v4/graphql'
  },
  {
    key: 'MIDNIGHT_INDEXER_WS_URL',
    protocols: ['ws:', 'wss:'],
    example: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
  },
  {
    key: 'MIDNIGHT_RELAY_URL',
    protocols: ['ws:', 'wss:'],
    example: 'wss://rpc.preprod.midnight.network'
  }
];

const validateEndpoint = (rule: (typeof ENDPOINT_RULES)[number], value: string): void => {
  let protocol: string;
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new InvalidWalletConfigurationError(rule.key, `it is not a valid URL. Expected something like ${rule.example}.`);
  }
  if (!rule.protocols.includes(protocol)) {
    const allowed = rule.protocols.map((p) => `${p}//`).join(' or ');
    throw new InvalidWalletConfigurationError(
      rule.key,
      `it uses "${protocol}//" but this endpoint must start with ${allowed}. Expected something like ${rule.example}.`
    );
  }
};

/**
 * Loads the network side of the wallet configuration (indexer, relay,
 * optional proof server). Endpoint schemes are validated as written - see
 * `ENDPOINT_RULES` - and never rewritten. Does not read the wallet seed - see
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
  for (const rule of ENDPOINT_RULES) {
    validateEndpoint(rule, env[rule.key]!);
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
