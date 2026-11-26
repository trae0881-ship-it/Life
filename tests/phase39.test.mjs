import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  BLOG_FILTER_STATUSES,
  BLOG_STATUSES,
  createBlogPost,
  deleteBlogPost,
  findPublishedBlogPost,
  listBlogPosts,
  makeBlogSlug,
  updateBlogPost,
  validateBlogInput,
} from "../src/server/blog-management.ts";
import { LIFE_OPENAPI } from "../src/server/openapi.ts";

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function blogInput(overrides = {}) {
  return {
    title: "A Safe Jyotish Introduction",
    slug: "",
    excerpt: "A short overview of documented LIFE chart calculation.",
    body: "<script>alert(1)</script>\n\nPlain text article content.",
    featuredImageUrl: null,
    featuredImageAlt: null,
    authorName: "LIFE Editorial",
    category: "Basics",
    tags: ["Jyotish", "Charts"],
    status: "DRAFT",
    seoTitle: null,
    seoDescription: null,
    canonicalUrl: null,
    robotsIndex: true,
    ...overrides,
  };
}

test("dedicated Super Admin login is role-gated and routes only to the protected admin dashboard", () => {
  const page = source("src/app/super-login/page.tsx");
  const form = source("src/app/super-login/SuperAdminLoginForm.tsx");
  const login = source("src/app/api/auth/login/route.ts");
  const admin = source("src/app/super-admin/page.tsx");
  assert.ok(existsSync(new URL("../src/app/super-login/page.tsx", import.meta.url)));
  assert.match(page, /redirect\("\/super-admin"\)/);
  assert.match(form, /portal: "super-admin"/);
  assert.match(form, /window\.location\.assign\("\/super-admin"\)/);
  assert.match(login, /body\.portal === "super-admin" && user\.role !== "SUPER_ADMIN"/);
  assert.ok(login.indexOf("authenticateCredentials") < login.indexOf("user.role !== \"SUPER_ADMIN\""));
  assert.ok(login.indexOf("user.role !== \"SUPER_ADMIN\"") < login.indexOf("const { token, expiresAt }"));
  assert.match(admin, /user\.role !== "SUPER_ADMIN"/);
  assert.match(admin, /redirect\("\/super-login"\)/);
});

