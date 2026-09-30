/**
 * Shared privacy wording, so the registration review, the privacy page and
 * the overview describe the same behaviour in the same terms. Everything
 * here describes what the current contract and application actually do.
 */

export type VisibilityKind = 'public' | 'private' | 'proven';

export const VISIBILITY_TERMS: Record<VisibilityKind, { label: string; definition: string }> = {
  public: { label: 'Public', definition: 'Information visible on the ledger.' },
  private: {
    label: 'Private',
    definition: "Information kept on the user's device, or private witness material."
  },
  proven: {
    label: 'Proven',
    definition:
      'Information whose required property is verified without revealing the underlying private value.'
  }
};

export type DisclosureItem = { readonly title: string; readonly detail: string };

/** What registering an asset makes public, keeps private, and proves. */
export const REGISTRATION_DISCLOSURE: Record<VisibilityKind, readonly DisclosureItem[]> = {
  public: [
    {
      title: 'Identifier hash (SHA-256)',
      detail:
        'This is the asset id on the ledger. It is not confidential: anyone who already knows an identifier can hash it and compare.'
    },
    { title: 'Asset category', detail: 'The category you select.' },
    {
      title: 'Registration time',
      detail: 'A timestamp supplied by this application when it submits the registration.'
    },
    { title: 'Status', detail: 'Whether the asset is active or retired.' },
    {
      title: 'Ownership commitment',
      detail:
        'A hash derived from the asset id and your ownership key. It does not reveal the key.'
    }
  ],
  private: [
    {
      title: 'Your ownership key',
      detail:
        'Generated in this browser and kept in browser-local private state. It is not sent to the network.'
    },
    {
      title: 'The identifier text you type',
      detail: 'Only its hash is submitted; the text itself is not written to the ledger.'
    }
  ],
  proven: [
    {
      title: 'Ownership-key knowledge',
      detail:
        'A zero-knowledge proof shows the recorded ownership commitment was derived from a private key you hold, without revealing that key.'
    }
  ]
};

export const IDENTIFIER_LIMITATION =
  'Hashing the identifier does not make it secret. If someone already knows a VIN or other identifier, they can compute its SHA-256 hash and check whether that asset is registered.';

export const KEY_HANDLING_NOTE =
  "The ownership key is generated in your browser and kept in this browser's local app storage, managed by the Midnight.js private-state provider. The app currently protects that store with a fixed built-in password, which is not a secret, so do not treat it as protected against anyone with access to your browser profile. There is no backup or export yet: if this browser's data is cleared, this app can no longer prove ownership of the asset.";

export const REGISTRATION_LIMITATION =
  'Registration is a claim, not a verification. The contract does not check real-world ownership of a vehicle; the first valid registration for an identifier is the one recorded.';
