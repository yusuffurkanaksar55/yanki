import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enforceSensitiveGateway,
  SensitiveGatewayAccessError,
  SensitiveGatewayConfigurationError
} from "../supabase/functions/_shared/sensitiveGateway.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sensitive gateway enforcement", () => {
  it("preserves direct synthetic development when enforcement is unconfigured", async () => {
    stubEnvironment({});

    await expect(enforceSensitiveGateway(createRequest())).resolves.toBeUndefined();
  });

  it("fails closed when production enforcement has no token", async () => {
    stubEnvironment({ YANKI_SENSITIVE_GATEWAY_REQUIRED: "true" });

    await expect(enforceSensitiveGateway(createRequest())).rejects.toBeInstanceOf(
      SensitiveGatewayConfigurationError
    );
  });

  it("rejects a missing or incorrect configured gateway token", async () => {
    const token = "a".repeat(64);

    stubEnvironment({ YANKI_SENSITIVE_GATEWAY_TOKEN: token });

    await expect(enforceSensitiveGateway(createRequest())).rejects.toBeInstanceOf(
      SensitiveGatewayAccessError
    );
    await expect(enforceSensitiveGateway(
      createRequest("b".repeat(64))
    )).rejects.toBeInstanceOf(SensitiveGatewayAccessError);
  });

  it("accepts only the exact configured gateway token", async () => {
    const token = "c".repeat(64);

    stubEnvironment({
      YANKI_SENSITIVE_GATEWAY_REQUIRED: "true",
      YANKI_SENSITIVE_GATEWAY_TOKEN: token
    });

    await expect(enforceSensitiveGateway(
      createRequest(token)
    )).resolves.toBeUndefined();
  });

  it("rejects token values outside the bounded base64url form", async () => {
    stubEnvironment({
      YANKI_SENSITIVE_GATEWAY_TOKEN: `${"d".repeat(32)};invalid`
    });

    await expect(enforceSensitiveGateway(createRequest())).rejects.toBeInstanceOf(
      SensitiveGatewayConfigurationError
    );
  });
});

function createRequest(token) {
  return new Request("https://supabase.example.test/functions/v1/sensitive", {
    headers: token
      ? { "x-yanki-sensitive-gateway-token": token }
      : undefined,
    method: "POST"
  });
}

function stubEnvironment(values) {
  vi.stubGlobal("Deno", {
    env: {
      get: (name) => values[name]
    }
  });
}
