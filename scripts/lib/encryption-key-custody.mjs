import { createHash, randomBytes, timingSafeEqual, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { assertEncryptionKeyVersion } from "./encryption-key-rotation.mjs";

const allowedManifestFields = new Set([
  "schemaVersion",
  "environmentId",
  "activeKeyVersion",
  "keyVersions"
]);
const allowedKeyVersionFields = new Set([
  "version",
  "status",
  "primaryCustodyControlDomain",
  "primaryCustodyReference",
  "recoveryCustodyControlDomain",
  "recoveryCustodyReference",
  "custodianRoles"
]);
const allowedStatuses = new Set(["ACTIVE", "DECRYPT_ONLY"]);
const forbiddenMaterialFields = new Set([
  "credential",
  "keyMaterial",
  "password",
  "privateKey",
  "secret",
  "token",
  "value"
]);
const textEncoder = new TextEncoder();

export async function readKeyCustodyManifest(manifestPath) {
  if (typeof manifestPath !== "string" || manifestPath.trim() === "") {
    throw new Error("EVALUATION_KEY_CUSTODY_MANIFEST_PATH is required.");
  }

  const contents = await readFile(manifestPath, "utf8");
  let parsed;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("The key custody manifest must contain valid JSON.");
  }

  return validateKeyCustodyManifest(parsed);
}

export function validateKeyCustodyManifest(value) {
  assertRecord(value, "The key custody manifest must be an object.");
  assertAllowedFields(value, allowedManifestFields);
  assertNoEmbeddedKeyMaterial(value);

  if (value.schemaVersion !== 1) {
    throw new Error("The key custody manifest schema version must be 1.");
  }

  if (
    typeof value.environmentId !== "string"
    || !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(value.environmentId)
  ) {
    throw new Error("The custody environment id is invalid.");
  }

  assertEncryptionKeyVersion(value.activeKeyVersion);

  if (
    !Array.isArray(value.keyVersions)
    || value.keyVersions.length === 0
    || value.keyVersions.length > 32
  ) {
    throw new Error("The custody manifest must contain 1-32 key versions.");
  }

  const versions = new Set();
  let activeCount = 0;
  const keyVersions = value.keyVersions.map((entry) => {
    assertRecord(entry, "Every custody key version must be an object.");
    assertAllowedFields(entry, allowedKeyVersionFields);
    assertEncryptionKeyVersion(entry.version);

    if (versions.has(entry.version)) {
      throw new Error("The custody manifest contains a duplicate key version.");
    }

    versions.add(entry.version);

    if (!allowedStatuses.has(entry.status)) {
      throw new Error("A custody key status is invalid.");
    }

    if (entry.status === "ACTIVE") {
      activeCount += 1;
    }

    assertCustodyReference(entry.primaryCustodyReference);
    assertCustodyReference(entry.recoveryCustodyReference);
    assertControlDomain(entry.primaryCustodyControlDomain);
    assertControlDomain(entry.recoveryCustodyControlDomain);

    if (
      entry.primaryCustodyReference === entry.recoveryCustodyReference
      || entry.primaryCustodyControlDomain === entry.recoveryCustodyControlDomain
    ) {
      throw new Error("Primary and recovery custody references must be independent.");
    }

    if (
      !Array.isArray(entry.custodianRoles)
      || entry.custodianRoles.length < 2
      || entry.custodianRoles.length > 8
    ) {
      throw new Error("Every key version requires at least two custodian roles.");
    }

    const custodianRoles = entry.custodianRoles.map((role) => {
      if (
        typeof role !== "string"
        || !/^[A-Z][A-Z0-9_]{1,47}$/u.test(role)
      ) {
        throw new Error("A custody role identifier is invalid.");
      }

      return role;
    });

    if (new Set(custodianRoles).size !== custodianRoles.length) {
      throw new Error("Custodian roles must be distinct.");
    }

    return Object.freeze({
      version: entry.version,
      status: entry.status,
      primaryCustodyControlDomain: entry.primaryCustodyControlDomain,
      primaryCustodyReference: entry.primaryCustodyReference,
      recoveryCustodyControlDomain: entry.recoveryCustodyControlDomain,
      recoveryCustodyReference: entry.recoveryCustodyReference,
      custodianRoles: Object.freeze(custodianRoles)
    });
  });

  if (
    activeCount !== 1
    || !keyVersions.some((entry) => (
      entry.version === value.activeKeyVersion && entry.status === "ACTIVE"
    ))
  ) {
    throw new Error("The manifest must have one matching active key version.");
  }

  return Object.freeze({
    schemaVersion: 1,
    environmentId: value.environmentId,
    activeKeyVersion: value.activeKeyVersion,
    keyVersions: Object.freeze(keyVersions)
  });
}

export function loadCustodiedEncryptionKeys(manifest, environment = process.env) {
  const keys = new Map();

  for (const entry of manifest.keyVersions) {
    const encodedKey = environment[
      `EVALUATION_ENCRYPTION_KEY_VERSION_${entry.version}`
    ];

    if (typeof encodedKey !== "string" || encodedKey.trim() === "") {
      throw new Error("A key required by the custody manifest is not configured.");
    }

    keys.set(entry.version, decodeEncryptionKey(encodedKey.trim()));
  }

  return keys;
}

