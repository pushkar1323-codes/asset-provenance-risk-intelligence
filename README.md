<div align="center">

# Asset Provenance & Risk Intelligence Protocol

> A privacy-preserving asset passport on Midnight: prove ownership, provenance and credentials without revealing the sensitive records behind them.

[![Midnight](https://img.shields.io/badge/Network-Midnight%20Preprod-0B2545)](#deployed-contract)
[![Compact](https://img.shields.io/badge/Contract-Compact-5B21B6)](https://docs.midnight.network/compact)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend%20%26%20Tooling-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-22+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-103%20contract%20%C2%B7%20109%20frontend%20passing-success)](#testing)

**[Deployed Contract](#deployed-contract)** · **[Privacy Model](#privacy-model)** · **[Proposal](./PROPOSAL.md)**

</div>

---

## Overview

Asset Provenance & Risk Intelligence Protocol is a Midnight dApp for assets whose value depends on a trustworthy history, starting with vehicles. Today, a buyer, insurer or inspector has to trust paperwork they cannot independently check, while owners must hand over private records to prove anything. This protocol gives each asset a public, verifiable passport on Midnight. Ownership, credentials (such as inspections or compliance records) and provenance events are recorded as cryptographic commitments, and zero-knowledge proofs let the right party demonstrate that they are valid, authorized and consistent. The documents and keys behind those commitments never leave the holder's machine, and an off-chain risk-intelligence process can reference a committed assessment without ever gaining authority over contract state.

The first supported asset type is a **Vehicle Asset Passport**.

**Core capabilities:**

- Register a vehicle as an asset under a private ownership commitment
- Attach confidential credentials (for example inspection, service or compliance records) as commitments, and later prove, without revealing the document, that a specific credential is valid
- Record provenance events (for example an accident, a repair or a change of use) as commitments tied to the asset's history
- Transfer ownership to a new party by proving current ownership, without revealing either party's private key material
- Retire an asset permanently
- Let an authorized risk oracle publish a committed reference to an off-chain risk assessment, together with a coarse risk tier

Anyone can verify that these facts are consistent and correctly authorized. Only the relevant private-key holder needs to see the underlying vehicle history, reports or ownership data.

**Midnight proves. The off-chain layer only analyzes.** The Compact contract is the only source of truth for asset registration and status, ownership commitments, credential state, provenance commitments and the reference to the current risk assessment. Nothing outside the contract can override it.

---

## Deployed Contract

| | |
| --- | --- |
| **Network** | Midnight Preprod |
| **Contract address** | `ceec2dd543e6f33e18c1c17e57f7893c31fafe784262ffa7d0bc100ef198f229` |
| **Deployment transaction ID** | `005b45d95c33109ad668b6d16e08ddc9478dd64dc83bd63a62f58d7abf3a95fe3e` |

This is the deployed Asset Passport contract (`contract/src/asset-passport.compact`). It was deployed with the repository's own deployment runner (`npm run contract:deploy:preprod`, described under [Deploying the Contract](#deploying-the-contract)), whose constructor takes the public `admin` and `oracle` role commitments. The address and transaction ID above are the values the deployment command printed. The contract is also independently visible on the Midnight Preprod Explorer, which lists it as deployed at this address.

---

## Screenshots

### Contract Compilation

> **Screenshot:** Successful `compact compile` output showing the compiled Asset Passport circuits.
>
> <img width="1005" height="711" alt="image" src="https://github.com/user-attachments/assets/4cd2d0f3-f5a8-4cc0-a0f7-bd7649ce3d52" />


### Preprod Contract Deployment

> **Screenshot:** Midnight Preprod Explorer showing the deployed Asset Passport contract and contract address.
>
> <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/6997cc13-ff80-4031-aa1d-b6e7f2530785" />


The Midnight Preprod Explorer shows:

- the contract as **DEPLOYED**, at address `ceec2dd543e6f33e18c1c17e57f7893c31fafe784262ffa7d0bc100ef198f229`
- the successful deployment transaction `005b45d95c33109ad668b6d16e08ddc9478dd64dc83bd63a62f58d7abf3a95fe3e`
- a `DEPLOY` contract action pointing to the same contract address

**Live demo:** not available; a link will be added once a hosted instance exists.

---

## Architecture

<div align="center">

```text
React (TypeScript + Vite)
        │
Midnight DApp Connector (browser wallet)
        │
Midnight.js providers ───────── Proof generation
        │                       (wallet prover or proof server)
Asset Passport contract (Compact)
        │
Midnight Preprod (node + indexer)
```

</div>

The deployment runner (`contract/src/deploy/`) reaches the same contract through a Node wallet built on the Midnight Wallet SDK, and the browser fetches the contract's ZK artifacts from a static location you configure (see [Setup](#setup)).

---

## Registration Flow

1. **Enter details** — the user enters an asset identifier and category; both are validated
2. **Derive the asset id** — the web application computes a SHA-256 hash of the identifier as the public asset id and shows a preview
3. **Create the ownership key** — an ownership key is generated locally and kept in the local private-state store; it is never displayed or transmitted
4. **Prove** — the `registerAsset` circuit is proven with the ownership key as private witness
5. **Submit** — the connected wallet balances the transaction and submits it; only the ownership commitment becomes public
6. **Record** — the asset is marked registered in the browser-local list only after the contract call returns a transaction id

---

## Privacy Model

Midnight contracts separate **public ledger state** (visible to everyone) from **private witness data** (supplied by the caller's own machine, used inside the zero-knowledge proof, and never published).

### What is public (on-chain)

Only values the contract explicitly passes through `disclose()` are written to the public ledger:

- The asset id (a public lookup key; the web application derives it as a SHA-256 hash of the identifier you enter), the asset category, the registration time supplied with the registration call, and lifecycle status (active or retired)
- A hash commitment binding each asset to its current owner. It is not the owner's key
- For each credential: the asset it belongs to, a declared credential type, the issuer commitment, a commitment to the credential contents, its status (pending, verified or revoked) and when it was added
- For each provenance event: the asset it belongs to, a declared event type, a commitment to the event detail, and when it was recorded
- For each risk assessment: the asset, a commitment to the full off-chain assessment, a coarse risk tier and when it was assessed
- Two role commitments, `admin` and `oracle`, set when the contract is deployed

### What stays private (the private witness)

The contract declares five witnesses. Each is a function that runs on the caller's own machine, and its return value is used only inside the proof:

| Witness | Represents |
| --- | --- |
| `ownerSecretKey(assetId)` | The owner's secret for one asset. Proves ownership without revealing it. |
| `credentialSecret(credentialId)` | The private contents behind a credential commitment. |
| `provenanceSecret(eventId)` | The private detail behind a provenance event commitment. |
| `adminSecretKey()` | The administrator's secret authorizing credential revocation. |
| `oracleSecretKey()` | The risk oracle's secret authorizing risk assessments. |

Commitments use domain-separated hashing (`persistentHash` over a padded domain tag plus the relevant identifiers and secret), so a commitment computed for one purpose cannot be confused with one computed for another.

### What an observer can and cannot learn

An observer reading the public ledger and watching submitted transactions, with no witness data of their own, **can** see that an asset exists and its category, registration time and status; that its ownership commitment changed; that a credential or provenance event of a given type exists for it; and that a risk assessment with a given coarse tier was recorded.

They **cannot** learn any owner's, administrator's or oracle's secret key, the contents of any credential, the private detail behind any provenance event, the full risk assessment, or which real-world identity controls a given commitment.

One caveat follows from the design: the asset id is public. If an identifier is low-entropy or known to others (a vehicle identification number, for example), anyone who knows it can compute the asset id and look up that asset's public record. The record reveals the facts listed above, not the owner or the documents.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Contract | Compact, `@midnight-ntwrk/compact-runtime` |
| Integration | `@midnight-ntwrk/midnight-js-contracts` and the supporting Midnight.js provider packages |
| Node wallet | Midnight Wallet SDK (`@midnight-ntwrk/wallet-sdk-*`), `@midnight-ntwrk/ledger-v8` |
| Browser wallet | Midnight DApp Connector API (`@midnight-ntwrk/dapp-connector-api`) |
| Frontend | React 18, Vite, TypeScript |
| Tests | Vitest (both workspaces) |
| Runtime | Node.js 22 or later |

---

## Project Structure

```text
asset-provenance-risk-intelligence/
├── contract/
│   ├── src/
│   │   ├── asset-passport.compact   # the Compact contract
│   │   ├── witnesses.ts             # private-state model and witness implementations
│   │   ├── api/                     # Midnight.js integration: deploy, connect, providers
│   │   └── deploy/                  # Preprod deployment runner and Node wallet
│   │       └── wallet/              # key derivation, wallet facade, persistence, provider adapter
│   ├── test/                        # contract, integration-layer, deployment and wallet tests
│   ├── managed/                     # generated compiler output (circuits, keys, zkir), included in the repository
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── lib/                     # wallet, contract wiring, local asset record, navigation
│   │   ├── components/              # wallet panel, register form, shared UI
│   │   ├── views/                   # overview, assets, passport, provenance, risk, privacy, settings
│   │   └── App.tsx
│   └── package.json
├── .github/workflows/ci.yml         # GitHub Actions workflow running the commands below
├── PROPOSAL.md                      # product description and data model
├── .env.example                     # configuration template (no secrets)
└── package.json                     # npm workspace root
```

---

## Contract Interface

The contract (`contract/src/asset-passport.compact`) exposes eight circuits:

| Circuit | Purpose |
|---|---|
| `registerAsset` | Registers a new asset under an owner commitment |
| `transferOwnership` | Moves ownership to a new commitment, proving current ownership |
| `retireAsset` | Marks an asset as retired (owner only) |
| `addCredential` | Attaches a confidential credential commitment to an asset (owner only) |
| `verifyCredential` | Proves knowledge of a credential's private contents against its stored commitment |
| `revokeCredential` | Revokes a credential (administrator only) |
| `addProvenanceEvent` | Records a provenance event commitment against an asset (owner only) |
| `recordRiskAssessment` | Publishes a committed reference to an off-chain risk assessment (oracle only) |

Public ledger state: `admin`, `oracle`, `assetCount`, `assets`, `credentials`, `credentialCountByAsset`, `provenance`, `provenanceCountByAsset` and `riskAssessments`.

### Integration layer

`contract/src/api/` provides typed helpers to deploy the contract, connect to a deployed instance and build the Midnight.js provider bundle.

### Deployment runner and local wallet

`contract/src/deploy/` is a command-line runner that validates configuration, generates local administrator and oracle secrets, derives their public commitments with the contract's own hashing scheme, and deploys through a Node wallet built on the Midnight Wallet SDK (shielded, unshielded and DUST keys derived from one local seed, with saved synchronization progress).

### Web application

`frontend/` (React + Vite) provides:

- Wallet detection for wallets injected under `window.midnight` (the standard Midnight DApp Connector), connection, wallet name, address and connection state, and a network-mismatch warning
- Asset registration through the contract's `registerAsset` circuit. The ownership key is generated locally and never displayed or transmitted; only its commitment becomes part of the transaction
- A browser-local list of assets: drafts can be saved without a wallet, and an asset is marked registered only after the contract call returns a transaction id
- A passport, provenance timeline and risk summary for each asset, drawn from that local record, which state plainly what the application cannot read from the ledger
- Transfer and retire flows with input validation and confirmation. Their final submit actions stay disabled, because those contract calls are not connected in the application
- An explanation of the privacy model and of the application's configuration state

---

## Getting Started

### Prerequisites

- Node.js 22 or later, and npm
- A Midnight-compatible wallet extension (for example Lace) in your browser, to use the web application
- The [Compact toolchain](https://docs.midnight.network/compact/compilation-and-tooling/compact-compiler) (the `compact` CLI), only if you want to recompile the contract. The generated artifacts are already included in the repository. The contract declares `pragma language_version >= 0.22`, and the included output records compiler version 0.31.1, language version 0.23.0 and runtime 0.16.0. Check the current recommended versions in the [Midnight release notes](https://docs.midnight.network/relnotes/overview) before installing
- To deploy: a Midnight proof server, and a funded deployment wallet (see [Deploying the Contract](#deploying-the-contract))

### Setup

```bash
git clone <repository-url>
cd asset-provenance-risk-intelligence
npm install
```

**Contract and development setup** needs nothing beyond `npm install`. The generated artifacts in `contract/managed/asset-passport/` are part of the repository, so the tests and the frontend build run without the Compact compiler, a wallet or a network.

**Frontend setup.** The web application reads build-time configuration from a `.env` file in `frontend/` (Vite reads environment files from the frontend directory, not the repository root). Only variables prefixed `VITE_` reach the browser, and none of them is a secret:

| Variable | Value |
| --- | --- |
| `VITE_MIDNIGHT_NETWORK_ID` | The network the app expects the wallet to be on, for example `preprod` |
| `VITE_ASSET_PASSPORT_CONTRACT_ADDRESS` | The deployed contract address (see [Deployed Contract](#deployed-contract)) |
| `VITE_ZK_CONFIG_BASE_URL` | An absolute `http(s)` URL from which the browser can fetch the contract's ZK artifacts |

`VITE_ZK_CONFIG_BASE_URL` must serve the contents of `contract/managed/asset-passport/` so that, for example, `<base>/keys/registerAsset.verifier` and `<base>/zkir/registerAsset.bzkir` resolve in a browser. This repository does not include a server or copy step for those files; host them with any static file server that allows requests from the application's origin.

Run the application:

```bash
npm run frontend:dev
```

Without these variables the application still runs: it shows what is missing, disables wallet connection and on-chain registration, and lets you save asset drafts locally.

---

## Testing

| Command | What it does |
| --- | --- |
| `npm run contract:test` | Runs the contract test suite |
| `npm run contract:typecheck` | Type-checks the contract workspace |
| `npm run frontend:test` | Runs the frontend test suite |
| `npm run frontend:typecheck` | Type-checks the frontend workspace |
| `npm run frontend:build` | Builds the web application |
| `npm run contract:compile` | Recompiles the contract into `contract/managed/asset-passport/` (only needed after changing the contract) |

The contract tests cover circuit behavior, state transitions (including rejection of invalid ones, such as transferring a retired asset), authorization (callers without the correct secret are rejected, and the ledger never contains the raw private values behind a commitment), the Midnight.js integration layer, the deployment runner and the Node wallet. They run without a live network or wallet. The frontend tests cover wallet detection and connection states, network-mismatch detection, configuration validation, form validation, the local asset record, the asset views, and that unavailable actions never report success.

**Latest verified results for this version:** `npm run contract:test` passed 103 tests (14 test files) and `npm run frontend:test` passed 109 tests (15 test files). Both type-checks and `npm run frontend:build` passed. These ran against mocked network boundaries, not a live wallet or network.

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs install, compile, type-check, test and build with these same commands. It does not deploy anything and uses no secrets.

---

## ZK / Managed Artifacts

`contract/managed/asset-passport/` holds the generated output of `npm run contract:compile`, and it is included in the repository. It contains everything the contract needs to run:

- `contract/`: the generated TypeScript contract module that the tests, the integration layer and the frontend import
- `keys/`: a prover key (`<circuit>.prover`) and a verifier key (`<circuit>.verifier`) for each of the eight circuits
- `zkir/`: the zero-knowledge intermediate representation (`<circuit>.zkir` and `<circuit>.bzkir`) for each circuit
- `compiler/`: compiler metadata (`contract-info.json`), including the circuit and witness signatures

The deployment runner reads these artifacts from the path in `ZK_CONFIG_PATH` (a relative path is resolved against the repository root), and the browser fetches them from `VITE_ZK_CONFIG_BASE_URL`. The `.gitignore` rules ignore other generated output under `contract/managed/` but track the `asset-passport` directory. Re-run `npm run contract:compile` whenever the contract changes, so the included artifacts always match `asset-passport.compact`.

---

## Deploying the Contract

`contract/src/deploy/` deploys the Asset Passport contract to Midnight Preprod. It refuses to run against any other network. Set these in a `.env` file at the repository root (start from `.env.example`):

- `MIDNIGHT_NETWORK=preprod`
- `ZK_CONFIG_PATH`: the path to `contract/managed/asset-passport`
- `MIDNIGHT_INDEXER_URL`: the indexer's GraphQL HTTP endpoint (`https://…`)
- `MIDNIGHT_INDEXER_WS_URL`: the indexer's GraphQL WebSocket endpoint (`wss://…`)
- `MIDNIGHT_RELAY_URL`: the node's WebSocket endpoint (`wss://rpc.preprod.midnight.network` for Preprod). It must start with `ws://` or `wss://`; the node's `https://` RPC address is a different endpoint and is rejected at startup with a clear message
- `MIDNIGHT_PROOF_SERVER_URL`: a running Midnight proof server whose version matches the ledger version
- `PRIVATE_STATE_ACCOUNT_ID` and `PRIVATE_STATE_STORAGE_PASSWORD`: identify and encrypt the local private-state store
- `DEPLOYMENT_WALLET_SEED_HEX`: a locally generated 32-byte hex seed for the deployment wallet (the generation command is in `.env.example`). Keep it local and never share it

The deployment wallet needs NIGHT registered for DUST generation, and enough generated DUST, to pay transaction fees. Then, from the repository root:

```bash
# Check configuration only: no network or wallet access
npm run contract:deploy:preprod:validate

# Deploy
npm run contract:deploy:preprod
```

The runner generates (or reuses) local administrator and oracle secrets in `contract/.deployment-secrets/` (gitignored), derives the public commitments the constructor needs, connects and syncs the wallet (saving progress so later runs resume), and deploys. On success it prints the contract address and transaction ID, and the `.env` lines to update (`VITE_ASSET_PASSPORT_CONTRACT_ADDRESS`). Back up `contract/.deployment-secrets/`: it holds the secrets that control the administrator and oracle roles of the contract you deployed.

---

## Privacy Claim

Anyone reading the public ledger or watching submitted transactions can verify that an asset is registered, who is authorized to act on it (as commitments), and that its credentials and provenance are consistent, but cannot learn the owner's identity or keys, the contents of any credential, the detail of any provenance event, or the full risk assessment. This boundary is not a policy layered on top of the contract. It is exactly the set of values passed through `disclose()` in `asset-passport.compact`; anything not explicitly disclosed never leaves the caller's own machine.

---

## Current Limitations

- There is no off-chain risk-intelligence service in this repository. The contract can store a committed risk reference, but nothing here computes risk scores
- Of the eight circuits, the web application submits only `registerAsset`; the transfer and retire flows stop before submission
- The application's asset list, passport, provenance and risk views are built from the browser-local record, not read back from the ledger
- This repository does not include a server for the ZK artifacts the browser fetches (see [Setup](#setup))
- The contract is deployed to Preprod, a test network

---

## Project Documents

[`PROPOSAL.md`](./PROPOSAL.md) describes the target users, why this is built on Midnight, and the full data model: public ledger fields, private witness data, and what is proven without being revealed.

---

<div align="center">

<p>Built with Compact, Midnight.js, React, and TypeScript</p>

</div>
