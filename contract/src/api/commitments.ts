/**
 * Derives the public-key-style commitments the Asset Passport contract's
 * constructor expects for its administrator and risk-oracle roles.
 *
 * This must produce byte-identical output to the contract's own
 * `adminPublicKey`/`oraclePublicKey` circuits (domain-separated
 * persistentHash over a 32-byte padded tag and the secret key), since the
 * contract later recomputes the same hash from a supplied secret to
 * authorize administrative circuits. If this derivation ever drifted from
 * the contract's, a deployment's stored commitment could never be proven
 * against again.
 */

import {
  CompactTypeBytes,
  CompactTypeVector,
  persistentHash
} from '@midnight-ntwrk/compact-runtime';

const BYTES_32 = new CompactTypeBytes(32);
const DOMAIN_AND_SECRET = new CompactTypeVector(2, BYTES_32);

export const ADMIN_DOMAIN = 'avp:admin:v1:';
export const ORACLE_DOMAIN = 'avp:oracle:v1:';

const padDomain = (domain: string): Uint8Array => {
  const encoded = new TextEncoder().encode(domain);
  if (encoded.length > 32) {
    throw new Error(`Domain exceeds 32 bytes: ${domain}`);
  }
  const padded = new Uint8Array(32);
  padded.set(encoded);
  return padded;
};

/** Derives a domain-separated public-key-style commitment from a secret key. */
export const derivePublicKey = (domain: string, secretKey: Uint8Array): Uint8Array =>
  persistentHash(DOMAIN_AND_SECRET, [padDomain(domain), secretKey]);

export const deriveAdminPublicKey = (adminSecret: Uint8Array): Uint8Array =>
  derivePublicKey(ADMIN_DOMAIN, adminSecret);

export const deriveOraclePublicKey = (oracleSecret: Uint8Array): Uint8Array =>
  derivePublicKey(ORACLE_DOMAIN, oracleSecret);
