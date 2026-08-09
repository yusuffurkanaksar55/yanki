export interface KeyCustodyEntry {
  readonly version: string;
  readonly status: "ACTIVE" | "DECRYPT_ONLY";
  readonly primaryCustodyControlDomain: string;
  readonly primaryCustodyReference: string;
  readonly recoveryCustodyControlDomain: string;
  readonly recoveryCustodyReference: string;
  readonly custodianRoles: readonly string[];
}

export interface KeyCustodyManifest {
  readonly schemaVersion: 1;
  readonly environmentId: string;
  readonly activeKeyVersion: string;
  readonly keyVersions: readonly KeyCustodyEntry[];
}

export interface EncryptionRecoveryCanary {
  encryptionKeyVersion: string;
  encryptedCanary: string;
  nonce: string;
  canaryDigest: string;
  contextVersion: 1;
}

export interface EncryptionRecoveryVerification {
  canaryCount: number;
  allCustodiedKeysRecovered: true;
  decryptedContentLogged: false;
  keyMaterialLogged: false;
}

export function readKeyCustodyManifest(
  manifestPath: string
): Promise<KeyCustodyManifest>;
export function validateKeyCustodyManifest(value: unknown): KeyCustodyManifest;
export function loadCustodiedEncryptionKeys(
  manifest: KeyCustodyManifest,
  environment?: Record<string, string | undefined>
): Map<string, Uint8Array>;
export function createEncryptionRecoveryCanaries(
  manifest: KeyCustodyManifest,
  keys: Map<string, Uint8Array>
): Promise<EncryptionRecoveryCanary[]>;
export function verifyEncryptionRecoveryCanaries(
  manifest: KeyCustodyManifest,
  keys: Map<string, Uint8Array>,
  records: unknown
): Promise<EncryptionRecoveryVerification>;
