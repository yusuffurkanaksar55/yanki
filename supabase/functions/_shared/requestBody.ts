export class RequestPayloadTooLargeError extends Error {}

export async function readJsonBodyWithLimit(
  request: Request,
  maximumBytes: number
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (
    contentLength
    && /^\d+$/u.test(contentLength)
    && Number(contentLength) > maximumBytes
  ) {
    throw new RequestPayloadTooLargeError("REQUEST_PAYLOAD_TOO_LARGE");
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    byteCount += value.byteLength;

    if (byteCount > maximumBytes) {
      throw new RequestPayloadTooLargeError("REQUEST_PAYLOAD_TOO_LARGE");
    }

    chunks.push(value);
  }

  const bodyBytes = new Uint8Array(byteCount);
  let offset = 0;

  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes));
  } catch {
    return null;
  }
}
