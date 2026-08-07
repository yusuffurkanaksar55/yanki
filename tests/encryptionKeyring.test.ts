import { describe, expect, it } from "vitest";
import {
  inspectEvaluationEncryptionKeyring,
  parseEvaluationEncryptionKeyring
} from "../supabase/functions/_shared/encryptionKeyring";

const legacyKey = encodeKey(1);
const additiveKey = encodeKey(2);

describe("evaluation encryption keyring", () => {
  it("keeps the legacy JSON keyring readable", () => {
    const keyring = parseEvaluationEncryptionKeyring({
      EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION: "legacy-v1",
      EVALUATION_ENCRYPTION_KEYRING: JSON.stringify({
        "legacy-v1": legacyKey
      })
    });

    expect(keyring.activeVersion).toBe("legacy-v1");
    expect(keyring.keys.get("legacy-v1")).toEqual(new Uint8Array(32).fill(1));
  });

  it("adds an independently managed active key without replacing legacy keys", () => {
    const keyring = parseEvaluationEncryptionKeyring({
      EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION: "DEV_20260807_01",
      EVALUATION_ENCRYPTION_KEYRING: JSON.stringify({
        "legacy-v1": legacyKey
      }),
      EVALUATION_ENCRYPTION_KEY_VERSION_DEV_20260807_01: additiveKey
    });

    expect([...keyring.keys.keys()]).toEqual([
      "legacy-v1",
      "DEV_20260807_01"
    ]);
    expect(keyring.activeVersion).toBe("DEV_20260807_01");
  });

  it("rejects duplicate versions across legacy and additive secrets", () => {
    expect(() => parseEvaluationEncryptionKeyring({
      EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION: "DEV_V1",
      EVALUATION_ENCRYPTION_KEYRING: JSON.stringify({ DEV_V1: legacyKey }),
      EVALUATION_ENCRYPTION_KEY_VERSION_DEV_V1: additiveKey
    })).toThrow("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  });

  it("rejects malformed or incorrectly sized key material", () => {
    expect(() => parseEvaluationEncryptionKeyring({
      EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION: "DEV_V1",
      EVALUATION_ENCRYPTION_KEY_VERSION_DEV_V1: btoa("too-short")
    })).toThrow("EVALUATION_ENCRYPTION_KEY_INVALID");
  });

  it("reports missing historical coverage without exposing versions", () => {
    const health = inspectEvaluationEncryptionKeyring(
      {
        EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION: "DEV_V2",
        EVALUATION_ENCRYPTION_KEY_VERSION_DEV_V2: additiveKey
      },
      ["legacy-v1", "legacy-v1"]
    );

    expect(health).toEqual({
      activeKeyConfigured: true,
      allReferencedKeysConfigured: false,
      configurationValid: true,
      configuredKeyCount: 1,
      healthy: false,
      referencedKeyCount: 1
    });
  });
});

function encodeKey(fill: number): string {
  const bytes = new Uint8Array(32).fill(fill);
  return btoa(String.fromCharCode(...bytes));
}
