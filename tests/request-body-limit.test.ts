import { describe, expect, it } from "vitest";
import {
  readJsonBodyWithLimit,
  RequestPayloadTooLargeError
} from "../supabase/functions/_shared/requestBody";

describe("request body limits", () => {
  it("parses a JSON body that remains within the byte limit", async () => {
    const request = new Request("https://example.test/submit", {
      body: JSON.stringify({ value: "safe" }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    await expect(readJsonBodyWithLimit(request, 128)).resolves.toEqual({
      value: "safe"
    });
  });

  it("rejects a declared content length above the limit", async () => {
    const request = new Request("https://example.test/submit", {
      body: "{}",
      headers: { "Content-Length": "129" },
      method: "POST"
    });

    await expect(readJsonBodyWithLimit(request, 128)).rejects.toBeInstanceOf(
      RequestPayloadTooLargeError
    );
  });

  it("rejects streamed bytes above the limit when length is not declared", async () => {
    const request = new Request("https://example.test/submit", {
      body: JSON.stringify({ value: "x".repeat(256) }),
      method: "POST"
    });

    await expect(readJsonBodyWithLimit(request, 64)).rejects.toMatchObject({
      message: "REQUEST_PAYLOAD_TOO_LARGE"
    });
  });
});
