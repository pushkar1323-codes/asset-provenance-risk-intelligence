import { describe, expect, it, vi } from 'vitest';

const connectNodeWalletFacade = vi.fn();

vi.mock('../../../src/deploy/wallet/facade.js', () => ({
  connectNodeWalletFacade: (...args: unknown[]) => connectNodeWalletFacade(...args)
}));

const { createNodeWalletProviders } = await import('../../../src/deploy/wallet/index.js');
const { MissingWalletSeedError, MissingWalletConfigurationError } = await import(
  '../../../src/deploy/wallet/walletConfig.js'
);

const validEnv = (): NodeJS.ProcessEnv => ({
  MIDNIGHT_INDEXER_URL: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  MIDNIGHT_INDEXER_WS_URL: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  MIDNIGHT_RELAY_URL: 'https://relay.preprod.midnight.network',
  DEPLOYMENT_WALLET_SEED_HEX: 'a'.repeat(64)
});

describe('createNodeWalletProviders', () => {
  it('fails clearly when the wallet seed is not configured, without attempting a connection', async () => {
    const env = validEnv();
    delete env.DEPLOYMENT_WALLET_SEED_HEX;

    await expect(createNodeWalletProviders(env)).rejects.toBeInstanceOf(MissingWalletSeedError);
    expect(connectNodeWalletFacade).not.toHaveBeenCalled();
  });

  it('fails clearly when required network configuration is missing, without attempting a connection', async () => {
    const env = validEnv();
    delete env.MIDNIGHT_RELAY_URL;

    await expect(createNodeWalletProviders(env)).rejects.toBeInstanceOf(MissingWalletConfigurationError);
    expect(connectNodeWalletFacade).not.toHaveBeenCalled();
  });

  it('rejects a malformed seed before attempting any network connection', async () => {
    const env = { ...validEnv(), DEPLOYMENT_WALLET_SEED_HEX: 'not-valid-hex' };

    await expect(createNodeWalletProviders(env)).rejects.toThrow(/64 hexadecimal characters/);
    expect(connectNodeWalletFacade).not.toHaveBeenCalled();
  });

  it('never includes the raw seed value in a thrown error message', async () => {
    const env = validEnv();
    delete env.DEPLOYMENT_WALLET_SEED_HEX;

    try {
      await createNodeWalletProviders(env);
      expect.fail('expected createNodeWalletProviders to throw');
    } catch (error) {
      expect((error as Error).message).not.toContain('a'.repeat(64));
    }
  });
});
