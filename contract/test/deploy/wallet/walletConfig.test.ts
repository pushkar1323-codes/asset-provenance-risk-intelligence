import { describe, expect, it } from 'vitest';
import {
  InvalidWalletConfigurationError,
  loadWalletNetworkConfig,
  loadWalletSeedHex,
  MissingWalletConfigurationError,
  MissingWalletSeedError
} from '../../../src/deploy/wallet/walletConfig.js';

const validEnv = (): NodeJS.ProcessEnv => ({
  MIDNIGHT_INDEXER_URL: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  MIDNIGHT_INDEXER_WS_URL: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  MIDNIGHT_RELAY_URL: 'wss://rpc.preprod.midnight.network',
  DEPLOYMENT_WALLET_SEED_HEX: 'a'.repeat(64)
});

describe('loadWalletNetworkConfig', () => {
  it('loads a valid configuration', () => {
    const config = loadWalletNetworkConfig(validEnv());
    expect(config.networkId).toBe('preprod');
    expect(config.relayUrl).toBe('wss://rpc.preprod.midnight.network');
    expect(config.proofServerUrl).toBeUndefined();
  });

  it('includes an optional proof server url when configured', () => {
    const config = loadWalletNetworkConfig({
      ...validEnv(),
      MIDNIGHT_PROOF_SERVER_URL: 'https://proof-server.preprod.midnight.network'
    });
    expect(config.proofServerUrl).toBe('https://proof-server.preprod.midnight.network');
  });

  it('rejects a configuration missing MIDNIGHT_RELAY_URL, naming it', () => {
    const env = validEnv();
    delete env.MIDNIGHT_RELAY_URL;
    try {
      loadWalletNetworkConfig(env);
      expect.fail('expected loadWalletNetworkConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingWalletConfigurationError);
      expect((error as Error).message).toContain('MIDNIGHT_RELAY_URL');
    }
  });

  it('rejects a configuration missing indexer variables', () => {
    const env = validEnv();
    delete env.MIDNIGHT_INDEXER_URL;
    delete env.MIDNIGHT_INDEXER_WS_URL;
    expect(() => loadWalletNetworkConfig(env)).toThrow(MissingWalletConfigurationError);
  });
});

describe('loadWalletSeedHex', () => {
  it('returns the configured seed value', () => {
    expect(loadWalletSeedHex(validEnv())).toBe('a'.repeat(64));
  });

  it('throws MissingWalletSeedError, without inventing a fallback, when unset', () => {
    const env = validEnv();
    delete env.DEPLOYMENT_WALLET_SEED_HEX;
    expect(() => loadWalletSeedHex(env)).toThrow(MissingWalletSeedError);
  });
});

describe('endpoint schemes', () => {
  it('keeps the GraphQL indexer endpoint on HTTP(S), exactly as configured', () => {
    const config = loadWalletNetworkConfig(validEnv());
    expect(config.indexerUrl).toBe('https://indexer.preprod.midnight.network/api/v4/graphql');
    expect(new URL(config.indexerUrl).protocol).toBe('https:');
  });

  it('keeps the GraphQL subscription endpoint on WS(S), exactly as configured', () => {
    const config = loadWalletNetworkConfig(validEnv());
    expect(config.indexerWsUrl).toBe('wss://indexer.preprod.midnight.network/api/v4/graphql/ws');
    expect(new URL(config.indexerWsUrl).protocol).toBe('wss:');
  });

  it('passes a WebSocket node endpoint through unchanged', () => {
    for (const relay of ['wss://rpc.preprod.midnight.network', 'ws://localhost:9944']) {
      const config = loadWalletNetworkConfig({ ...validEnv(), MIDNIGHT_RELAY_URL: relay });
      expect(config.relayUrl).toBe(relay);
    }
  });

  it('gives the Polkadot WsProvider a value it accepts, and shows it rejects the HTTP form', async () => {
    // The Wallet SDK builds `new WsProvider(relayURL.toString())`. WsProvider
    // checks the scheme in its constructor, so constructing it with
    // autoConnect disabled needs no connection.
    const { WsProvider } = await import('@polkadot/rpc-provider');
    const { relayUrl } = loadWalletNetworkConfig(validEnv());

    expect(() => new WsProvider(new URL(relayUrl).toString(), false)).not.toThrow();
    expect(() => new WsProvider(new URL('https://rpc.preprod.midnight.network').toString(), false)).toThrow(
      /Endpoint should start with/
    );
  });

  it('rejects an HTTP(S) node endpoint clearly, without rewriting it', () => {
    let error: unknown;
    try {
      loadWalletNetworkConfig({ ...validEnv(), MIDNIGHT_RELAY_URL: 'https://rpc.preprod.midnight.network/' });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidWalletConfigurationError);
    const message = (error as Error).message;
    expect(message).toContain('MIDNIGHT_RELAY_URL');
    expect(message).toContain('"https:');
    expect(message).toContain('ws:// or wss://');
    expect(message).toContain('wss://rpc.preprod.midnight.network');
  });

  it('rejects the wrong scheme on each endpoint, naming the variable', () => {
    const cases: Array<[string, string]> = [
      ['MIDNIGHT_INDEXER_URL', 'wss://indexer.preprod.midnight.network/api/v4/graphql'],
      ['MIDNIGHT_INDEXER_WS_URL', 'https://indexer.preprod.midnight.network/api/v4/graphql/ws'],
      ['MIDNIGHT_RELAY_URL', 'ftp://rpc.preprod.midnight.network']
    ];
    for (const [key, value] of cases) {
      expect(() => loadWalletNetworkConfig({ ...validEnv(), [key]: value })).toThrow(key);
    }
  });

  it('rejects values that are not URLs at all', () => {
    expect(() => loadWalletNetworkConfig({ ...validEnv(), MIDNIGHT_RELAY_URL: 'rpc.preprod.midnight.network' })).toThrow(
      /MIDNIGHT_RELAY_URL is invalid: it is not a valid URL/
    );
  });

  it('reports missing variables before checking schemes', () => {
    const env = { ...validEnv(), MIDNIGHT_RELAY_URL: '' };
    expect(() => loadWalletNetworkConfig(env)).toThrow(MissingWalletConfigurationError);
  });
});
