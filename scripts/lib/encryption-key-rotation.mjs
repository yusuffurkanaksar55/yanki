export const encryptionKeyVersionSecretPrefix =
  "EVALUATION_ENCRYPTION_KEY_VERSION_";

export function createEncryptionKeyRotationEnvironment(version, encodedKey) {
  assertEncryptionKeyVersion(version);
  assertEncryptionKey(encodedKey);

  return [
    `${encryptionKeyVersionSecretPrefix}${version}=${encodedKey}`,
    `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION=${version}`,
    ""
  ].join("\n");
}

export function assertEncryptionKeyVersion(version) {
  if (typeof version !== "string" || !/^[A-Z][A-Z0-9_]{0,47}$/u.test(version)) {
    throw new Error(
      "The key version must use 1-48 uppercase letters, digits, or underscores and start with a letter."
    );
  }
}

function assertEncryptionKey(encodedKey) {
  if (
    typeof encodedKey !== "string"
    || !/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/u.test(encodedKey)
  ) {
    throw new Error("The encryption key must be a 32-byte base64 value.");
  }
}
