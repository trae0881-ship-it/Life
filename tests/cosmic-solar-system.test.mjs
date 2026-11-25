import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component=readFileSync(new URL("../src/app/CosmicSolarSystem.tsx",import.meta.url),"utf8");
const homepage=readFileSync(new URL("../src/app/HomepageSections.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/app/homepage.css",import.meta.url),"utf8");

test("homepage renders the complete cosmic solar-system component",()=>{
  assert.match(homepage,/CosmicSolarSystem/);
  assert.match(homepage,/import CosmicSolarSystem/);
  assert.match(component,/Mercury/);
  assert.match(component,/Neptune/);
  assert.match(component,/cosmic-moon-system/);
  assert.match(component,/cosmic-saturn-ring/);
});

test("all nine outer planets are listed and orbit with different durations",()=>{
  for (const planet of ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"]) {
    assert.match(component,new RegExp(planet));
  }
  assert.match(component,/duration: 7/);
  assert.match(component,/duration: 62/);
  assert.doesNotMatch(component,/Sun.*astrological prediction/i);
});

test("pause, resume, reset and planet deselection are implemented",()=>{
  assert.match(component,/setPaused/);
  assert.match(component,/Pause/);
  assert.match(component,/Resume/);
  assert.match(component,/Reset/);
  assert.match(component,/resetAnimation/);
  assert.match(component,/setSelected/);
  assert.match(component,/current === planet\.id/);
});

test("CSS preserves continuous 360-degree motion and pause state",()=>{
  assert.match(css,/@keyframes cosmic-spin/);
  assert.match(css,/to \{ transform: rotate\(360deg\); \}/);
  assert.match(css,/cosmic-counter-spin/);
  assert.match(component,/data-paused=\{paused\}/);
  assert.match(css,/animation-play-state: paused/);
});

test("reduced-motion and responsive rules provide static-safe alternatives",()=>{
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/animation: none !important/);
  assert.match(css,/cosmic-stars span:nth-child\(n\+9\)/);
  assert.match(css,/width: min\(83vw, 300px\)/);
  assert.match(css,/width: min\(75vw, 330px\)/);
});

test("planet controls and labels remain keyboard accessible",()=>{
  assert.match(component,/aria-label={`Select \$\{planet\.name\}`}/);
  assert.match(component,/aria-pressed=\{selected === planet\.id\}/);
  assert.match(component,/aria-live="polite"/);
  assert.match(css,/cosmic-planet:focus-visible/);
  assert.match(css,/cosmic-controls button:focus-visible/);
  assert.match(component,/cosmic-planet-picker/);
  assert.match(css,/cosmic-planet-picker button/);
});

test("cosmic text and controls are hidden while motion DOM remains",()=>{
  assert.match(css,/\.cosmic-planet-picker\s*\{[\s\S]*?display:\s*none/);
  assert.match(css,/\.cosmic-controls\s*\{[\s\S]*?display:\s*none/);
  assert.match(css,/\.hero-art-caption\s*\{[\s\S]*?display:\s*none/);
  assert.match(css,/linear-gradient\(145deg,\s*#3a3126/);
  assert.match(component,/cosmic-sun/);
  assert.match(component,/cosmic-moon-system/);
  assert.match(component,/cosmic-saturn-ring/);
  assert.match(component,/cosmic-orbit/);
  assert.match(css,/@keyframes cosmic-spin/);
  assert.match(css,/@keyframes cosmic-counter-spin/);
});
