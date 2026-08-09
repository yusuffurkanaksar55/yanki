import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  createEncryptionRecoveryCanaries,
  loadCustodiedEncryptionKeys,
  validateKeyCustodyManifest,
  verifyEncryptionRecoveryCanaries
} from "../scripts/lib/encryption-key-custody.mjs";

describe("encryption key custody", () => {
  it("requires independent recovery custody and two-person control", () => {
    const manifest = validateKeyCustodyManifest(createManifest());

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.keyVersions).toHaveLength(2);
    expect(manifest.keyVersions[0]?.custodianRoles).toEqual([
      "SECURITY_CUSTODIAN",
      "OPERATIONS_CUSTODIAN"
    ]);
  });

  it("rejects embedded secrets, duplicate custody, and invalid active state", () => {
    expect(() => validateKeyCustodyManifest({
      ...createManifest(),
      secret: "must-never-be-here"
    })).toThrow();

    const duplicateCustody = createManifest();
    duplicateCustody.keyVersions[0]!.recoveryCustodyReference =
      duplicateCustody.keyVersions[0]!.primaryCustodyReference;
    expect(() => validateKeyCustodyManifest(duplicateCustody)).toThrow(
      /must be independent/u
    );

    const duplicateControlDomain = createManifest();
    duplicateControlDomain.keyVersions[0]!.recoveryCustodyControlDomain =
      duplicateControlDomain.keyVersions[0]!.primaryCustodyControlDomain;
    expect(() => validateKeyCustodyManifest(duplicateControlDomain)).toThrow(
      /must be independent/u
    );

    const invalidActiveState = createManifest();
    invalidActiveState.keyVersions[1]!.status = "ACTIVE";
    expect(() => validateKeyCustodyManifest(invalidActiveState)).toThrow(
      /one matching active/u
    );
  });

  it("loads every manifest key from a separate server-only environment value", () => {
    const manifest = validateKeyCustodyManifest(createManifest());
    const keys = loadCustodiedEncryptionKeys(manifest, createKeyEnvironment());

    expect(keys.size).toBe(2);
    expect(keys.get("PROD_20260809_01")).toHaveLength(32);
    expect(() => loadCustodiedEncryptionKeys(manifest, {})).toThrow(
      /not configured/u
    );
  });

  it("round-trips only synthetic encrypted canaries for every custodied key", async () => {
    const manifest = validateKeyCustodyManifest(createManifest());
    const keys = loadCustodiedEncryptionKeys(manifest, createKeyEnvironment());
    const canaries = await createEncryptionRecoveryCanaries(manifest, keys);

    expect(canaries).toHaveLength(2);
    expect(canaries[0]).toEqual(expect.objectContaining({
      encryptionKeyVersion: "PROD_20260809_01",
      contextVersion: 1
    }));
    expect(JSON.stringify(canaries)).not.toContain(
      createKeyEnvironment().EVALUATION_ENCRYPTION_KEY_VERSION_PROD_20260809_01
    );

    await expect(
      verifyEncryptionRecoveryCanaries(manifest, keys, canaries)
    ).resolves.toEqual({
      canaryCount: 2,
      allCustodiedKeysRecovered: true,
      decryptedContentLogged: false,
      keyMaterialLogged: false
    });
  });

  it("fails recovery for a wrong key or incomplete restored canary set", async () => {
    const manifest = validateKeyCustodyManifest(createManifest());
    const keys = loadCustodiedEncryptionKeys(manifest, createKeyEnvironment());
    const canaries = await createEncryptionRecoveryCanaries(manifest, keys);
    const wrongKeys = loadCustodiedEncryptionKeys(manifest, {
      ...createKeyEnvironment(),
      EVALUATION_ENCRYPTION_KEY_VERSION_PROD_20260809_01:
        Buffer.alloc(32, 9).toString("base64")
    });

    await expect(
      verifyEncryptionRecoveryCanaries(manifest, wrongKeys, canaries)
    ).rejects.toThrow(/could not be decrypted/u);
    await expect(
      verifyEncryptionRecoveryCanaries(manifest, keys, canaries.slice(0, 1))
    ).rejects.toThrow(/complete recovery canary set/u);
  });
});

function createManifest() {
  return {
    schemaVersion: 1,
    environmentId: "production-yanki",
    activeKeyVersion: "PROD_20260809_01",
    keyVersions: [
      {
        version: "PROD_20260809_01",
        status: "ACTIVE",
        primaryCustodyControlDomain: "PLATFORM_OPERATIONS",
        primaryCustodyReference:
          "secret-manager://production/evaluation/PROD_20260809_01",
        recoveryCustodyControlDomain: "SECURITY_ESCROW",
        recoveryCustodyReference:
          "offline-escrow://production/evaluation/PROD_20260809_01",
        custodianRoles: ["SECURITY_CUSTODIAN", "OPERATIONS_CUSTODIAN"]
      },
      {
        version: "PROD_20260701_01",
        status: "DECRYPT_ONLY",
        primaryCustodyControlDomain: "PLATFORM_OPERATIONS",
        primaryCustodyReference:
          "secret-manager://production/evaluation/PROD_20260701_01",
        recoveryCustodyControlDomain: "SECURITY_ESCROW",
        recoveryCustodyReference:
          "offline-escrow://production/evaluation/PROD_20260701_01",
        custodianRoles: ["SECURITY_CUSTODIAN", "OPERATIONS_CUSTODIAN"]
      }
    ]
  };
}

function createKeyEnvironment() {
  return {
    EVALUATION_ENCRYPTION_KEY_VERSION_PROD_20260809_01:
      Buffer.alloc(32, 1).toString("base64"),
    EVALUATION_ENCRYPTION_KEY_VERSION_PROD_20260701_01:
      Buffer.alloc(32, 2).toString("base64")
  };
}
