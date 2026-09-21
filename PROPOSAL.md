# Product Proposal

## What is the product, and who uses it?

The Asset Provenance & Risk Intelligence Protocol is a privacy-preserving
**vehicle asset passport** built on Midnight. It gives a vehicle a single
on-chain identity that can accumulate ownership history, confidential
credentials, and provenance events over its lifetime, while keeping the
sensitive material behind those facts off the public ledger.

The initial vertical implemented in this repository covers:

- **Registration** — an asset is registered under a private ownership
  commitment, with a disclosed category, registration time, and lifecycle
  status (`registerAsset`).
- **Ownership transfer and retirement** — the current owner proves
  knowledge of their private key to transfer or retire an asset, without
  either party's key ever being submitted to the contract
  (`transferOwnership`, `retireAsset`).
- **Confidential credentials** — service, inspection, or compliance
  records are attached as commitments and later proven valid without
  revealing the underlying document (`addCredential`, `verifyCredential`,
  `revokeCredential`).
- **Provenance events** — history such as an accident, repair, or change
  of use is recorded as a commitment tied to the asset, without exposing
  the private detail behind it (`addProvenanceEvent`).
- **A risk-assessment reference** — an authorized oracle role publishes a
  coarse, disclosed risk tier and a commitment referencing a fuller
  off-chain risk assessment, without that assessment process ever running
  on-chain or gaining authority over contract state (`recordRiskAssessment`).

**Target users** are the three roles the contract already encodes:

- **Vehicle owners**, who register assets, manage credentials and
  provenance events, and transfer ownership.
- **Counterparties relying on an asset's history** — a prospective buyer,
  insurer, lender, or inspector — who can verify that an asset's
  ownership, credentials, and provenance are consistent and properly
  authorized, without needing to see the underlying documents or personal
  data.
- **The protocol administrator and risk oracle**, two authorized
  protocol-level roles (held as public-key-style commitments, `admin` and
  `oracle` on the ledger) responsible respectively for administrative
  actions such as credential revocation, and for publishing risk-tier
  references produced by an off-chain analysis process.

The off-chain risk-intelligence service itself (the analysis that would
produce the data behind `recordRiskAssessment`) is **not implemented** in
this repository yet; only the on-chain reference mechanism for it exists
today. The web application currently exercises one circuit
(`registerAsset`) end to end against a real wallet connection; the
remaining circuits are implemented and tested in the contract layer but
not yet wired into the UI (see "Mainnet Feasibility" below).

## Why Midnight specifically?

This product's core requirement is that multiple independent parties —
an owner, a prospective buyer, an insurer, an administrator, a risk
oracle — need to agree on facts about an asset (who owns it, whether a
credential is valid, what its risk tier is) without any of them having to
disclose the private material those facts are based on. That requirement
maps directly onto capabilities Midnight provides at the language and
runtime level, which a transparent ledger does not:

- **Witnesses keep private data off-chain by construction.** Every
  secret this contract depends on — the owner's key
  (`ownerSecretKey`), a credential's preimage (`credentialSecret`), a
  provenance event's preimage (`provenanceSecret`), and the admin/oracle
  authorization keys — is declared as a `witness` in
  `asset-passport.compact` and supplied by a function that runs on the
  caller's own machine (`contract/src/witnesses.ts`). Compact's witness
  model means this data structurally never becomes part of a transaction
  payload; on a transparent chain, the same guarantee would require
  building and trusting a separate off-chain proving system bolted onto
  the contract, rather than having it be how the contract language works.
- **`disclose()` makes public exposure an explicit, auditable opt-in.**
  Every value that reaches the public ledger in this contract — the
  asset id, `AssetRecord`, `CredentialRecord`, `ProvenanceRecord`,
  `RiskRecord`, and the `admin`/`oracle` commitments — passes through an
  explicit `disclose()` call at the point it is written. Reviewing the
  contract source is sufficient to enumerate exactly what becomes public;
  nothing is public by default the way ledger state is on a transparent
  chain.
