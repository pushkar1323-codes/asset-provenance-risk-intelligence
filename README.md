# Asset Provenance & Risk Intelligence Protocol

A privacy-preserving asset passport, built on Midnight, that lets owners and
authorized parties verify vehicle ownership, provenance, and service or
compliance credentials — without exposing the sensitive information behind
those facts.

This repository currently contains the protocol's foundation: the on-chain
contract, its test suite, and project scaffolding. The frontend, wallet
integration, and off-chain risk-intelligence service are not implemented
yet (see [Status](#status)).

## What this protocol does

The initial vertical is a **Vehicle Asset Passport**. It lets a vehicle's
owner:

- Register a vehicle as an asset under a private ownership commitment.
- Attach confidential credentials (e.g. inspection, service, or compliance
  records) as commitments, and later prove — without revealing the
  underlying document — that a specific credential is valid.
- Record provenance events (e.g. an accident, a repair, a change of use) as
  commitments tied to the asset's history.
- Transfer ownership to a new party using a proof of current ownership,
  without revealing either party's private key material.
- Have an authorized risk-intelligence process publish a committed
  reference to an off-chain risk assessment, without that process ever
  running on-chain or gaining authority over asset state.

Everyone can verify that these facts are consistent and correctly
authorized. Nobody but the relevant private-key holder needs to see the
underlying vehicle history, inspection reports, or personal ownership data.

## Privacy model

**Midnight proves. The off-chain layer only analyzes.**

The Compact contract in this repository is the sole source of truth for:

- asset registration and status
- ownership commitments
- credential existence and verification state
- provenance event commitments
- the reference to the current risk assessment

Nothing outside the contract can override this state. A future
risk-intelligence layer (not implemented in this repository yet) is scoped
to read already-verified, already-disclosed contract data and produce risk
signals — it cannot determine ownership, fabricate credentials, or modify
contract state.

### What stays private

Private data is supplied to the contract only through **witnesses** —
functions that run on the caller's own machine and never transmit their
return value anywhere. The following never appears on-chain:

- the owner's private key material
- the contents of a credential (inspection report, insurance document, etc.)
- the private details behind a provenance event
- the administrator's and risk oracle's private authorization keys
- the full detail behind a risk assessment (only a commitment and a coarse,
  deliberately disclosed risk tier are published)

### What becomes public

Only values the contract explicitly wraps in `disclose()` are written to
the public ledger:

- a hash commitment binding an asset to its current owner (not the owner's
  key)
- asset category, registration time, and lifecycle status
- a hash commitment for each credential and provenance event (not their
  contents)
- credential/provenance lifecycle status (pending, verified, revoked)
- a coarse risk tier and a hash commitment referencing the full off-chain
  risk assessment

Selective disclosure is deliberate throughout: the contract only exposes
what a specific circuit genuinely needs to become verifiable on-chain.

## Technology stack

- **Contract language:** [Compact](https://docs.midnight.network/compact)
  (Midnight's zero-knowledge smart contract language)
- **Contract runtime:** `@midnight-ntwrk/compact-runtime`
- **Tests:** [Vitest](https://vitest.dev/), run against the contract's
  generated TypeScript artifacts through a small simulator
- **Language:** TypeScript (Node.js ≥ 22)

## Project structure

```
asset-provenance-risk-intelligence/
├── contract/
│   ├── src/
│   │   ├── asset-passport.compact   # the Compact contract
│   │   └── witnesses.ts             # private-state model + witness implementations
│   ├── test/
│   │   ├── simulator.ts             # test harness wrapping the compiled contract
│   │   └── asset-passport.test.ts   # circuit / state-transition / privacy tests
│   ├── managed/                     # compiled contract output (generated locally, gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── package.json                     # workspace root
├── .env.example
└── README.md
```

## Contract architecture

The contract (`contract/src/asset-passport.compact`) exposes the following
entry points:

| Circuit | Purpose |
| --- | --- |
| `registerAsset` | Registers a new asset under an owner commitment |
| `transferOwnership` | Moves ownership to a new commitment, proving current ownership |
| `retireAsset` | Marks an asset as retired (owner-only) |
| `addCredential` | Attaches a confidential credential commitment to an asset (owner-only) |
| `verifyCredential` | Proves knowledge of a credential's private contents against its stored commitment |
| `revokeCredential` | Revokes a credential (administrator-only) |
| `addProvenanceEvent` | Records a provenance event commitment against an asset (owner-only) |
| `recordRiskAssessment` | Publishes a committed reference to an off-chain risk assessment (oracle-only) |

Public ledger state is organized as:

- `admin`, `oracle` — public-key-style commitments authorizing the two
  protocol roles used by the contract
- `assetCount` — a running count of registered assets
- `assets` — asset id → `AssetRecord` (category, registration time, owner
  commitment, status)
- `credentials`, `credentialCountByAsset` — credential id → `CredentialRecord`,
  and a per-asset credential count
- `provenance`, `provenanceCountByAsset` — event id → `ProvenanceRecord`,
  and a per-asset event count
- `riskAssessments` — asset id → `RiskRecord` (commitment, disclosed tier,
  timestamp)

All commitments use domain-separated hashing (`persistentHash` over a
padded domain tag plus the relevant identifiers and private material), so
commitments computed for one purpose (e.g. an owner key) cannot be
confused with commitments computed for another (e.g. a credential).

## Prerequisites

- Node.js ≥ 22 and npm
- The [Compact toolchain](https://docs.midnight.network/compact/compilation-and-tooling/compact-compiler)
  (`compact` CLI), installed and available on your `PATH`
- Verify your installed toolchain version against the current release
  notes at https://docs.midnight.network/relnotes/overview before
  compiling — the contract targets Compact language version `>= 0.22`,
  and was written against toolchain `0.31.0` / compact-runtime `0.16.0`
  documentation current as of this implementation. Confirm these are
  still the current recommended versions before installing.

## Setup

From the repository root:

```bash
npm install
```

Compile the contract (requires the `compact` CLI on your `PATH`):

```bash
npm run contract:compile
```

This runs `compact compile src/asset-passport.compact managed/asset-passport`
inside `contract/`, producing the TypeScript contract module the tests and
any future frontend/deployment code import from `contract/managed/`.

## Running tests

```bash
npm run contract:test
```

This runs the Vitest suite in `contract/test/`, which exercises:

- **Circuit logic** — registration, credential lifecycle, provenance
  recording, and risk-assessment recording succeed with valid inputs.
- **State transitions** — ownership transfer, asset retirement, and
  credential verification/revocation correctly move ledger state between
  valid states, and reject invalid transitions (e.g. transferring a
  retired asset).
- **Privacy / authorization behavior** — circuits reject callers who do
  not hold the correct private key or credential secret, and tests assert
  that ledger state never contains the raw private values used to derive
  a commitment.

Type-check the TypeScript sources independently of the test run:

```bash
npm run typecheck --workspace contract
```

## Verification status

Being transparent about what has and has not actually been run in this
environment:

- **IMPLEMENTED:** the Compact contract, witnesses module, test suite,
  and project scaffolding described above.
- **VERIFIED:**
  - The contract compiles successfully with the Compact toolchain
    (`npm run contract:compile`), producing the prover/verifier keys and
    zkir for all eight circuits under `contract/managed/asset-passport/`.
  - `npm run typecheck --workspace contract` passes cleanly against the
    real generated contract types (`Ledger`, `Witnesses<PS>`,
    `Contract<PS, W>`) and the real installed
    `@midnight-ntwrk/compact-runtime` API.
  - `npm run contract:test` passes: **13 of 13 tests**, covering circuit
    logic, state transitions (ownership transfer, retirement, credential
    verification/revocation), and privacy/authorization behavior
    (rejecting callers without the correct owner, administrator, or
    oracle secret; confirming raw secrets never appear in ledger state).
  - The only output during the test run is a non-failing sourcemap
    warning for the generated contract bundle
    (`Sourcemap for ".../managed/asset-passport/contract/index.js"
    points to missing source files`), which does not affect test
    correctness.
- **REQUIRES MANUAL ACTION:** wallet setup, network configuration, and
  deployment are not part of this repository yet (see the roadmap
  below).

No contract has been deployed, no transaction has been submitted, and no
wallet has been connected. Any of those claims should be treated as false
until you have performed and confirmed them yourself.

## Roadmap (not yet implemented)

- Midnight.js integration layer (deployment + contract interaction)
- Lace wallet connection
- Frontend dashboard for asset, credential, and provenance state
- Off-chain risk-intelligence service (anomaly detection, risk scoring,
  explainability) operating on verified/disclosed contract data only
- Continuous integration workflow
