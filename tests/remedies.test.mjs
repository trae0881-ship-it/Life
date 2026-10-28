import test from "node:test";
import assert from "node:assert/strict";
import { languages } from "../src/presentation/language.ts";
import { remedyCatalog, remedyCategories, remedyProblems, sortRemedies, priceTiers, localized } from "../src/presentation/remedies.ts";

test("remedy catalog is complete, unique and multilingual", () => {
  assert.ok(remedyCatalog.length >= 8);
  assert.equal(new Set(remedyCatalog.map((remedy) => remedy.id)).size, remedyCatalog.length);
  assert.deepEqual(new Set(remedyCatalog.map((remedy) => remedy.category)), new Set(["sattvik", "lal-kitab", "tantra"]));
  for (const remedy of remedyCatalog) {
    for (const language of languages) {
      for (const field of [remedy.name, remedy.purpose, remedy.tradition, remedy.materials, remedy.steps, remedy.duration, remedy.time, remedy.freeAlternative, remedy.safety, remedy.evidence]) {
        assert.ok(localized(field, language).trim(), `${remedy.id} has blank ${language} content`);
      }
    }
    assert.ok(remedy.price === null || Number.isInteger(remedy.price) && remedy.price >= 0);
    assert.ok(remedy.freeAlternative.en.trim());
    assert.ok(remedy.evidence.en.trim());
  }
});

test("remedy filters and price sorting preserve free-first defaults", () => {
  assert.equal(remedyCategories.length, 3);
  assert.equal(remedyProblems.length, 10);
  const lowest = sortRemedies(remedyCatalog, "lowest");
  const highest = sortRemedies(remedyCatalog, "highest");
  assert.ok((lowest[0].price ?? 0) <= (lowest.at(-1).price ?? 0));
  assert.ok((highest[0].price ?? 0) >= (highest.at(-1).price ?? 0));
  assert.ok(remedyCatalog.filter((remedy) => remedy.problems.includes("government")).length > 0);
  assert.ok(remedyCatalog.filter((remedy) => remedy.category === "tantra").every((remedy) => remedy.price === 0 || remedy.price === null));
  assert.ok(priceTiers.every((tier) => tier.min >= 0 && (tier.max === null || tier.max >= tier.min)));
});

test("remedy records do not claim fabricated sources or guaranteed outcomes", () => {
  for (const remedy of remedyCatalog) {
    const content = JSON.stringify(remedy).toLowerCase();
    assert.doesNotMatch(content, /will cure|guarantees? (marriage|employment|wealth)|supernatural power/);
    assert.match(content, /not independently verified|independently verified nahi|स्वतंत्र रूप से सत्यापित नहीं/);
  }
});
