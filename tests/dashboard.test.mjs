import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard route requires a server-validated session", () => {
  const page = source("src/app/dashboard/page.tsx");
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /if \(!user\) redirect/);
  assert.match(page, /<Dashboard user=\{user\}/);
});

test("shared public footer links legal routes and does not expose the health endpoint", () => {
  const page = source("src/app/HomepageSections.tsx");
  const footer = source("src/app/GlobalFooter.tsx");
  const translations = source("src/presentation/language.ts");
  const healthRoute = source("src/app/api/health/route.ts");
  for (const route of ["terms-and-conditions", "privacy-policy", "disclaimer", "refund-policy"]) {
    assert.match(footer, new RegExp(`href="/${route}"`));
  }
  assert.match(footer, /<footer className="global-footer">/);
  assert.doesNotMatch(footer, /\/api\/health|app\.footerTagline|app\.footerLocal|app\.engineStatus/);
  assert.doesNotMatch(page, /\/api\/health/);
  assert.doesNotMatch(translations, /"app\.footerTagline"|"app\.footerLocal"|"app\.engineStatus"/);
  assert.match(healthRoute, /export async function GET/);
});

test("standalone build removes copied environment files before deployment", () => {
  const build = source("scripts/build.mjs");
  assert.match(build, /readdir\(standalone\)/);
  assert.match(build, /\^\\\.env\(\?:\\\.\.\*\)\?\$/);
  assert.match(build, /rm\(path\.join\(standalone,\s*entry\),\s*\{\s*force:\s*true\s*\}\)/);
});