export async function createEncryptionRecoveryCanaries(manifest, keys) {
  const canaries = [];

  for (const entry of manifest.keyVersions) {
    const keyBytes = keys.get(entry.version);

    if (!keyBytes) {
      throw new Error("A key required for recovery canary creation is missing.");
    }

    const nonce = randomBytes(12);
    const canary = randomBytes(32);
    const cryptoKey = await importAesKey(keyBytes, ["encrypt"]);
    const encryptedCanary = await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: nonce,
        additionalData: createAuthenticatedContext(
          manifest.environmentId,
          entry.version
        ),
        tagLength: 128
      },
      cryptoKey,
      canary
    );

    canaries.push({
      encryptionKeyVersion: entry.version,
      encryptedCanary: Buffer.from(encryptedCanary).toString("base64"),
      nonce: nonce.toString("base64"),
      canaryDigest: createHash("sha256").update(canary).digest("base64"),
      contextVersion: 1
    });
  }

  return canaries;
}

export async function verifyEncryptionRecoveryCanaries(manifest, keys, records) {
  if (!Array.isArray(records) || records.length !== manifest.keyVersions.length) {
    throw new Error("The restored database does not contain the complete recovery canary set.");
  }

  const recordsByVersion = new Map();

  for (const record of records) {
    assertRecoveryCanaryRecord(record);

    if (recordsByVersion.has(record.encryptionKeyVersion)) {
      throw new Error("The restored database contains duplicate recovery canaries.");
    }

    recordsByVersion.set(record.encryptionKeyVersion, record);
  }

  for (const entry of manifest.keyVersions) {
    const record = recordsByVersion.get(entry.version);
    const keyBytes = keys.get(entry.version);

    if (!record || !keyBytes) {
      throw new Error("The restored recovery canary set does not match custody inventory.");
    }

    try {
      const encryptedCanary = decodeCanonicalBase64(record.encryptedCanary);
      const nonce = decodeCanonicalBase64(record.nonce);
      const expectedDigest = decodeCanonicalBase64(record.canaryDigest);

      if (nonce.length !== 12 || expectedDigest.length !== 32) {
        throw new Error("Invalid recovery canary encoding.");
      }

      const cryptoKey = await importAesKey(keyBytes, ["decrypt"]);
      const decryptedCanary = Buffer.from(await webcrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: nonce,
          additionalData: createAuthenticatedContext(
            manifest.environmentId,
            entry.version
          ),
          tagLength: 128
        },
        cryptoKey,
        encryptedCanary
      ));
      const actualDigest = createHash("sha256").update(decryptedCanary).digest();

      if (!timingSafeEqual(actualDigest, expectedDigest)) {
        throw new Error("Recovery canary digest mismatch.");
      }
    } catch {
      throw new Error("A restored recovery canary could not be decrypted.");
    }
  }

  if (recordsByVersion.size !== manifest.keyVersions.length) {
    throw new Error("The restored recovery canary set does not match custody inventory.");
  }

  return {
    canaryCount: records.length,
    allCustodiedKeysRecovered: true,
    decryptedContentLogged: false,
    keyMaterialLogged: false
  };
}

function assertRecoveryCanaryRecord(record) {
  assertRecord(record, "A restored recovery canary is invalid.");
  const fields = new Set([
    "encryptionKeyVersion",
    "encryptedCanary",
    "nonce",
    "canaryDigest",
    "contextVersion"
  ]);
  assertAllowedFields(record, fields);
  assertEncryptionKeyVersion(record.encryptionKeyVersion);

  if (
    typeof record.encryptedCanary !== "string"
    || typeof record.nonce !== "string"
    || typeof record.canaryDigest !== "string"
    || record.contextVersion !== 1
  ) {
    throw new Error("A restored recovery canary is invalid.");
  }
}

function assertAllowedFields(value, allowedFields) {
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throw new Error("The key custody document contains an unsupported field.");
    }
  }
}

function assertNoEmbeddedKeyMaterial(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoEmbeddedKeyMaterial);
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [field, nestedValue] of Object.entries(value)) {
    if (forbiddenMaterialFields.has(field)) {
      throw new Error("Key material and credentials are forbidden in custody manifests.");
    }

    assertNoEmbeddedKeyMaterial(nestedValue);
  }
}

function assertCustodyReference(value) {
  if (
    typeof value !== "string"
    || value.length > 512
    || !/^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/u.test(value)
  ) {
    throw new Error("A custody reference is invalid.");
  }

  const parsed = new URL(value);

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Custody references cannot contain credentials or query data.");
  }
}

function assertControlDomain(value) {
  if (
    typeof value !== "string"
    || !/^[A-Z][A-Z0-9_]{1,63}$/u.test(value)
  ) {
    throw new Error("A custody control domain is invalid.");
  }
}

function decodeEncryptionKey(value) {
  const bytes = decodeCanonicalBase64(value);

  if (bytes.length !== 32) {
    throw new Error("Every custodied encryption key must be a 32-byte base64 value.");
  }

  return bytes;
}

function decodeCanonicalBase64(value) {
  if (
    typeof value !== "string"
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ) {
    throw new Error("A base64 value is invalid.");
  }

  const bytes = Buffer.from(value, "base64");

  if (bytes.toString("base64") !== value) {
    throw new Error("A base64 value is not canonical.");
  }

  return bytes;
}

function createAuthenticatedContext(environmentId, encryptionKeyVersion) {
  return textEncoder.encode(JSON.stringify({
    schemaVersion: 1,
    purpose: "evaluation-encryption-recovery-canary",
    environmentId,
    encryptionKeyVersion,
    contextVersion: 1
  }));
}

async function importAesKey(keyBytes, usages) {
  return webcrypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    usages
  );
}

function assertRecord(value, message) {
  if (!isRecord(value)) {
    throw new Error(message);
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
