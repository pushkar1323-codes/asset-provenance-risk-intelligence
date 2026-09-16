/**
 * Tests for the Asset Passport contract.
 *
 * These tests exercise the actual product contract (asset-passport.compact)
 * through the generated Compact contract module, via the simulator in
 * ./simulator.ts. They require the contract to have been compiled locally
 * first (`npm run contract:compile`), which produces the `../managed/`
 * artifacts these tests import. See the project README for setup and the
 * "Verification status" note there for what has and has not been executed.
 */

import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CompactTypeBytes,
  CompactTypeVector,
  persistentHash
} from '@midnight-ntwrk/compact-runtime';
import { AssetPassportSimulator } from './simulator.js';
import {
  createAssetPassportPrivateState,
  type AssetPassportPrivateState
} from '../src/witnesses.js';

const randomBytes32 = (): Uint8Array => new Uint8Array(randomBytes(32));

/** Builds a private state pre-populated with the given secret for the given key. */
const withOwnerSecret = (
  assetIdHex: string,
  secretKey: Uint8Array,
  base: Partial<AssetPassportPrivateState> = {}
): AssetPassportPrivateState =>
  createAssetPassportPrivateState({
    ...base,
    ownerSecretKeys: {
      ...(base.ownerSecretKeys ?? {}),
      [assetIdHex]: secretKey
    }
  });

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const BYTES_32 = new CompactTypeBytes(32);
const DOMAIN_AND_SECRET = new CompactTypeVector(2, BYTES_32);

function padDomain(domain: string): Uint8Array {
  const encoded = new TextEncoder().encode(domain);

  if (encoded.length > 32) {
    throw new Error(`Domain exceeds 32 bytes: ${domain}`);
  }

  const padded = new Uint8Array(32);
  padded.set(encoded);

  return padded;
}

function derivePublicKey(
  domain: string,
  secretKey: Uint8Array
): Uint8Array {
  return persistentHash(DOMAIN_AND_SECRET, [
    padDomain(domain),
    secretKey
  ]);
}