test("Super Admin segment loads its shared stylesheet for every nested dashboard", () => {
  const layout = source("src/app/super-admin/layout.tsx");
  assert.match(layout, /import ["']\.\/super-admin\.css["']/);
  assert.doesNotMatch(source("src/app/super-admin/SuperAdminDashboard.tsx"), /super-admin\.css/);
  assert.doesNotMatch(source("src/app/super-admin/database/page.tsx"), /super-admin\.css/);
});

test("blog validation generates safe slugs and rejects unsafe images, canonical URLs, and invalid fields", () => {
  assert.equal(makeBlogSlug("  Jyotish: A Guide! "), "jyotish-a-guide");
  const valid = validateBlogInput(blogInput());
  assert.equal(valid.slug, "a-safe-jyotish-introduction");
  assert.equal(valid.status, "DRAFT");
  assert.ok(valid.body.includes("<script>"), "plain text storage is safe because public rendering escapes it");
  assert.equal(validateBlogInput(blogInput({ featuredImageUrl: "https://external.example/image.png" })), null);
  assert.equal(validateBlogInput(blogInput({ slug: "../admin" })).slug, "admin");
  assert.equal(validateBlogInput(blogInput({ title: "" })), null);
  assert.deepEqual([...BLOG_STATUSES], ["DRAFT", "PUBLISHED", "ARCHIVED"]);
  assert.deepEqual([...BLOG_FILTER_STATUSES], ["DRAFT", "PUBLISHED", "ARCHIVED", "SCHEDULED"]);
  const scheduledAt = new Date(Date.now() + 60_000).toISOString();
  assert.equal(validateBlogInput(blogInput({ status: "PUBLISHED", scheduledAt })).scheduledAt.toISOString(), scheduledAt);
  assert.equal(validateBlogInput(blogInput({ status: "DRAFT", scheduledAt })), null);
  assert.equal(validateBlogInput(blogInput({ status: "PUBLISHED", scheduledAt: new Date(Date.now() - 60_000).toISOString() })), null);
  assert.equal(validateBlogInput(blogInput({ status: "PUBLISHED", scheduledAt: "2026-11-26T12:00:00" })), null);
});

test("blog management query and publishing helpers keep public reads restricted to published posts", async () => {
  const calls = [];
  const post = { id: "post-1", status: "DRAFT", publishedAt: null };
  const repository = {
    blogPost: {
      async count(args) { calls.push(["count", args]); return 2; },
      async findMany(args) { calls.push(["findMany", args]); return []; },
      async findUnique(args) { calls.push(["findUnique", args]); return post; },
      async findFirst(args) { calls.push(["findFirst", args]); return null; },
      async create(args) { calls.push(["create", args]); return { id: "post-2" }; },
      async update(args) { calls.push(["update", args]); return { id: "post-1", status: args.data.status }; },
      async deleteMany(args) { calls.push(["deleteMany", args]); return { count: 1 }; },
    },
  };

  const listing = await listBlogPosts(repository, { page: 2, query: "Vedic" });
  const queryCount = calls.find(([method, args]) => method === "count" && args?.where?.OR);
  const queryPage = calls.find(([method]) => method === "findMany");
  assert.equal(queryCount[1].where.OR[0].title.contains, "Vedic");
  assert.equal(queryPage[1].skip, 20);
  assert.deepEqual(listing.counts, { all: 2, drafts: 2, published: 2, scheduled: 2, archived: 2 });

  const created = await createBlogPost(repository, blogInput({ status: "PUBLISHED" }), "admin-id");
  assert.equal(created.id, "post-2");
  const createCall = calls.filter(([method]) => method === "create").at(-1);
  assert.equal(createCall[1].data.authorId, "admin-id");
  assert.equal(createCall[1].data.status, "PUBLISHED");
  assert.ok(createCall[1].data.publishedAt instanceof Date);
  assert.equal("scheduledAt" in createCall[1].data, false);

  const scheduledAt = new Date(Date.now() + 60_000);
  await createBlogPost(repository, blogInput({ status: "PUBLISHED", scheduledAt: scheduledAt.toISOString() }), "admin-id");
  const scheduledCreate = calls.filter(([method]) => method === "create").at(-1)[1];
  assert.equal(scheduledCreate.data.publishedAt.toISOString(), scheduledAt.toISOString());

  const changed = await updateBlogPost(repository, "post-1", blogInput({ status: "DRAFT" }));
  assert.equal(changed.status, "DRAFT");
  const scheduledStart = calls.length;
  await listBlogPosts(repository, { page: 1, query: "", status: "SCHEDULED" });
  const scheduledPage = calls.slice(scheduledStart).find(([method]) => method === "findMany");
  assert.equal(scheduledPage[1].where.status, "PUBLISHED");
  assert.ok(scheduledPage[1].where.publishedAt.gt instanceof Date);
  const publicPost = await findPublishedBlogPost(repository, "draft-post");
  assert.equal(publicPost, null);
  assert.deepEqual(calls.at(-1)[1].where, { slug: "draft-post", status: "PUBLISHED", publishedAt: { lte: calls.at(-1)[1].where.publishedAt.lte } });

  assert.equal(await deleteBlogPost(repository, "post-1"), true);
  assert.deepEqual(calls.at(-1), ["deleteMany", { where: { id: "post-1" } }]);
  const callCount = calls.length;
  assert.equal(await deleteBlogPost(repository, ""), false);
  assert.equal(calls.length, callCount);
});

test("editing a scheduled article without a schedule publishes it now instead of preserving its future date", async () => {
  const scheduledTime = new Date(Date.now() + 60 * 60_000);
  let update;
  const repository = {
    blogPost: {
      async findUnique() { return { id: "post-scheduled", status: "PUBLISHED", publishedAt: scheduledTime }; },
      async update(args) { update = args; return args.data; },
    },
  };
  await updateBlogPost(repository, "post-scheduled", blogInput({ status: "PUBLISHED", scheduledAt: null }));
  assert.ok(update.data.publishedAt instanceof Date);
  assert.ok(update.data.publishedAt < scheduledTime);
});

test("Developer documentation matches real route files and OpenAPI contract structure", () => {
  assert.equal(LIFE_OPENAPI.openapi, "3.1.0");
  assert.equal(LIFE_OPENAPI.info.version, "1.0.0");
  assert.deepEqual(Object.keys(LIFE_OPENAPI.paths).sort(), ["/api/charts", "/api/developer/test", "/api/health", "/api/locations", "/api/transits"]);
  for (const path of Object.keys(LIFE_OPENAPI.paths)) {
    const route = `src/app${path}/route.ts`;
    assert.ok(existsSync(new URL(`../${route}`, import.meta.url)), `documented route exists: ${route}`);
  }
  for (const path of ["/api/locations", "/api/charts", "/api/transits"]) {
    const [operation] = Object.values(LIFE_OPENAPI.paths[path]);
    assert.ok(operation.security.length > 0, `${path} documents session auth`);
  }
  assert.equal(LIFE_OPENAPI.components.securitySchemes.sessionCookie.type, "apiKey");
  assert.match(LIFE_OPENAPI.info.description, /scoped API key/);
  assert.ok(LIFE_OPENAPI.paths["/api/charts"].post.responses["401"]);
  assert.ok(LIFE_OPENAPI.paths["/api/charts"].post.responses["422"]);
  assert.ok(LIFE_OPENAPI.paths["/api/charts"].post.responses["429"]);
});

test("developer portal, interactive docs, blog public routes and protected management APIs are present", () => {
  assert.match(source("src/app/GlobalFooter.tsx"), /href="\/developers"/);
  assert.ok(existsSync(new URL("../src/app/developers/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/api/docs/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/api/openapi.json/route.ts", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/blogs/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/blogs/[slug]/page.tsx", import.meta.url)));
  const blogsApi = source("src/app/api/super-admin/blogs/route.ts");
  const postApi = source("src/app/api/super-admin/blogs/[postId]/route.ts");
  const blogDashboard = source("src/app/super-admin/blogs/BlogManagementDashboard.tsx");
  const publicArticle = source("src/app/blogs/[slug]/page.tsx");
  assert.match(blogsApi, /requireRole\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(postApi, /requireRole\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(postApi, /isSameOriginMutation/);
  assert.match(postApi, /export async function DELETE/);
  const deleteHandler = postApi.slice(postApi.indexOf("export async function DELETE"));
  assert.match(deleteHandler, /requireRole\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(deleteHandler, /isSameOriginMutation/);
  assert.match(blogDashboard, /Signed in as/);
  assert.match(blogDashboard, /api\/auth\/logout/);
  assert.match(blogDashboard, /Permanently delete/);
  assert.match(blogDashboard, /Blog totals/);
  assert.match(blogDashboard, /counts\.all/);
  assert.match(blogDashboard, /SCHEDULED/);
  assert.match(blogDashboard, /datetime-local/);
  assert.doesNotMatch(blogDashboard, /href="\/super-login">Sign in/);
  assert.match(publicArticle, /"@type": "BlogPosting"/);
  assert.match(publicArticle, /application\/ld\+json/);
  assert.match(source("prisma/schema.prisma"), /model BlogPost/);
  assert.match(source("prisma/migrations/20261026150000_blog_cms/migration.sql"), /CREATE TABLE "BlogPost"/);
  assert.match(source("src/app/sitemap.ts"), /status: "PUBLISHED"/);
});
