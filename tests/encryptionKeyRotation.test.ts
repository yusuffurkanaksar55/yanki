import { describe, expect, it } from "vitest";
import {
  assertEncryptionKeyVersion,
  createEncryptionKeyRotationEnvironment
} from "../scripts/lib/encryption-key-rotation.mjs";

describe("encryption key rotation tooling", () => {
  it("creates an additive secret file without a legacy keyring replacement", () => {
    const encodedKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
    const contents = createEncryptionKeyRotationEnvironment(
      "PROD_20260807_01",
      encodedKey
    );

    expect(contents).toContain(
      `EVALUATION_ENCRYPTION_KEY_VERSION_PROD_20260807_01=${encodedKey}`
    );
    expect(contents).toContain(
      "EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION=PROD_20260807_01"
    );
    expect(contents).not.toContain("EVALUATION_ENCRYPTION_KEYRING=");
  });

  it("rejects versions that cannot map safely to an environment variable", () => {
    expect(() => assertEncryptionKeyVersion("prod-v2")).toThrow();
    expect(() => assertEncryptionKeyVersion("2PROD")).toThrow();
  });
});