describe('Asset Passport contract', () => {
  const adminSecret = randomBytes32();
  const oracleSecret = randomBytes32();

  // These commitments match the derivation used by the contract's
  // adminPublicKey and oraclePublicKey circuits.
  const adminKey = derivePublicKey('avp:admin:v1:', adminSecret);
  const oracleKey = derivePublicKey('avp:oracle:v1:', oracleSecret);

  function deploy(privateState?: AssetPassportPrivateState) {
    return new AssetPassportSimulator(
      adminKey,
      oracleKey,
      privateState ??
        createAssetPassportPrivateState({
          adminSecretKey: adminSecret,
          oracleSecretKey: oracleSecret
        })
    );
  }

  // ---------------------------------------------------------------------
  // Circuit logic: asset registration
  // ---------------------------------------------------------------------
  describe('registerAsset', () => {
    it('registers a new asset and stores only a commitment for the owner', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const sim = deploy(withOwnerSecret(toHex(assetId), ownerSecret));

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      const ledger = sim.getLedger();
      expect(ledger.assets.member(assetId)).toBe(true);

      const record = ledger.assets.lookup(assetId);
      expect(record.status).toBeDefined();
      expect(record.assetCategory).toBe(1n);
      expect(record.registeredAt).toBe(1_700_000_000n);

      // The owner's secret key must never appear in public ledger state.
      expect(record.ownerCommitment).not.toEqual(ownerSecret);
      expect(ledger.assetCount).toBe(1n);
    });

    it('rejects registering the same asset id twice', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const sim = deploy(withOwnerSecret(toHex(assetId), ownerSecret));

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      expect(() =>
        sim.registerAsset(assetId, 1n, 1_700_000_001n)
      ).toThrow(/already registered/i);
    });
  });

  // ---------------------------------------------------------------------
  // State transitions: ownership transfer and retirement
  // ---------------------------------------------------------------------
  describe('ownership and lifecycle', () => {
    it('transfers ownership when the current owner proves control', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const sim = deploy(withOwnerSecret(toHex(assetId), ownerSecret));

      sim.registerAsset(assetId, 2n, 1_700_000_000n);

      const before = sim.getLedger().assets.lookup(assetId);
      const newOwnerCommitment = randomBytes32();

      sim.transferOwnership(assetId, newOwnerCommitment);

      const after = sim.getLedger().assets.lookup(assetId);

      expect(after.ownerCommitment).toEqual(newOwnerCommitment);
      expect(after.ownerCommitment).not.toEqual(before.ownerCommitment);
    });

    it('rejects a transfer from someone who does not hold the owner secret', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const attackerSecret = randomBytes32();
      const sim = deploy(withOwnerSecret(toHex(assetId), ownerSecret));

      sim.registerAsset(assetId, 2n, 1_700_000_000n);

      // An attacker who does not know the real owner secret substitutes
      // their own secret for the same asset id in the private state.
      sim.getPrivateState().ownerSecretKeys[toHex(assetId)] = attackerSecret;

      expect(() =>
        sim.transferOwnership(assetId, randomBytes32())
      ).toThrow(/only the current owner/i);
    });

    it('retires an active asset and blocks further transfers', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const sim = deploy(withOwnerSecret(toHex(assetId), ownerSecret));

      sim.registerAsset(assetId, 3n, 1_700_000_000n);

      sim.retireAsset(assetId);

      const record = sim.getLedger().assets.lookup(assetId);
      expect(record.status).not.toBe(0); // no longer ACTIVE (0)

      expect(() =>
        sim.transferOwnership(assetId, randomBytes32())
      ).toThrow(/not active/i);
    });
  });

  // ---------------------------------------------------------------------
  // Confidential credentials
  // ---------------------------------------------------------------------
  describe('confidential credentials', () => {
    it('adds and verifies a credential without exposing its private contents', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const credentialId = randomBytes32();
      const credentialSecret = randomBytes32();

      const sim = deploy(
        createAssetPassportPrivateState({
          ownerSecretKeys: {
            [toHex(assetId)]: ownerSecret
          },
          credentialSecrets: {
            [toHex(credentialId)]: credentialSecret
          }
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      sim.addCredential(
        assetId,
        credentialId,
        1n,
        randomBytes32(),
        1_700_000_100n
      );

      let record = sim.getLedger().credentials.lookup(credentialId);

      expect(record.status).toBe(0); // PENDING

      // Only a commitment is stored - never the raw credential secret.
      expect(record.credentialCommitment).not.toEqual(credentialSecret);

      sim.verifyCredential(credentialId);

      record = sim.getLedger().credentials.lookup(credentialId);
      expect(record.status).toBe(1); // VERIFIED
    });

    it('rejects verification when the proof does not match the stored commitment', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const credentialId = randomBytes32();
      const credentialSecret = randomBytes32();
      const wrongSecret = randomBytes32();

      const sim = deploy(
        createAssetPassportPrivateState({
          ownerSecretKeys: {
            [toHex(assetId)]: ownerSecret
          },
          credentialSecrets: {
            [toHex(credentialId)]: credentialSecret
          }
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      sim.addCredential(
        assetId,
        credentialId,
        1n,
        randomBytes32(),
        1_700_000_100n
      );

      // Swap in a different secret for the same credential id before verifying.
      sim.getPrivateState().credentialSecrets[toHex(credentialId)] = wrongSecret;

      expect(() =>
        sim.verifyCredential(credentialId)
      ).toThrow(/does not match/i);
    });

    it('allows the protocol administrator to revoke a credential', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const credentialId = randomBytes32();
      const credentialSecret = randomBytes32();

      const sim = deploy(
        createAssetPassportPrivateState({
          ownerSecretKeys: {
            [toHex(assetId)]: ownerSecret
          },
          credentialSecrets: {
            [toHex(credentialId)]: credentialSecret
          },
          adminSecretKey: adminSecret,
          oracleSecretKey: oracleSecret
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      sim.addCredential(
        assetId,
        credentialId,
        1n,
        randomBytes32(),
        1_700_000_100n
      );

      sim.revokeCredential(credentialId);

      const record = sim.getLedger().credentials.lookup(credentialId);
      expect(record.status).toBe(2); // REVOKED
    });

    it('rejects revocation from a caller without the administrator key', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const credentialId = randomBytes32();
      const credentialSecret = randomBytes32();

      const sim = deploy(
        createAssetPassportPrivateState({
          ownerSecretKeys: {
            [toHex(assetId)]: ownerSecret
          },
          credentialSecrets: {
            [toHex(credentialId)]: credentialSecret
          }
          // No adminSecretKey provided.
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      sim.addCredential(
        assetId,
        credentialId,
        1n,
        randomBytes32(),
        1_700_000_100n
      );

      expect(() =>
        sim.revokeCredential(credentialId)
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------
  // Provenance events
  // ---------------------------------------------------------------------
  describe('provenance events', () => {
    it('records a provenance event and increments the per-asset count', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();
      const eventId = randomBytes32();
      const eventSecret = randomBytes32();

      const sim = deploy(
        createAssetPassportPrivateState({
          ownerSecretKeys: {
            [toHex(assetId)]: ownerSecret
          },
          provenanceSecrets: {
            [toHex(eventId)]: eventSecret
          }
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      sim.addProvenanceEvent(
        assetId,
        eventId,
        1n,
        1_700_000_200n
      );

      const ledger = sim.getLedger();

      expect(ledger.provenance.member(eventId)).toBe(true);
      expect(ledger.provenanceCountByAsset.lookup(assetId)).toBe(1n);

      const record = ledger.provenance.lookup(eventId);
      expect(record.eventCommitment).not.toEqual(eventSecret);
    });
  });

  // ---------------------------------------------------------------------
  // Risk-assessment reference
  // ---------------------------------------------------------------------
  describe('risk-assessment reference', () => {
    it('lets the authorized oracle record a risk-assessment commitment', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();

      const sim = deploy(
        withOwnerSecret(toHex(assetId), ownerSecret, {
          adminSecretKey: adminSecret,
          oracleSecretKey: oracleSecret
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      const riskCommitment = randomBytes32();

      sim.recordRiskAssessment(
        assetId,
        riskCommitment,
        2n,
        1_700_000_300n
      );

      const record = sim.getLedger().riskAssessments.lookup(assetId);

      expect(record.riskCommitment).toEqual(riskCommitment);
      expect(record.riskTier).toBe(2n);
    });

    it('rejects a risk assessment from a caller without the oracle key', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();

      const sim = deploy(
        withOwnerSecret(toHex(assetId), ownerSecret)
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      expect(() =>
        sim.recordRiskAssessment(
          assetId,
          randomBytes32(),
          2n,
          1_700_000_300n
        )
      ).toThrow();
    });

    it('rejects a risk tier outside the allowed range', () => {
      const assetId = randomBytes32();
      const ownerSecret = randomBytes32();

      const sim = deploy(
        withOwnerSecret(toHex(assetId), ownerSecret, {
          adminSecretKey: adminSecret,
          oracleSecretKey: oracleSecret
        })
      );

      sim.registerAsset(assetId, 1n, 1_700_000_000n);

      expect(() =>
        sim.recordRiskAssessment(
          assetId,
          randomBytes32(),
          9n,
          1_700_000_300n
        )
      ).toThrow(/out of range/i);
    });
  });
});