test("Super Admin page and overview API enforce the database-backed Super Admin role", () => {
  const page = source("src/app/super-admin/page.tsx");
  const api = source("src/app/api/super-admin/overview/route.ts");
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /if \(!user\) redirect/);
  assert.match(page, /if \(user\.role !== "SUPER_ADMIN"\) notFound\(\)/);
  assert.match(api, /requireRole\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(api, /auth\.status === 401[\s\S]*?auth\.status === 401 \? "UNAUTHENTICATED" : "FORBIDDEN"/);
  assert.match(api, /prisma\.user\.count\(\)/);
  assert.match(api, /prisma\.birthProfile\.count\(\)/);
  assert.match(api, /prisma\.savedChart\.count\(\)/);
  assert.match(api, /prisma\.kundliQuestion\.count\(\)/);
  assert.doesNotMatch(api, /request\.json|searchParams\.get\(["']role/);
});

test("Super Admin user inspection is paginated, minimized, and logged transactionally", () => {
  const api = source("src/app/api/super-admin/users/route.ts");
  const handler = source("src/server/super-admin-users-handler.ts");
  const schema = source("prisma/schema.prisma");
  const filters = source("src/server/super-admin-users.ts");
  assert.match(api, /authorize: requireRole/);
  assert.match(api, /handleSuperAdminUsers/);
  assert.match(handler, /dependencies\.authorize\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(handler, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(handler, /take: PAGE_SIZE/);
  assert.match(handler, /_count: \{ select: \{ profiles: true \} \}/);
  assert.match(handler, /fullName: true/);
  assert.match(handler, /transaction\.superAdminAccessLog\.create/);
  assert.match(handler, /dependencies\.repository\(\)\.\$transaction/);
  assert.doesNotMatch(handler, /passwordHash|tokenHash|sessionToken|birthPlace|latitude|longitude/);
  assert.match(schema, /model SuperAdminAccessLog/);
  assert.match(schema, /onDelete: Restrict/);
  assert.match(filters, /const allowed = new Set\(\["page", "role", "q"\]\)/);
  assert.match(filters, /params\.getAll\(key\)\.length > 1/);
});

test("Super Admin audit-log viewer uses only persisted fields and a guarded API", () => {
  const api = source("src/app/api/super-admin/audit-logs/route.ts");
  const handler = source("src/server/super-admin-audit-handler.ts");
  const viewer = source("src/app/super-admin/SuperAdminDashboard.tsx");
  const schema = source("prisma/schema.prisma");
  assert.match(api, /handleSuperAdminAuditLogs/);
  assert.match(api, /authorize: requireRole/);
  assert.match(handler, /dependencies\.authorize\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(handler, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(handler, /events: result\.events\.map/);
  assert.doesNotMatch(handler, /passwordHash|tokenHash|connectionString|searchText/);
  assert.match(viewer, /activeModule === "auditLogs"/);
  assert.match(viewer, /api\/super-admin\/audit-logs/);
  assert.match(viewer, /superAdmin\.auditLoadError/);
  assert.match(viewer, /superAdmin\.noAuditEvents/);
  assert.match(viewer, /superAdmin\.eventResultCount/);
  assert.match(schema, /model SuperAdminAccessLog[\s\S]*?actorUserId[\s\S]*?actorLabel[\s\S]*?action[\s\S]*?page[\s\S]*?resultCount[\s\S]*?targetUserId[\s\S]*?fromRole[\s\S]*?toRole[\s\S]*?createdAt/);
  const eventModel = schema.match(/model SuperAdminAccessLog \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(eventModel);
  assert.doesNotMatch(eventModel, /success|failure/i);
});

test("Super Admin navigation remains honest, accessible, localized, and responsive", () => {
  const dashboard = source("src/app/super-admin/SuperAdminDashboard.tsx");
  const styles = source("src/app/super-admin/super-admin.css");
  const healthApi = source("src/app/api/super-admin/health/route.ts");
  const healthHandler = source("src/server/super-admin-health-handler.ts");
  for (const key of ["overview", "users", "health", "auditLogs"]) {
    assert.match(dashboard, new RegExp(`\\b${key}: "superAdmin\\.`));
  }
  assert.match(dashboard, /aria-label=\{t\("superAdmin\.navigation"\)\}/);
  assert.match(dashboard, /aria-current=\{activeModule === module \? "page" : undefined\}/);
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /role="status"/);
  assert.match(dashboard, /activeModule === "auditLogs"/);
  assert.match(dashboard, /superAdmin\.noAuditEvents/);
  assert.match(dashboard, /superAdmin\.auditLoadError/);
  assert.match(dashboard, /superAdmin\.healthDescription/);
  assert.match(dashboard, /superAdmin\.permissionDenied/);
  assert.match(dashboard, /aria-live="polite"/);
  assert.match(dashboard, /superAdmin\.noUsers/);
  assert.match(dashboard, /superAdmin\.noAuditEvents/);
  assert.match(dashboard, /superAdmin\.healthError/);
  assert.match(dashboard, /superAdmin\.loadError/);
  assert.doesNotMatch(dashboard, /questionAudit|superAdmin\.settings|superAdmin\.reports/);
  assert.match(dashboard, /activeModule === "users"/);
  assert.match(dashboard, /super-admin\/users\?/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:380px\)/);
  assert.match(styles, /overflow-x:clip/);
  assert.match(styles, /:focus-visible/);
  assert.match(healthApi, /authorize: requireRole/);
  assert.match(healthHandler, /dependencies\.authorize\(request, \["SUPER_ADMIN"\]\)/);
  assert.match(healthHandler, /Response\.json\(\{ engine, database \}/);
  assert.doesNotMatch(healthHandler, /connectionString|DATABASE_URL|process\.env/);
});

test("dashboard loads account-scoped records and uses existing profile/report APIs", () => {
  const dashboard = source("src/app/Dashboard.tsx");
  assert.match(dashboard, /fetch\("\/api\/profiles"/);
  assert.match(dashboard, /fetch\("\/api\/saved-charts"/);
  assert.match(dashboard, /fetch\("\/api\/assistant\/questions"/);
  assert.match(dashboard, /fetch\(isCreatingProfile\s*\?\s*"\/api\/profiles"\s*:\s*`\/api\/profiles\/\$\{encodeURIComponent\(selectedProfile!\.id\)\}`/);
  assert.match(dashboard, /fetch\(`\/api\/saved-charts\/\$\{encodeURIComponent\(report\.id\)\}`/);
  assert.match(dashboard, /body: JSON\.stringify\(\{[\s\S]*?localTime: form\.localTime \|\| null/);
  assert.match(dashboard, /latitude: form\.latitude === "" \? null/);
  assert.match(dashboard, /profileId=\{selectedProfileId \|\| undefined\}/);
  assert.match(dashboard, /method: isCreatingProfile \? "POST" : "PATCH"/);
  assert.match(dashboard, /accountData=\{assistantAccountData\}/);
  assert.match(dashboard, /calculationStatus !== "saved-snapshot"/);
  assert.match(dashboard, /chartCalculated: reports\.some/);
  assert.match(dashboard, /selectedProfileReport = reports\.find\(\(report\) => report\.profileId === selectedProfileId\)/);
  assert.match(dashboard, /openReport\(selectedProfileReport[\s\S]*?openProfileKundli/);
  assert.doesNotMatch(dashboard, /userId\s*:/);
});

test("profile saved-report shortcut uses newest stable profile-linked item and exposes empty/error states", () => {
  const dashboard = source("src/app/Dashboard.tsx");
  const listRoute = source("src/app/api/saved-charts/route.ts");
  assert.match(listRoute, /orderBy:\s*\[\{\s*createdAt:\s*"desc"\s*\},\s*\{\s*id:\s*"desc"\s*\}\]/);
  assert.match(dashboard, /selectedProfileReport = reports\.find\(\(report\) => report\.profileId === selectedProfileId\)/);
  assert.match(dashboard, /selectedProfileReport && <button[\s\S]*?openReport\(selectedProfileReport/);
  assert.match(dashboard, /reportStatus === "error"[\s\S]*?dashboard\.dataUnavailable/);
  assert.match(dashboard, /reports\.length === 0[\s\S]*?dashboard\.noReports/);
  assert.match(dashboard, /!response\.ok \|\| !body\.chart\?\.result[\s\S]*?dashboard\.reportOpenFailed/);
  assert.match(dashboard, /catch \{\s*setOpenError\(t\("dashboard\.reportOpenFailed"\)\)/);
  assert.match(dashboard, /openError && <p className="dashboard-alert" role="alert">/);
});

test("dashboard and embedded assistant keep profile selection aligned", () => {
  const dashboard = source("src/app/Dashboard.tsx");
  const assistant = source("src/app/KundliAssistant.tsx");
  assert.match(dashboard, /className="dashboard-assistant-wrap"[\s\S]*?onChange=\{\(event\) => setSelectedProfileId\(event\.target\.value\)\}/);
  assert.match(assistant, /\{!profileId && <label className="field-label">\{t\("assistant\.selectProfile"\)\}/);
  assert.match(assistant, /item\.profileId === profileId/);
  assert.match(assistant, /if \(profileId && selectedProfileId !== profileId\) return/);
  assert.match(assistant, /entries\.filter\(\(entry\) => entry\.profileId === \(profileId \?\? selectedProfileId\)\)/);
});

test("assistant UI exposes the complete localized question catalog", () => {
  const assistant = source("src/app/KundliAssistant.tsx");
  assert.match(assistant, /const visibleQuestions = useMemo\(\s*\(\) => filterAssistantQuestions\(selectedCategory, search, language\),/);
  assert.match(assistant, /\{visibleQuestions\.map\(\(item\) => <button/);
  assert.doesNotMatch(assistant, /supportedQuestions/);
});

test("profile editor guards unsaved edits and avoids overwriting omitted PATCH fields", () => {
  const dashboard = source("src/app/Dashboard.tsx");
  const profileApi = source("src/app/api/profiles/[profileId]/route.ts");
  assert.match(dashboard, /window\.confirm\(t\("dashboard\.discardProfileChanges"\)\)/);
  assert.match(dashboard, /addEventListener\("beforeunload"/);
  assert.match(dashboard, /AbortController/);
  assert.match(profileApi, /body\.localDate !== undefined \? \{ localDate: input\.localDate \}/);
  assert.match(profileApi, /body\.birthPlace !== undefined \? \{ birthPlace: input\.birthPlace \}/);
  assert.match(profileApi, /data,\s*\}\);/);
});

test("dashboard includes keyboard-operable mobile navigation and responsive styles", () => {
  const dashboard = source("src/app/Dashboard.tsx");
  const styles = source("src/app/dashboard.css");
  assert.match(dashboard, /aria-expanded=\{mobileOpen\}/);
  assert.match(dashboard, /aria-controls="dashboard-nav"/);
  assert.match(dashboard, /event\.key === "Escape"/);
  assert.match(dashboard, /menuToggle\.current\?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(dashboard, /className="dashboard-backdrop"/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /visibility:hidden;transition:transform/);
  assert.match(styles, /@media\(max-width:560px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /overflow-x:clip/);
});
