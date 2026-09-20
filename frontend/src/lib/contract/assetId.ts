/**
 * The Asset Passport contract identifies assets by a 32-byte value
 * (Bytes<32>), not by free text. This derives that value from a
 * human-readable identifier (e.g. a VIN) the user enters, using SHA-256.
 * The identifier itself is not sensitive information - the contract's
 * privacy protections apply to ownership, credentials, and provenance
 * data, not to the identifier used to look an asset up.
 */
export const deriveAssetId = async (identifier: string): Promise<Uint8Array> => {
  const bytes = new TextEncoder().encode(identifier.trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
};

export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
