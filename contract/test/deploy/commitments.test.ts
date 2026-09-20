/**
 * Proves that the commitments this deployment runner derives outside the
 * circuit are byte-identical to what the compiled contract itself expects
 * from `adminPublicKey`/`oraclePublicKey` - by actually deploying a
 * simulated contract instance with these commitments and exercising an
 * admin-gated circuit with the matching secret.
 */

import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { deriveAdminPublicKey, deriveOraclePublicKey } from '../../src/api/commitments.js';
import { AssetPassportSimulator } from '../simulator.js';
import { createAssetPassportPrivateState } from '../../src/witnesses.js';

const randomBytes32 = (): Uint8Array => new Uint8Array(randomBytes(32));
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

describe('deployment commitment derivation', () => {
  it('produces an admin commitment the compiled contract accepts for revokeCredential', () => {
    const adminSecret = randomBytes32();
    const oracleSecret = randomBytes32();
    const adminKey = deriveAdminPublicKey(adminSecret);
    const oracleKey = deriveOraclePublicKey(oracleSecret);

    const assetId = randomBytes32();
    const ownerSecret = randomBytes32();
    const credentialId = randomBytes32();
    const credentialSecret = randomBytes32();

    const sim = new AssetPassportSimulator(
      adminKey,
      oracleKey,
      createAssetPassportPrivateState({
        ownerSecretKeys: { [toHex(assetId)]: ownerSecret },
        credentialSecrets: { [toHex(credentialId)]: credentialSecret },
        adminSecretKey: adminSecret
      })
    );

    sim.registerAsset(assetId, 1n, 1_700_000_000n);
    sim.addCredential(assetId, credentialId, 1n, randomBytes32(), 1_700_000_100n);

    // This only succeeds if the contract's own adminPublicKey(adminSecret)
    // recomputation equals the adminKey supplied at deployment - proving
    // the runner's derivation is the same function the contract uses.
    sim.revokeCredential(credentialId);

    const record = sim.getLedger().credentials.lookup(credentialId);
    expect(record.status).toBe(2); // REVOKED
  });

  it('produces an oracle commitment the compiled contract accepts for recordRiskAssessment', () => {
    const adminSecret = randomBytes32();
    const oracleSecret = randomBytes32();
    const adminKey = deriveAdminPublicKey(adminSecret);
    const oracleKey = deriveOraclePublicKey(oracleSecret);

    const assetId = randomBytes32();
    const ownerSecret = randomBytes32();

    const sim = new AssetPassportSimulator(
      adminKey,
      oracleKey,
      createAssetPassportPrivateState({
        ownerSecretKeys: { [toHex(assetId)]: ownerSecret },
        oracleSecretKey: oracleSecret
      })
    );

    sim.registerAsset(assetId, 1n, 1_700_000_000n);
    sim.recordRiskAssessment(assetId, randomBytes32(), 2n, 1_700_000_300n);

    const record = sim.getLedger().riskAssessments.lookup(assetId);
    expect(record.riskTier).toBe(2n);
  });

  it('rejects a commitment derived from the wrong secret', () => {
    const adminSecret = randomBytes32();
    const wrongSecret = randomBytes32();
    const oracleSecret = randomBytes32();
    const adminKey = deriveAdminPublicKey(adminSecret);
    const oracleKey = deriveOraclePublicKey(oracleSecret);

    const credentialId = randomBytes32();
    const assetId = randomBytes32();
    const ownerSecret = randomBytes32();

    const sim = new AssetPassportSimulator(
      adminKey,
      oracleKey,
      createAssetPassportPrivateState({
        ownerSecretKeys: { [toHex(assetId)]: ownerSecret },
        credentialSecrets: { [toHex(credentialId)]: randomBytes32() },
        adminSecretKey: wrongSecret
      })
    );

    sim.registerAsset(assetId, 1n, 1_700_000_000n);
    sim.addCredential(assetId, credentialId, 1n, randomBytes32(), 1_700_000_100n);

    expect(() => sim.revokeCredential(credentialId)).toThrow();
  });
});
