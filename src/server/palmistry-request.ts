import { RequestBodyError } from "./http.ts";
import { MAX_PALMISTRY_REQUEST_BYTES } from "./palmistry-files.ts";

export async function readPalmistryUploadForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Choose a hand image to upload.", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PALMISTRY_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyError("Choose an image smaller than 10 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  } catch {
    throw new RequestBodyError("Choose one image using a supported upload form.", 400);
  }
}
