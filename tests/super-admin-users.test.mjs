import test from "node:test";
import assert from "node:assert/strict";
import { parseSuperAdminUserFilters } from "../src/server/super-admin-users.ts";

test("Super Admin user filters accept bounded pagination, account search and known roles", () => {
  assert.deepEqual(parseSuperAdminUserFilters(new URLSearchParams()), {
    ok: true,
    value: { page: 1, role: null, query: "" },
  });
  assert.deepEqual(parseSuperAdminUserFilters(new URLSearchParams("page=3&q=person%40example.com&role=ADMIN")), {
    ok: true,
    value: { page: 3, role: "ADMIN", query: "person@example.com" },
  });
  assert.deepEqual(parseSuperAdminUserFilters(new URLSearchParams("role=ALL")), {
    ok: true,
    value: { page: 1, role: null, query: "" },
  });
});

test("Super Admin user filters reject invalid pages, roles, repeated or unknown parameters, and unsafe search input", () => {
  for (const query of ["page=0", "page=-1", "page=100001", "role=OWNER", "role=", "q=", "q=%20%20", "q=cm%00hidden", `q=${"x".repeat(255)}`, "page=1&page=2", "role=USER&role=ADMIN", "email=person%40example.com", "id=cm123"]) {
    assert.deepEqual(parseSuperAdminUserFilters(new URLSearchParams(query)), { ok: false }, query);
  }
});