- **Commitments let the contract verify facts about secrets it never
  sees.** Ownership, credential validity, and admin/oracle authorization
  are all enforced by recomputing a `persistentHash` commitment from a
  witness-supplied secret and comparing it to a stored value (e.g.
  `ownerCommitment`, `adminPublicKey`, `oraclePublicKey` in
  `asset-passport.compact`) — for example, `transferOwnership` and
  `addCredential` both assert that the caller's recomputed
  `ownerCommitment` matches the one already on the ledger before allowing
  the action. This is the zero-knowledge proof role Midnight's proof
  server performs locally: the contract enforces "the caller knows the
  secret behind this commitment" as a provable statement, without that
  secret ever being transmitted or logged anywhere.
- **Roles are commitments, not addresses.** The `admin` and `oracle`
  ledger values are hashes of a secret key (`adminPublicKey`,
  `oraclePublicKey`), not wallet addresses or identities, so authorizing
  an action reveals only that the caller holds the matching key — not who
  that party is.
- **The architecture keeps AI/off-chain analysis strictly subordinate to
  on-chain proof.** `recordRiskAssessment` only accepts a commitment and a
  bounded risk tier (`riskTier <= 4`) from the authorized oracle key; the
  circuit has no way to read or influence any other contract state. This
  reflects a deliberate design boundary — Midnight is the sole authority
  over asset, ownership, credential, and provenance state; an off-chain
  analysis process can publish a referenced conclusion but can never
  fabricate credentials, alter ownership, or override contract state.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| Admin authorization commitment (`admin`) | Public ledger (commitment only) | Everyone |
