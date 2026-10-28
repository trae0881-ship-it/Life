import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasTranslation, languages, translate, translationKeys } from "../src/presentation/language.ts";

const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const footer = source("../src/app/GlobalFooter.tsx");
const section = source("../src/app/DeveloperFooterSection.tsx");
const styles = source("../src/app/globals.css");
const developers = source("../src/app/developers/page.tsx");
const developerDashboard = source("../src/app/developers/dashboard/page.tsx");
const authCore = source("../src/server/auth-core.ts");
const layout = source("../src/app/layout.tsx");

test("global footer includes an accessible, separately expandable Developer section", () => {
  assert.match(layout, /<GlobalFooter\s*\/>/);
  assert.match(footer, /<DeveloperFooterSection\s*\/>/);
  assert.match(section, /aria-expanded=\{open\}/);
  assert.match(section, /aria-controls="global-footer-developer-panel"/);
  assert.match(section, /role="region"/);
  assert.match(section, /event\.key !== "Escape"/);
  assert.match(section, /trigger\.current\?\.focus/);
  assert.match(section, /pointerdown/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /position:fixed;left:18px;right:18px;bottom:18px;width:auto;max-height:calc\(100dvh - 36px\)/);
  assert.match(styles, /\.global-footer-developer-trigger:focus-visible/);
});

test("Developer actions stay separate and link to the distinct Developer auth routes", () => {
  assert.match(section, /href="\/developer\/login\?next=%2Fdevelopers%2Fdashboard"/);
  assert.match(section, /href="\/developer\/signup"/);
  assert.match(section, /developer\.footer\.login/);
  assert.match(section, /developer\.footer\.createAccount/);
});

test("footer describes the existing API access model and does not promise automatic Developer access", () => {
  assert.match(developers, /not a public developer platform/i);
  assert.match(developers, /OAuth and external developer account registration are not available/i);
  assert.match(developerDashboard, /user\.role !== "DEVELOPER"/);
  assert.match(authCore, /role:\s*"USER"/);
  for (const language of languages) {
    for (const key of [
      "developer.footer.description",
      "developer.footer.access",
      "developer.footer.login",
      "developer.footer.createAccount",
      "developer.footer.approval",
    ]) assert.ok(hasTranslation(language, key), `${language} has translation for ${key}`);
  }
  assert.ok(translationKeys.includes("developer.footer.title"));
  assert.match(section, /role === "DEVELOPER" && <a href="\/developers\/dashboard">/);
  assert.match(translate("en", "developer.footer.approval"), /Developer access is not automatic/);
  assert.match(translate("hi", "developer.footer.approval"), /Developer पहुँच अपने-आप नहीं मिलती/);
  assert.match(translate("hinglish", "developer.footer.approval"), /Developer access automatic nahi hai/);
});

test("footer panel exposes public documentation without rendering credentials or API key values", () => {
  assert.match(section, /href="\/developers"/);
  assert.match(section, /href="\/api\/docs"/);
  assert.match(section, /href="\/api\/openapi\.json"/);
  assert.doesNotMatch(section, /secret|apiKey|token|password|DATABASE_URL/i);
});
