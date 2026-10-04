import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum AssetStatus { ACTIVE = 0, RETIRED = 1 }

export enum CredentialStatus { PENDING = 0, VERIFIED = 1, REVOKED = 2 }

export type AssetRecord = { assetCategory: bigint;
                            registeredAt: bigint;
                            ownerCommitment: Uint8Array;
                            status: AssetStatus
                          };

export type CredentialRecord = { assetId: Uint8Array;
                                 credentialType: bigint;
                                 issuerCommitment: Uint8Array;
                                 credentialCommitment: Uint8Array;
                                 status: CredentialStatus;
                                 addedAt: bigint
                               };

export type ProvenanceRecord = { assetId: Uint8Array;
                                 eventType: bigint;
                                 eventCommitment: Uint8Array;
                                 recordedAt: bigint
                               };

export type RiskRecord = { assetId: Uint8Array;
                           riskCommitment: Uint8Array;
                           riskTier: bigint;
                           assessedAt: bigint
                         };

export type Witnesses<PS> = {
  ownerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>,
                 assetId_0: Uint8Array): [PS, Uint8Array];
  credentialSecret(context: __compactRuntime.WitnessContext<Ledger, PS>,
                   credentialId_0: Uint8Array): [PS, Uint8Array];
  provenanceSecret(context: __compactRuntime.WitnessContext<Ledger, PS>,
                   eventId_0: Uint8Array): [PS, Uint8Array];
  adminSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  oracleSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                assetCategory_0: bigint,
                registeredAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: Uint8Array,
                    newOwnerCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  retireAsset(context: __compactRuntime.CircuitContext<PS>,
              assetId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addCredential(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                credentialId_0: Uint8Array,
                credentialType_0: bigint,
                issuerCommitment_0: Uint8Array,
                addedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addProvenanceEvent(context: __compactRuntime.CircuitContext<PS>,
                     assetId_0: Uint8Array,
                     eventId_0: Uint8Array,
                     eventType_0: bigint,
                     recordedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordRiskAssessment(context: __compactRuntime.CircuitContext<PS>,
                       assetId_0: Uint8Array,
                       riskCommitment_0: Uint8Array,
                       riskTier_0: bigint,
                       assessedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                assetCategory_0: bigint,
                registeredAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: Uint8Array,
                    newOwnerCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  retireAsset(context: __compactRuntime.CircuitContext<PS>,
              assetId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addCredential(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                credentialId_0: Uint8Array,
                credentialType_0: bigint,
                issuerCommitment_0: Uint8Array,
                addedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addProvenanceEvent(context: __compactRuntime.CircuitContext<PS>,
                     assetId_0: Uint8Array,
                     eventId_0: Uint8Array,
                     eventType_0: bigint,
                     recordedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordRiskAssessment(context: __compactRuntime.CircuitContext<PS>,
                       assetId_0: Uint8Array,
                       riskCommitment_0: Uint8Array,
                       riskTier_0: bigint,
                       assessedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                assetCategory_0: bigint,
                registeredAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: Uint8Array,
                    newOwnerCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  retireAsset(context: __compactRuntime.CircuitContext<PS>,
              assetId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addCredential(context: __compactRuntime.CircuitContext<PS>,
                assetId_0: Uint8Array,
                credentialId_0: Uint8Array,
                credentialType_0: bigint,
                issuerCommitment_0: Uint8Array,
                addedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  addProvenanceEvent(context: __compactRuntime.CircuitContext<PS>,
                     assetId_0: Uint8Array,
                     eventId_0: Uint8Array,
                     eventType_0: bigint,
                     recordedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  recordRiskAssessment(context: __compactRuntime.CircuitContext<PS>,
                       assetId_0: Uint8Array,
                       riskCommitment_0: Uint8Array,
                       riskTier_0: bigint,
                       assessedAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly admin: Uint8Array;
  readonly oracle: Uint8Array;
  readonly assetCount: bigint;
  assets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): AssetRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, AssetRecord]>
  };
  credentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CredentialRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, CredentialRecord]>
  };
  credentialCountByAsset: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  provenance: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ProvenanceRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, ProvenanceRecord]>
  };
  provenanceCountByAsset: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  riskAssessments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): RiskRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, RiskRecord]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               adminKey_0: Uint8Array,
               oracleKey_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
