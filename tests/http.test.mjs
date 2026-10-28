import test from "node:test";
import assert from "node:assert/strict";
import { readJson, RequestBodyError } from "../src/server/request-body.ts";
import { requestRateLimitKey } from "../src/server/rate-limit.ts";

test("bounded JSON reader accepts valid object bodies", async () => {
  const request = new Request("https://life.test/api/example", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "ok" }),
  });
  assert.deepEqual(await readJson(request), { value: "ok" });
});

test("bounded JSON reader rejects an oversized declared body without reading it", async () => {
  const request = new Request("https://life.test/api/example", {
    method: "POST",
    headers: { "Content-Length": "100" },
    body: "{}",
  });
  await assert.rejects(readJson(request, 8), (error) => error instanceof RequestBodyError && error.status === 413);
});

test("bounded JSON reader stops consuming a chunked body at the byte limit", async () => {
  let cancelled = false;
  const request = new Request("https://life.test/api/example", {
    method: "POST",
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"value":"long"}'));
      },
      cancel() {
        cancelled = true;
      },
    }),
    duplex: "half",
  });
  await assert.rejects(readJson(request, 8), (error) => error instanceof RequestBodyError && error.status === 413);
  assert.equal(cancelled, true);
});

test("bounded JSON reader reports invalid UTF-8 and malformed JSON as client errors", async () => {
  const invalidUtf8 = new Request("https://life.test/api/example", {
    method: "POST",
    body: new Uint8Array([0xff]),
    duplex: "half",
  });
  await assert.rejects(readJson(invalidUtf8), (error) => error instanceof RequestBodyError && error.status === 400);
  const malformedJson = new Request("https://life.test/api/example", { method: "POST", body: "{" });
  await assert.rejects(readJson(malformedJson), (error) => error instanceof RequestBodyError && error.status === 400);
});

test("untrusted forwarding headers cannot choose rate-limit identity", () => {
  const request = new Request("https://life.test/api/charts", {
    headers: { "X-Forwarded-For": "spoofed-client, actual-client" },
  });
  const previous = process.env.LIFE_TRUST_PROXY_HEADERS;
  try {
    delete process.env.LIFE_TRUST_PROXY_HEADERS;
    assert.equal(requestRateLimitKey(request), "unknown:/api/charts");
    process.env.LIFE_TRUST_PROXY_HEADERS = "true";
    assert.equal(requestRateLimitKey(request), "actual-client:/api/charts");
    const realIpOnly = new Request("https://life.test/api/login", { headers: { "X-Real-IP": "trusted-client" } });
    assert.equal(requestRateLimitKey(realIpOnly), "trusted-client:/api/login");
  } finally {
    if (previous === undefined) delete process.env.LIFE_TRUST_PROXY_HEADERS;
    else process.env.LIFE_TRUST_PROXY_HEADERS = previous;
  }
});
