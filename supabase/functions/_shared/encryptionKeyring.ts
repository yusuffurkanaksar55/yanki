export const encryptionKeyVersionSecretPrefix =
  "EVALUATION_ENCRYPTION_KEY_VERSION_";

export type EvaluationEncryptionKeyring = {
  readonly activeVersion: string;
  readonly keys: ReadonlyMap<string, Uint8Array>;
};

export type EvaluationEncryptionKeyHealth = {
  readonly activeKeyConfigured: boolean;
  readonly allReferencedKeysConfigured: boolean;
  readonly configurationValid: boolean;
  readonly configuredKeyCount: number;
  readonly healthy: boolean;
  readonly referencedKeyCount: number;
};

export function parseEvaluationEncryptionKeyring(
  environment: Readonly<Record<string, string | undefined>>
): EvaluationEncryptionKeyring {
  const activeVersion = readRequiredValue(
    environment.EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION,
    "EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION"
  );

  if (!isValidKeyVersion(activeVersion)) {
    throw new Error("EVALUATION_ENCRYPTION_KEY_VERSION_INVALID");
  }

  const keys = new Map<string, Uint8Array>();
  const serializedLegacyKeyring =
    environment.EVALUATION_ENCRYPTION_KEYRING?.trim();

  if (serializedLegacyKeyring) {
    addLegacyKeyring(keys, serializedLegacyKeyring);
  }

  for (const [name, value] of Object.entries(environment)) {
    if (!name.startsWith(encryptionKeyVersionSecretPrefix)) {
      continue;
    }

    const version = name.slice(encryptionKeyVersionSecretPrefix.length);

    if (!/^[A-Z0-9_]{1,48}$/u.test(version) || !value?.trim()) {
      throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
    }

    addKey(keys, version, value.trim());
  }

  if (keys.size === 0 || !keys.has(activeVersion)) {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  return { activeVersion, keys };
}

export function inspectEvaluationEncryptionKeyring(
  environment: Readonly<Record<string, string | undefined>>,
  referencedVersions: readonly string[]
): EvaluationEncryptionKeyHealth {
  const uniqueReferencedVersions = [...new Set(referencedVersions)];

  try {
    const keyring = parseEvaluationEncryptionKeyring(environment);
    const allReferencedKeysConfigured = uniqueReferencedVersions.every(
      (version) => keyring.keys.has(version)
    );

    return {
      activeKeyConfigured: keyring.keys.has(keyring.activeVersion),
      allReferencedKeysConfigured,
      configurationValid: true,
      configuredKeyCount: keyring.keys.size,
      healthy: allReferencedKeysConfigured,
      referencedKeyCount: uniqueReferencedVersions.length
    };
  } catch {
    return {
      activeKeyConfigured: false,
      allReferencedKeysConfigured: false,
      configurationValid: false,
      configuredKeyCount: 0,
      healthy: false,
      referencedKeyCount: uniqueReferencedVersions.length
    };
  }
}

function addLegacyKeyring(
  keys: Map<string, Uint8Array>,
  serializedKeyring: string
): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedKeyring);
  } catch {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  if (!isRecord(parsed) || Object.keys(parsed).length > 128) {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  for (const [version, encodedKey] of Object.entries(parsed)) {
    if (!isValidKeyVersion(version) || typeof encodedKey !== "string") {
      throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
    }

    addKey(keys, version, encodedKey);
  }
}

function addKey(
  keys: Map<string, Uint8Array>,
  version: string,
  encodedKey: string
): void {
  if (keys.has(version)) {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  const keyBytes = decodeEncryptionKey(encodedKey.trim());

  if (keyBytes.length !== 32) {
    throw new Error("EVALUATION_ENCRYPTION_KEY_INVALID");
  }

  keys.set(version, keyBytes);
}

function decodeEncryptionKey(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/u.test(value)) {
    throw new Error("EVALUATION_ENCRYPTION_KEY_INVALID");
  }

  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("EVALUATION_ENCRYPTION_KEY_INVALID");
  }
}

function isValidKeyVersion(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,64}$/u.test(value);
}

function readRequiredValue(value: string | undefined, name: string): string {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`${name} is required.`);
  }

  return trimmedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
