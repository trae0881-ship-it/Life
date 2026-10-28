import test from "node:test";
import assert from "node:assert/strict";
import { LIFE_OPENAPI } from "../src/server/openapi.ts";
import { readFileSync } from "node:fs";

test("developer portal publishes the declared OpenAPI version and only intended API routes", () => {
  assert.equal(LIFE_OPENAPI.openapi, "3.1.0");
  assert.deepEqual(Object.keys(LIFE_OPENAPI.paths).sort(), [
    "/api/charts",
    "/api/developer/test",
    "/api/health",
    "/api/locations",
    "/api/transits",
  ]);
  assert.equal(LIFE_OPENAPI.paths["/api/charts"].post.security[0].sessionCookie.length, 0);
  assert.match(LIFE_OPENAPI.info.description, /scoped API key/);
});

test("interactive docs route remains locally backed and links to the API documentation", () => {
  const component = readFileSync(new URL("../src/app/api/docs/SwaggerApiDocs.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /swagger-ui-react/);
  assert.match(component, /credentials:\s*"same-origin"/);
  assert.match(component, /Try this request/);
  assert.match(component, /role="status"/);
  assert.match(component, /API key for this browser tab \(not saved\)/);
  assert.match(component, /Raw OpenAPI JSON/);
});
