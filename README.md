# Asset Provenance & Risk Intelligence Protocol

A privacy-preserving asset passport, built on Midnight, that lets owners and
authorized parties verify vehicle ownership, provenance, and service or
compliance credentials — without exposing the sensitive information behind
those facts.

This repository contains the protocol's contract, its Midnight.js
integration layer, and a web application that connects a wallet and
exercises one real contract operation end to end (see
[Status](#status) for exactly what has and has not been verified). The
off-chain risk-intelligence service is not implemented yet.

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
- **Contract deployment/interaction:** `@midnight-ntwrk/midnight-js-contracts`
  and the supporting Midnight.js provider packages
- **Wallet integration:** the Midnight DApp Connector API
  (`@midnight-ntwrk/dapp-connector-api`) - the standard `window.midnight`
  injection mechanism any compliant wallet (including Lace) implements
- **Frontend:** React + Vite (TypeScript)
- **Tests:** [Vitest](https://vitest.dev/), for both the contract (run
  against its generated TypeScript artifacts through a small simulator)
  and the frontend (wallet/contract-wiring logic and components)
- **Language:** TypeScript (Node.js ≥ 22)

## Project structure

```
asset-provenance-risk-intelligence/
├── contract/
│   ├── src/
│   │   ├── asset-passport.compact   # the Compact contract
│   │   ├── witnesses.ts             # private-state model + witness implementations
│   │   └── api/                     # Midnight.js integration: deploy, connect, providers
│   ├── test/
│   │   ├── simulator.ts             # test harness wrapping the compiled contract
│   │   ├── asset-passport.test.ts   # circuit / state-transition / privacy tests
│   │   └── api/                     # integration-layer tests (mocked, no live network)
│   ├── managed/                     # compiled contract output (generated locally, gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── lib/wallet/               # wallet detection, connection, provider adapter
│   │   ├── lib/contract/             # browser providers, validation, registerAsset flow
│   │   ├── components/               # WalletPanel, RegisterAssetForm, PrivacyNotice
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
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

## Web application

`frontend/` is a small React application that connects a wallet and
registers an asset through the contract above.

**Wallet connection.** The app detects any wallet injected under
`window.midnight` (the standard Midnight DApp Connector mechanism - Lace
and any other compliant wallet work the same way), lets the person choose
one, and requests a connection. It tracks connection state (disconnected,
connecting, connected, error), displays the connected wallet's name and
unshielded address, and compares the wallet's reported network against
the network this application is configured for, showing a clear warning
if they differ. Disconnecting clears the application's local reference to
the connection (the DApp Connector API has no wallet-side "disconnect"
call - the wallet itself manages the granted permission).

**Registering an asset.** The form collects only what the `registerAsset`
circuit needs: an asset identifier (hashed client-side into the 32-byte
value the contract uses) and a category. The ownership key is generated
locally in the browser and never displayed or transmitted - only its
commitment, computed by the contract itself, becomes part of the
transaction. Submitting the form connects to the already-deployed
contract via the existing typed contract API and calls
`registerAsset(...)` - no circuit signature is redeclared in the
frontend.

**What this does and does not cover.** Building the transaction and
generating its proof uses the same typed contract-interaction layer as
the rest of this repository. Balancing and submitting that transaction
through the connected wallet requires converting between this project's
transaction types and the wallet's own wire format; the Midnight DApp
Connector API does not specify that wire format, so this step
(`WalletProviderAdapter.balanceTx`/`.submitTx` in
`frontend/src/lib/wallet/walletProviderAdapter.ts`) is implemented up to
that exact boundary and stops there rather than guessing at an unverified
encoding. See [Status](#status) for what this means in practice.

## Prerequisites

- Node.js ≥ 22 and npm
- The [Compact toolchain](https://docs.midnight.network/compact/compilation-and-tooling/compact-compiler)
  (`compact` CLI), installed and available on your `PATH`, to compile the
  contract
- A Midnight-compatible wallet (e.g. Lace) installed in your browser, to
  use the web application
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
inside `contract/`, producing the TypeScript contract module the tests,
the integration layer, and the frontend import from `contract/managed/`.

Copy `.env.example` to `.env` and fill in real values before running the
web application (see the file for what each variable is for). Vite only
reads variables prefixed `VITE_` into the browser bundle.

Run the web application locally:

```bash
npm run frontend:dev
```

## Running tests

```bash
npm run contract:test
npm run frontend:test
```

`contract:test` runs the Vitest suite in `contract/test/`, which exercises:

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
- **Integration-layer wiring** (`contract/test/api/`) — the deployment and
  connection helpers build the expected `CompiledContract` and forward
  the right arguments, using mocked network calls.
- **Deployment runner** (`contract/test/deploy/`) — configuration
  validation, local secret generation/persistence, and deployment
  orchestration wiring (mocked at the network boundary), plus an
  end-to-end check that the runner's commitment derivation is
  byte-identical to what the compiled contract itself expects, by
  exercising an admin-gated circuit through the simulator with it.

`frontend:test` runs the Vitest suite in `frontend/src/`, which exercises:

- Wallet detection, connection errors, and network-mismatch detection
- Environment/configuration validation
- Register-asset form validation and submission wiring
- The register-asset contract call's wiring and privacy boundary (only a
  public transaction id is ever returned - never the private transcript
  data a real call result also carries)
- Wallet connection/disconnection state in the UI

None of these require a live wallet, network, or deployed contract - see
[Status](#status) for what still does.

Type-check either workspace independently of running its tests:

```bash
npm run typecheck --workspace contract
npm run typecheck --workspace frontend
```

Build the web application:

```bash
npm run frontend:build
```

## Deploying to Preprod

`contract/src/deploy/` provides a command-line runner that prepares and
attempts a deployment of the Asset Passport contract to Midnight Preprod,
built on the same typed contract API used everywhere else in this
repository (`contract/src/api/`) — it does not reimplement any contract
or deployment logic.

Populate `.env` at the repository root with `MIDNIGHT_NETWORK=preprod`
and: `ZK_CONFIG_PATH`, `MIDNIGHT_INDEXER_URL`, `MIDNIGHT_INDEXER_WS_URL`,
`MIDNIGHT_PROOF_SERVER_URL`, `PRIVATE_STATE_ACCOUNT_ID`,
`PRIVATE_STATE_STORAGE_PASSWORD`. Then, from the repository root:

```bash
# Check configuration only - no network or wallet access attempted.
npm run contract:deploy:preprod:validate

# Attempt a real deployment.
npm run contract:deploy:preprod
```

The runner will:

1. Validate configuration and refuse to run against anything other than
   `preprod`.
2. Generate (or reuse) local administrator and risk-oracle secret
   material, stored only in a gitignored local file
   (`contract/.deployment-secrets/`), and derive the public commitments
   the contract's constructor needs from them, using the exact same
   domain-separated hashing the contract's own `adminPublicKey`/
   `oraclePublicKey` circuits use.
3. Attempt to construct a real local wallet (see below).
4. Build the same provider bundle (`contract/src/api/providers.ts`) used
   elsewhere in this repository.
5. Attempt the deployment.

### Local deployment wallet

`contract/src/deploy/wallet/` implements a real Node wallet using the
installed Midnight Wallet SDK: it derives shielded, unshielded, and DUST
key material from one local seed via HD derivation, connects them through
a `WalletFacade`, and adapts that facade directly to the
`WalletProvider`/`MidnightProvider` interfaces the provider layer expects
— without any transaction-serialization step, since the Wallet SDK
already works with the same typed transaction objects those interfaces
use.

To use it, additionally set in `.env`:

- `MIDNIGHT_RELAY_URL` — the node/relay endpoint the wallet submits
  transactions through.
- `DEPLOYMENT_WALLET_SEED_HEX` — a local, 32-byte hex-encoded seed for
  this deployment identity. Generate one yourself (see `.env.example`
  for the exact command); never share it, commit it, or send it to
  anyone. This is separate from any browser wallet (Lace) used by the
  frontend.

If these are not set, the runner proceeds without a wallet and stops
with a clear error at exactly that point rather than fabricating
anything, the same as before this integration existed. If they are set,
the runner performs a real HD key derivation and attempts a real
connection and sync against the configured indexer and relay — this
requires genuine network access, funds in the derived wallet to pay
fees, and is not exercised by this project's automated tests. A proof
server (`MIDNIGHT_PROOF_SERVER_URL`) is optional: if unset, the wallet
proves transactions locally instead of requiring one to be running.

If a real deployment does complete, the runner prints the resulting
contract address and transaction id (and nothing privacy-sensitive) and
shows exactly which `.env` lines to update with that address
(`CONTRACT_ADDRESS`, `VITE_ASSET_PASSPORT_CONTRACT_ADDRESS`).

## Verification status

Being transparent about what has and has not actually been run:

- **IMPLEMENTED:**
  - The Compact contract, witnesses module, and contract test suite.
  - The Midnight.js integration layer (`contract/src/api/`): deployment,
    connection to an already-deployed contract, and provider
    configuration, typed against the generated contract.
  - The web application (`frontend/`): wallet detection/connection,
    connection state and network-mismatch handling, and a register-asset
    flow wired to the contract through the existing typed API.
  - The Preprod deployment runner (`contract/src/deploy/`): configuration
    validation, local admin/oracle secret generation matching the
    contract's own commitment derivation, and deployment orchestration.
  - A real Node wallet integration (`contract/src/deploy/wallet/`) built
    on the installed Midnight Wallet SDK: HD key derivation, a connected
    `WalletFacade`, and a `WalletProvider`/`MidnightProvider` adapter
    with no transaction-serialization gap (unlike the browser adapter,
    the Wallet SDK works with the same typed transaction objects those
    interfaces expect).
- **VERIFIED:**
  - The contract compiles successfully with the Compact toolchain,
    producing prover/verifier keys and zkir for all eight circuits under
    `contract/managed/asset-passport/`.
  - `npm run typecheck --workspace contract` and
    `npm run typecheck --workspace frontend` both pass cleanly against
    the real generated contract types and the real installed Midnight.js,
    Wallet SDK, and DApp Connector API packages (not just documentation -
    several real type mismatches between package versions were found and
    fixed this way).
  - `npm run contract:test` passes: **63 of 63 tests** (13 contract
    behavior tests, 11 integration-layer wiring tests, 16 deployment
    runner tests, and 23 Node wallet tests covering key derivation
    determinism, configuration validation, provider-adapter wiring, and
    that no secret ever appears in a thrown error message).
  - `npm run frontend:test` passes: **24 of 24 tests**, covering wallet
    connection/disconnection, network-mismatch detection, environment
    validation, form validation, the register-asset call's wiring, and
    its privacy boundary.
  - `npm run frontend:build` succeeds and produces a real production
    bundle, including the WASM modules the ledger package requires
    (this needed `vite-plugin-wasm` and an `esnext` build target, both
    now configured in `frontend/vite.config.ts`).
  - The deployment runner was actually run against a locally-populated
    Preprod `.env` with a test (non-real) wallet seed: it genuinely
    derived HD keys, constructed shielded/unshielded/DUST wallets, and
    attempted a real sync connection against the configured Preprod
    indexer - which correctly failed in this environment (no route to
    Midnight's Preprod infrastructure from here), rather than fabricating
    a success. Without a seed configured, the runner still stops cleanly
    with the same honest error as before this integration existed.
- **REQUIRES LOCAL TESTING:**
  - Connecting a real wallet and confirming the connection, address,
    and network-mismatch UI behave as expected against that wallet.
  - `WalletProviderAdapter.balanceTx`/`.submitTx`
    (`frontend/src/lib/wallet/walletProviderAdapter.ts`): converting
    between this project's transaction types and the connected wallet's
    string-based wire format. The Midnight DApp Connector API does not
    specify that encoding, so this could not be verified without a live
    wallet; both methods currently throw a clearly labeled error at
    exactly that point rather than guessing. This is specific to the
    browser wallet adapter - the Node wallet integration above does not
    have this gap.
  - The Node wallet's actual connection, sync, balancing, and submission
    against live Preprod infrastructure, with real funds - this
    environment has no network route there to verify it.
  - An actual deployment and a full registerAsset submission against a
    live network — neither has happened; no contract address exists yet.
- **REQUIRES MANUAL ACTION:** installing a Midnight-compatible wallet,
  populating `.env`/`frontend/.env` with real values (indexer, relay,
  proof server, contract address, zk config URL, and a locally-generated
  `DEPLOYMENT_WALLET_SEED_HEX` funded with Preprod tokens), and running
  an actual deployment — see "Deploying to Preprod" above.

No contract has been deployed, no transaction has been submitted, and no
wallet has been connected. Any of those claims should be treated as false
until you have performed and confirmed them yourself.

## Roadmap (not yet implemented)

- Resolving the browser wallet adapter's transaction encoding against a
  live wallet (see `frontend/src/lib/wallet/walletProviderAdapter.ts`)
- Off-chain risk-intelligence service (anomaly detection, risk scoring,
  explainability) operating on verified/disclosed contract data only
- Additional contract operations surfaced in the UI (credentials,
  provenance, ownership transfer)
- Continuous integration workflow
