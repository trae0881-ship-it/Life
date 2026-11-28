import test from "node:test";
import assert from "node:assert/strict";
import {
  handleDeveloperProfile,
  handleSuperAdminDevelopers,
} from "../src/server/api-developer-lifecycle.ts";

function profileRequest(method, body, path = "/api/developer/profile") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      origin: "http://localhost",
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function profileRepository() {
  const state = { profiles: new Map(), audit: [], updates: [] };
  const repository = {
    apiDeveloperProfile: {
      async findUnique({ where }) {
        return state.profiles.get(where.userId) ?? null;
      },
      async create({ data }) {
        const profile = { ...data, userId: data.userId, status: data.status };
        state.profiles.set(data.userId, profile);
        return profile;
      },
      async updateMany({ where, data }) {
        const profile = state.profiles.get(where.userId);
        if (!profile || profile.status !== where.status) return { count: 0 };
        Object.assign(profile, data);
        state.updates.push({ where, data });
        return { count: 1 };
      },
    },
    user: {
      async updateMany({ where, data }) {
        state.updates.push({ where, data });
        return { count: 1 };
      },
    },
    apiPlatformAuditLog: {
      async create({ data }) {
        state.audit.push(data);
        return data;
      },
    },
    async $transaction(callback) {
      return callback(repository);
    },
  };
  return { repository, state };
}

test("Developer applications bind to the authenticated user and do not duplicate pending submissions", async () => {
  const { repository, state } = profileRepository();
  const applicant = { id: "applicant-1", role: "USER" };
  const invalid = await handleDeveloperProfile(profileRequest("POST", {
    applicationReason: "Build a documented integration.",
    userId: "another-user",
  }), applicant, () => repository);
  assert.equal(invalid.status, 422);

  const body = {
    organizationName: "Example Studio",
    website: "https://example.test",
    applicationReason: "Build a documented integration.",
  };
  const submitted = await handleDeveloperProfile(profileRequest("POST", body), applicant, () => repository);
  assert.equal(submitted.status, 201);
  assert.equal((await submitted.json()).profile.userId, applicant.id);
  assert.equal(state.profiles.get(applicant.id).status, "PENDING");
  assert.equal(state.profiles.has("another-user"), false);
  assert.equal(state.audit[0].action, "DEVELOPER_APPLIED");

  const repeated = await handleDeveloperProfile(profileRequest("POST", body), applicant, () => repository);
  assert.equal(repeated.status, 409);
  assert.equal((await repeated.json()).code, "APPLICATION_PENDING");
  assert.equal(state.audit.length, 1);
});

test("Developer review promotes only a pending USER and records the Super Admin action", async () => {
  const { repository, state } = profileRepository();
  state.profiles.set("applicant-1", { userId: "applicant-1", status: "PENDING", user: { role: "USER" } });
  const response = await handleSuperAdminDevelopers(
    profileRequest("PATCH", { action: "verify" }, "/api/super-admin/developers/applicant-1"),
    { id: "root-1", role: "SUPER_ADMIN" },
    () => repository,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { userId: "applicant-1", status: "VERIFIED" });
  assert.equal(state.profiles.get("applicant-1").status, "VERIFIED");
  assert.equal(state.updates.length, 2);
  assert.deepEqual(state.updates[0].where, { userId: "applicant-1", status: "PENDING" });
  assert.equal(state.updates[0].data.status, "VERIFIED");
  assert.equal(state.updates[0].data.reviewedByUserId, "root-1");
  assert.deepEqual(state.updates[1], {
    where: { id: "applicant-1", role: "USER" },
    data: { role: "DEVELOPER" },
  });
  assert.equal(state.audit[0].actorUserId, "root-1");
  assert.equal(state.audit[0].action, "DEVELOPER_VERIFY");
});
