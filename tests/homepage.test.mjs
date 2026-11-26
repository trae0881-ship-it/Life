import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { carouselScrollOffset, featuredTools, homepageFeatures, homepageNavigation } from "../src/presentation/homepage.ts";

const appPage = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const chartStudio = readFileSync(new URL("../src/app/ChartStudioWorkspace.tsx", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../src/app/HomepageSections.tsx", import.meta.url), "utf8");
const homepageCss = readFileSync(new URL("../src/app/homepage.css", import.meta.url), "utf8");
const metadata = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");

test("homepage navigation destinations resolve to visible public sections or real login route", () => {
  for (const item of homepageNavigation) {
    if (item.sectionId !== "account") assert.ok(homepage.includes(`id="${item.sectionId}"`), `${item.label} destination exists`);
    if (item.sectionId === "account") assert.equal(item.href, "/signup");
    else assert.ok(homepage.includes("href={item.href}"), `${item.label} link is rendered from homepage navigation data`);
  }
  assert.match(homepage, /aria-expanded=\{menuOpen\}/);
  assert.match(homepage, /aria-controls="site-navigation"/);
  assert.match(homepage, /event\.key !== "Escape"/);
  assert.match(homepage, /setTimeout\(\(\) => menuButton\.current\?\.focus\(\{ preventScroll: true \}\), 0\)/);
  assert.match(homepage, /menuButton\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(homepage, /onClick=\{closeNavigation\}/);
});

test("public homepage stays public and Kundli CTAs target the protected existing calculation form", () => {
  assert.match(chartStudio, /<form id="birth-form"/);
  assert.match(appPage, /HomepageSections/);
  assert.match(homepage, /href="\/studio#birth-form"/);
  assert.equal(homepageFeatures.length, 6);
  for (const feature of homepageFeatures) assert.equal(feature.href, "/studio#birth-form");
  assert.match(homepage, /Generate My Kundli/);
  assert.match(homepage, /Explore Astrology/);
  assert.equal((homepage.match(/href="\/studio#birth-form"/g) ?? []).length, 2);
  const studioPage = readFileSync(new URL("../src/app/studio/page.tsx", import.meta.url), "utf8");
  assert.match(studioPage, /getCurrentUser/);
  assert.match(studioPage, /redirect\("\/login"\)/);
});

test("featured carousel links point to existing tools and support keyboard, touch scrolling and reduced motion", () => {
  const routes = new Set(["/life-timeline", "/remedies", "/marriage-timing", "/dashboard/assistant", "/palmistry"]);
  assert.equal(featuredTools.length, routes.size);
  for (const tool of featuredTools) {
    assert.ok(routes.has(tool.href));
    const routePath = tool.href === "/dashboard/assistant"
      ? "../src/app/dashboard/assistant/page.tsx"
      : `../src/app${tool.href}/page.tsx`;
    assert.doesNotThrow(() => readFileSync(new URL(routePath, import.meta.url), "utf8"), `route exists: ${tool.href}`);
    assert.ok(homepage.includes(`href={tool.href}`));
  }
  assert.match(homepage, /ArrowRight/);
  assert.match(homepage, /ArrowLeft/);
  assert.match(homepage, /aria-label="Scroll featured tools left"/);
  assert.match(homepage, /aria-label="Scroll featured tools right"/);
  assert.match(homepage, /aria-label="Scroll featured tools left" onClick=\{\(\) => scrollTools\(-1\)\}/);
  assert.match(homepage, /aria-label="Scroll featured tools right" onClick=\{\(\) => scrollTools\(1\)\}/);
  assert.match(homepage, /disabled=\{scroll\.left <= 1\}/);
  assert.match(homepage, /disabled=\{scroll\.left >= scroll\.maximum - 1\}/);
  assert.match(homepage, /event\.key === "ArrowRight"/);
  assert.match(homepage, /event\.key === "ArrowLeft"/);
  assert.match(homepage, /element\.scrollTo\(\{ left, behavior: "instant" \}\)/);
  assert.match(homepage, /onScroll=\{updateScroll\}/);
  assert.match(homepage, /className="home-carousel-curve"[\s\S]*?aria-hidden="true"[\s\S]*?viewBox="0 0 1200 220"/);
  assert.match(homepage, /scroll\.maximum \+ scroll\.viewport/);
  assert.match(homepage, /className="home-carousel-curve-flow"/);
  assert.match(homepage, /prefers-reduced-motion: reduce/);
  assert.match(homepageCss, /@keyframes home-tool-curve-flow/);
  assert.match(homepageCss, /\.home-carousel-curve-flow\s*\{[^}]*animation:\s*home-tool-curve-flow 3\.8s linear infinite/s);
  assert.match(homepageCss, /prefers-reduced-motion: reduce[\s\S]*?\.home-carousel-curve-flow\s*\{\s*animation:\s*none/);
  assert.match(homepageCss, /overscroll-behavior-inline: contain/);
  assert.match(homepageCss, /scroll-snap-type: x mandatory/);
  assert.match(homepageCss, /@keyframes home-tool-wave/);
  assert.match(homepageCss, /animation:\s*home-tool-wave 4\.6s ease-in-out infinite/);
  assert.match(homepageCss, /\.home-tool-card:nth-child\(5\)\s*\{\s*animation-delay:\s*-1\.84s/);
  assert.match(homepageCss, /prefers-reduced-motion: reduce[\s\S]*?\.home-tool-card\s*\{\s*animation:\s*none !important/);
  assert.equal(carouselScrollOffset(0, 300, 500, -1), 0);
  assert.equal(carouselScrollOffset(0, 300, 500, 1), 240);
  assert.equal(carouselScrollOffset(450, 300, 500, 1), 500);
});

test("homepage feature cards stay centered and responsive across viewport sizes", () => {
  assert.match(homepageCss, /\.home-feature-grid\s*\{[^}]*width:\s*min\(100%,\s*1320px\);[^}]*margin-inline:\s*auto/s);
  assert.match(homepageCss, /\.home-feature-card\s*\{[^}]*align-items:\s*center;[^}]*text-align:\s*center;/s);
  assert.match(homepageCss, /@media \(max-width: 760px\)[\s\S]*?\.home-feature-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(homepageCss, /@media \(max-width: 560px\)[\s\S]*?\.home-feature-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("homepage uses an honest blog empty state and product-accurate metadata", () => {
  assert.match(homepage, /No articles published yet/);
  assert.match(homepage, /No public contact channel|No support email/);
  assert.match(metadata, /Vedic Astrology & Jyotish Workbench/);
  assert.match(metadata, /openGraph:/);
  assert.match(metadata, /twitter:/);
  assert.doesNotMatch(metadata, /aggregateRating|review|canonical:/i);
});
