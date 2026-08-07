export const encryptionKeyVersionSecretPrefix: string;
export function createEncryptionKeyRotationEnvironment(
  version: string,
  encodedKey: string
): string;
export function assertEncryptionKeyVersion(version: string): void;
