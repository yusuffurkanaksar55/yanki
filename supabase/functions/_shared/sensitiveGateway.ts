const gatewayTokenHeader = "x-yanki-sensitive-gateway-token";
const maximumTokenLength = 256;
const minimumTokenLength = 32;

export class SensitiveGatewayAccessError extends Error {}
export class SensitiveGatewayConfigurationError extends Error {}

export async function enforceSensitiveGateway(request: Request): Promise<void> {
  const required = Deno.env.get("YANKI_SENSITIVE_GATEWAY_REQUIRED")?.trim()
    === "true";
  const expectedToken = Deno.env.get("YANKI_SENSITIVE_GATEWAY_TOKEN")?.trim();

  if (!expectedToken) {
    if (required) {
      throw new SensitiveGatewayConfigurationError(
        "SENSITIVE_GATEWAY_CONFIGURATION_INVALID"
      );
    }

    return;
  }

  if (
    expectedToken.length < minimumTokenLength
    || expectedToken.length > maximumTokenLength
    || !/^[A-Za-z0-9_-]+$/u.test(expectedToken)
  ) {
    throw new SensitiveGatewayConfigurationError(
      "SENSITIVE_GATEWAY_CONFIGURATION_INVALID"
    );
  }

  const providedToken = request.headers.get(gatewayTokenHeader) ?? "";

  if (!await tokensMatch(expectedToken, providedToken)) {
    throw new SensitiveGatewayAccessError("SENSITIVE_GATEWAY_REQUIRED");
  }
}

async function tokensMatch(expected: string, provided: string) {
  const encoder = new TextEncoder();
  const [expectedDigest, providedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided))
  ]);
  const expectedBytes = new Uint8Array(expectedDigest);
  const providedBytes = new Uint8Array(providedDigest);
  let difference = 0;

  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ providedBytes[index];
  }

  return difference === 0;
}