| Risk oracle authorization commitment (`oracle`) | Public ledger (commitment only) | Everyone |
| Registered asset count (`assetCount`) | Public ledger | Everyone |
| Asset category, registration time, lifecycle status (`AssetRecord.assetCategory` / `.registeredAt` / `.status`) | Public ledger | Everyone |
| Current owner commitment (`AssetRecord.ownerCommitment`) | Public ledger (hash of owner's secret key, not the key itself) | Everyone |
| Credential type, issuer commitment, credential commitment, status, added time (`CredentialRecord`) | Public ledger (commitment for the credential itself; contents excluded) | Everyone |
| Credential count per asset (`credentialCountByAsset`) | Public ledger | Everyone |
| Provenance event type, event commitment, recorded time (`ProvenanceRecord`) | Public ledger (commitment for the event; contents excluded) | Everyone |
| Provenance event count per asset (`provenanceCountByAsset`) | Public ledger | Everyone |
| Risk tier, risk commitment, assessed time (`RiskRecord`) | Public ledger (coarse tier and commitment only) | Everyone |
| Owner's private key material (`ownerSecretKey` witness) | Private witness | No one |
| Credential document / preimage material behind `credentialCommitment` (`credentialSecret` witness) | Private witness | No one |
| Provenance event's private detail / preimage material behind `eventCommitment` (`provenanceSecret` witness) | Private witness | No one |
| Protocol administrator's private authorization key (`adminSecretKey` witness) | Private witness | No one |
| Risk oracle's private authorization key (`oracleSecretKey` witness) | Private witness | No one |
| Proof of current ownership (checked in `transferOwnership`, `retireAsset`, `addCredential`, `addProvenanceEvent`) | Proven on-chain, not stored | Verifier learns only that the check passed |
| Proof that a credential's private material matches its stored commitment (`verifyCredential`) | Proven on-chain, not stored | Verifier learns only that the check passed |
| Full off-chain risk-assessment detail behind `riskCommitment` | Off-chain only — not submitted to the contract in any form (no risk-detail witness exists; only the commitment and tier are ever disclosed) | Not applicable — never reaches the contract or the ledger |

No fields beyond what is declared in `asset-passport.compact` and
`contract/src/witnesses.ts` are listed above.

## Mainnet Feasibility

**Already implemented and locally verified:**

- The Compact contract (8 circuits: `registerAsset`, `transferOwnership`,
  `retireAsset`, `addCredential`, `verifyCredential`, `revokeCredential`,
  `addProvenanceEvent`, `recordRiskAssessment`) compiles successfully,
  producing prover/verifier keys and zkir for every circuit.
- `npm run contract:test` passes 63/63 (contract behavior, integration-layer
  wiring, deployment-runner, and Node wallet tests); `npm run frontend:test`
  passes 24/24; both workspaces typecheck cleanly against the real
  installed Midnight.js, Wallet SDK, and DApp Connector API packages;
  `npm run frontend:build` produces a real production bundle.
- The full Midnight.js integration layer, a Preprod deployment runner
  with local secret generation and configuration validation, and a real
  Node wallet integration (HD key derivation, `WalletFacade`, a
  `WalletProvider`/`MidnightProvider` adapter with no serialization gap)
  are implemented and exercised locally, including a genuine attempted
  sync connection to the Preprod indexer (which failed only because this
  development environment has no network route to Midnight's Preprod
  infrastructure — not a code defect).
- The frontend connects a browser wallet and exercises one real contract
  operation, `registerAsset`, end to end against the typed API.

**Still needs to be completed (not yet done, not blocked on external
infrastructure):**

- Wiring the remaining implemented circuits (`transferOwnership`,
  `retireAsset`, `addCredential`, `verifyCredential`, `revokeCredential`,
  `addProvenanceEvent`, `recordRiskAssessment`) into the web application;
  only `registerAsset` is currently exposed in the UI.
- Resolving `WalletProviderAdapter.balanceTx`/`.submitTx`
  (`frontend/src/lib/wallet/walletProviderAdapter.ts`): the Midnight
  DApp Connector API does not specify the wire encoding between this
  project's transaction types and a connected browser wallet's
  string-based format, so both methods currently throw a clearly labeled
  error rather than guess. This is specific to the browser wallet path —
  the Node wallet integration does not have this gap.
- The off-chain risk-intelligence service itself (the analysis that would
  produce the data behind `recordRiskAssessment`) — not implemented in
  this repository; only the on-chain reference mechanism exists.
- An explicit mobile-responsive and zero-console-error verification pass
  on the frontend.

**Requires Preprod verification (cannot be confirmed from this
environment):**

- An actual contract deployment to Preprod — none has occurred; no
  contract address exists, and the README's "Contract Address" section
  is intentionally unfilled.
- A full `registerAsset` submission against a live network.
- The Node wallet's real connection, sync, balancing, and submission
  against live Preprod infrastructure with a funded wallet — blocked
  both by the lack of a network route from this development environment
  and by the deployment wallet not yet holding real Preprod funds.
- Connecting a real browser wallet extension and confirming connection,
  address display, and network-mismatch handling behave as expected
  against that wallet.
- Running the CI workflow (`.github/workflows/ci.yml`) on real GitHub
  Actions infrastructure — it is structurally valid but has never been
  pushed or executed there.
- Per earlier project notes (not independently re-verified this
  session): DUST was reported as still maturing on Preprod at the time,
  which would need reconfirming before relying on it for deployment fees.

**Would be required before a production/Mainnet deployment**, beyond
everything above:

- An independent security review of the Compact contract and its
  commitment scheme — in particular the admin/oracle key model, which
  currently has no rotation or multi-party control, and the salting/
  preimage assumptions behind `ownerCommitment`, `credentialCommitment`,
  and `provenanceCommitment`.
- Verified, funded end-to-end exercise of every circuit (not just
  `registerAsset`) against a live network.
- A real, reviewed off-chain risk-intelligence service, with its own
  trust boundary and key-management practices for the oracle role
  clearly documented and audited.
- Legal/compliance review specific to storing vehicle ownership,
  credential, and provenance references on a public ledger, for whatever
  jurisdictions the product targets.
- Operational readiness: monitoring, key-management procedures for the
  admin/oracle roles, and an incident-response plan.

**This project has not been deployed anywhere, and no transaction has
ever been submitted to a live network.** Any statement to the contrary
should be treated as false until independently verified.
