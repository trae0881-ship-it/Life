import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function appFiles(dir="src/app") {
  const entries=readdirSync(new URL(`../${dir}/`,import.meta.url),{withFileTypes:true});
  return entries.flatMap((entry)=>{
    const relative=`${dir}/${entry.name}`;
    if (entry.isDirectory()) return appFiles(relative);
    return /\.(ts|tsx)$/.test(entry.name)?[source(relative)]:[];
  });
}

test("standard auth and protected routes use clean direct URLs",()=>{
  const dashboard=source("src/app/dashboard/page.tsx");
  const palmistry=source("src/app/palmistry/page.tsx");
  const tarot=source("src/app/tarot-reading/page.tsx");
  const numerology=source("src/app/ank-jyotish/page.tsx");
  const kp=source("src/app/kp-astrology/page.tsx");
  assert.match(dashboard,/redirect\("\/login"\)/);
  assert.match(palmistry,/redirect\("\/login"\)/);
  assert.match(tarot,/redirect\("\/login"\)/);
  assert.match(numerology,/redirect\("\/login"\)/);
  assert.match(kp,/redirect\("\/login"\)/);
  const login=source("src/app/login/page.tsx");
  const signup=source("src/app/signup/page.tsx");
  assert.doesNotMatch(login,/searchParams|safeReturnTo|\?next/);
  assert.doesNotMatch(signup,/searchParams|safeReturnTo|\?next/);
  assert.match(login,/redirect\("\/dashboard"\)/);
  assert.match(signup,/redirect\("\/dashboard"\)/);
});

test("entire app source contains no standard login/signup next query navigation",()=>{
  const files=appFiles();
  const combined=files.join("\n");
  assert.doesNotMatch(combined,/\/login\?next=|\/signup\?next=|\/login\?redirect=|\/signup\?redirect=/);
  assert.doesNotMatch(combined,/encodeURIComponent\(returnTo\)|\bredirectTo\b/);
});

test("protected reading API remains user-owned and same-origin mutation guarded",()=>{
  const route=source("src/app/api/astrology-readings/route.ts");
  const deleteRoute=source("src/app/api/astrology-readings/[readingId]/route.ts");
  assert.match(route,/getUserFromRequest\(request\)/);
  assert.match(route,/where: \{ userId: user\.id, service \}/);
  assert.match(route,/isSameOriginMutation\(request\)/);
  assert.match(deleteRoute,/where: \{ id: readingId, userId: user\.id \}/);
});

test("mobile exports and displays use masking helpers",()=>{
  const workspace=source("src/app/AstrologyServiceWorkspace.tsx");
  const recommender=source("src/calculation/numerology-recommendations.ts");
  assert.match(workspace,/Masked number/);
  assert.match(workspace,/sanitizeNumerologyExport/);
  assert.match(recommender,/sanitizeNumerologyExport/);
  assert.match(recommender,/mobile.*\*\*\*\*/i);
});

test("tarot, palmistry, KP and numerology routes remain distinct clean paths",()=>{
  for (const route of ["palmistry","tarot-reading","kp-astrology","ank-jyotish","dashboard"]) {
    const file=source(`src/app/${route}/page.tsx`);
    assert.ok(file.length>0);
  }
});
