import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CURRENT_TERMS_VERSION } from "../src/legal/terms.ts";
import { hasTranslation, languages } from "../src/presentation/language.ts";
import { isAssistantChart } from "../src/presentation/kundli-assistant.ts";
import { ownedRecordWhere } from "../src/server/ownership.ts";
import { chartMatchesBirthProfile } from "../src/server/assistant-question-validation.ts";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("legal documents are separate, routable and linked from account and workspace entry points", () => {
  for (const route of [
    "src/app/terms-and-conditions/page.tsx",
    "src/app/privacy-policy/page.tsx",
    "src/app/disclaimer/page.tsx",
    "src/app/refund-policy/page.tsx",
  ]) assert.match(source(route), /LegalDocument/);
  const footer = source("src/app/GlobalFooter.tsx");
  const account = source("src/app/AccountPanel.tsx");
  assert.match(footer, /href="\/terms-and-conditions"/);
  assert.match(footer, /href="\/privacy-policy"/);
  assert.match(footer, /href="\/refund-policy"/);
  assert.match(account, /acceptedTerms/);
  assert.match(account, /href="\/terms-and-conditions"/);
  assert.match(account, /href="\/privacy-policy"/);
});

test("the current terms version is explicitly accepted and stored with a timestamp", () => {
  assert.equal(CURRENT_TERMS_VERSION, "2026-10-19-v1");
  const register = source("src/app/api/auth/register/route.ts");
  const acceptance = source("src/app/api/legal/acceptance/route.ts");
  const auth = source("src/server/auth-core.ts");
  assert.match(register, /body\.termsVersion !== CURRENT_TERMS_VERSION/);
  assert.match(auth, /input\.acceptedTerms !== true/);
  assert.match(auth, /termsAcceptedAt: new Date\(\)/);
  assert.match(acceptance, /termsVersion: CURRENT_TERMS_VERSION, termsAcceptedAt: acceptedAt/);
  assert.match(acceptance, /where: \{ id: user\.id \}/);
});

test("assistant chart validation rejects missing and incomplete stored chart data", () => {
  assert.equal(isAssistantChart(null), false);
  assert.equal(isAssistantChart({ input: { utc: "2026-01-01T00:00:00.000Z" }, planets: [] }), false);
  assert.equal(isAssistantChart({
    input: { utc: "2026-01-01T00:00:00.000Z" },
    ascendant: { sign: "Aries", longitude: 12 },
    planets: [],
    planetaryDignity: [],
    yogasAndDoshas: [],
    vimshottariDasha: { mahadashas: [] },
  }), true);
});

test("assistant charts must match the selected profile's actual birth inputs", () => {
  const birth = {
    localDate: "1997-04-27",
    localTime: "05:45",
    timeZone: "Asia/Kolkata",
    latitude: 30.483997,
    longitude: 76.593948,
  };
  assert.equal(chartMatchesBirthProfile(birth, birth), true);
  assert.equal(chartMatchesBirthProfile(null, birth), false);
  assert.equal(chartMatchesBirthProfile({ ...birth, timeZone: "Etc/UTC" }, birth), false);
  assert.equal(chartMatchesBirthProfile({ ...birth, latitude: 31 }, birth), false);
});

test("assistant persistence uses authenticated profile/chart ownership, bounded inputs and pagination", () => {
  const route = source("src/app/api/assistant/questions/route.ts");
  const detail = source("src/app/api/assistant/questions/[questionId]/route.ts");
  assert.match(route, /getUserFromRequest\(request\)/);
  assert.match(route, /ownedRecordWhere\(user\.id, body\.profileId\)/);
  assert.match(route, /userId: user\.id, profileId: profile\.id/);
  assert.match(route, /body\.question\.trim\(\)\.length > 500/);
  assert.match(route, /take: PAGE_SIZE \+ 1/);
  assert.match(route, /@@unique|requestId/);
  assert.match(route, /safeAnswer = \{ \.\.\.answer, provenance: null \}/);
  assert.match(detail, /ownedRecordWhere\(auth\.user!\.id, questionId\)/);
  assert.match(detail, /deleteMany\(\{\s*where: ownedRecordWhere/);
  assert.deepEqual(ownedRecordWhere("user-a", "q-user-b"), { id: "q-user-b", userId: "user-a" });
});

test("question history and terms are localized and avoid unsupported paid-policy claims", () => {
  const requiredKeys = [
    "assistant.selectProfile", "assistant.selectChart", "assistant.historyTitle",
    "assistant.questionDate", "assistant.answerDate", "assistant.historySearch",
    "assistant.fromDate", "assistant.toDate", "assistant.retry",
    "account.acceptTerms", "legal.termsTitle", "legal.privacyTitle",
    "legal.disclaimerTitle", "legal.terms.retention.body", "legal.privacy.deletion.body",
    "legal.refundTitle", "legal.refund.payments.title", "legal.refund.payments.body",
    "legal.refundLink", "assistant.limitation.marriageAnalysis",
    "assistant.limitation.financialGrowth", "assistant.limit.noFinancialOutcomeRule",
    "assistant.limit.transitConvention",
  ];
  for (const language of languages) {
    for (const key of requiredKeys) assert.equal(hasTranslation(language, key), true, `${language}: ${key}`);
  }
  const terms = source("src/presentation/language.ts");
  assert.match(terms, /The current application has no in-app purchase, subscription, or cancellation workflow/);
  assert.match(terms, /self-service account deletion/);
});

test("question and answer storage is additive and deletes only through the user's owned record path", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20261019120000_legal_acceptance_question_history/migration.sql");
  assert.match(schema, /model KundliQuestion/);
  assert.match(schema, /termsAcceptedAt DateTime\?/);
  assert.match(schema, /@@unique\(\[userId, requestId\]\)/);
  assert.match(schema, /onDelete: SetNull/);
  assert.match(migration, /CREATE TABLE "KundliQuestion"/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
});
