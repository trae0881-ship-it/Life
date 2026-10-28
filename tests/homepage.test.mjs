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
    if (item.sectionId === "account") assert.equal(item.href, "/signup?next=%2Fdashboard");
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
  assert.match(studioPage, /redirect\(`\/login\?next=/);
});

test("featured carousel links point to existing tools and support keyboard, touch scrolling and reduced motion", () => {
  const routes = new Set(["/life-timeline", "/remedies", "/marriage-timing", "/dashboard/assistant"]);
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
  assert.match(homepage, /prefers-reduced-motion: reduce/);
  assert.match(homepageCss, /overscroll-behavior-inline: contain/);
  assert.match(homepageCss, /scroll-snap-type: x mandatory/);
  assert.equal(carouselScrollOffset(0, 300, 500, -1), 0);
  assert.equal(carouselScrollOffset(0, 300, 500, 1), 240);
  assert.equal(carouselScrollOffset(450, 300, 500, 1), 500);
});

test("homepage uses an honest blog empty state and product-accurate metadata", () => {
  assert.match(homepage, /No articles published yet/);
  assert.match(homepage, /No public contact channel|No support email/);
  assert.match(metadata, /Vedic Astrology & Jyotish Workbench/);
  assert.match(metadata, /openGraph:/);
  assert.match(metadata, /twitter:/);
  assert.doesNotMatch(metadata, /aggregateRating|review|canonical:/i);
});
