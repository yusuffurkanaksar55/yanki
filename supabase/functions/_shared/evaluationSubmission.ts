export const encryptionAlgorithm = "AES-256-GCM";
export const encryptionContextVersion = 1;
export const payloadSchemaVersion = 1;

export type EncryptionContext = {
  readonly organizationId: string;
  readonly evaluationCycleId: string;
  readonly projectId: string | null;
  readonly subjectUserId: string;
  readonly templateVersionId: string;
  readonly assignmentKind: string;
};

export type EncryptedPayload = {
  readonly ciphertextHex: string;
  readonly keyVersion: string;
  readonly nonceHex: string;
};

export async function createAnonymousCredential(): Promise<{
  readonly digestHex: string;
  readonly token: string;
}> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));

  return {
    digestHex: await sha256Hex(tokenBytes),
    token: toBase64Url(tokenBytes)
  };
}

export async function hashAnonymousCredential(token: string): Promise<string> {
  const tokenBytes = fromBase64Url(token);

  if (tokenBytes.length !== 32) {
    throw new RequestValidationError("ANONYMOUS_CREDENTIAL_INVALID");
  }

  return sha256Hex(tokenBytes);
}

export async function encryptEvaluationPayload(
  plaintext: Record<string, unknown>,
  context: EncryptionContext
): Promise<EncryptedPayload> {
  const keyring = readEncryptionKeyring();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(
    serializeEncryptionContext(context)
  );
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(plaintext));

  if (plaintextBytes.length > 1048560) {
    throw new RequestValidationError("EVALUATION_PAYLOAD_TOO_LARGE");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyring.keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt(
    {
      additionalData,
      iv: nonce,
      name: "AES-GCM",
      tagLength: 128
    },
    key,
    plaintextBytes
  );

  return {
    ciphertextHex: toHex(new Uint8Array(ciphertext)),
    keyVersion: keyring.activeVersion,
    nonceHex: toHex(nonce)
  };
}

export function serializeEncryptionContext(context: EncryptionContext): string {
  return JSON.stringify({
    assignmentKind: context.assignmentKind,
    encryptionContextVersion,
    evaluationCycleId: context.evaluationCycleId,
    organizationId: context.organizationId,
    projectId: context.projectId,
    subjectUserId: context.subjectUserId,
    templateVersionId: context.templateVersionId
  });
}

function readEncryptionKeyring(): {
  readonly activeVersion: string;
  readonly keyBytes: Uint8Array;
} {
  const activeVersion = readRequiredEnvironmentValue(
    "EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION"
  );
  const serializedKeyring = readRequiredEnvironmentValue(
    "EVALUATION_ENCRYPTION_KEYRING"
  );

  if (!/^[A-Za-z0-9._-]{1,64}$/.test(activeVersion)) {
    throw new Error("EVALUATION_ENCRYPTION_KEY_VERSION_INVALID");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedKeyring);
  } catch {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  if (!isRecord(parsed) || typeof parsed[activeVersion] !== "string") {
    throw new Error("EVALUATION_ENCRYPTION_KEYRING_INVALID");
  }

  const keyBytes = fromBase64(String(parsed[activeVersion]));

  if (keyBytes.length !== 32) {
    throw new Error("EVALUATION_ENCRYPTION_KEY_INVALID");
  }

  return { activeVersion, keyBytes };
}

export function readRequiredEnvironmentValue(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function readRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RequestValidationError("REQUEST_BODY_INVALID");
  }

  return value;
}

export function readRequiredUuid(value: unknown, errorCode: string): string {
  if (
    typeof value !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new RequestValidationError(errorCode);
  }

  return value;
}

export function readRequiredString(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestValidationError(errorCode);
  }

  return value.trim();
}

export function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function readBoolean(value: unknown): boolean {
  return value === true;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class RequestValidationError extends Error {}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return toHex(new Uint8Array(digest));
}

function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(value: Uint8Array): string {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    throw new RequestValidationError("ANONYMOUS_CREDENTIAL_INVALID");
  }

  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return fromBase64(`${normalized}=`);
}

function fromBase64(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("BASE64_VALUE_INVALID");
  }
}
