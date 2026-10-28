import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getKundliDetails } from "../src/presentation/kundli-details.ts";
import { getMoonSignVarna, getNakshatraClassification } from "../src/calculation/kundli-classifications.ts";
import { hasTranslation, languages, translate } from "../src/presentation/language.ts";

const field = (details, id) => details.find((detail) => detail.id === id);
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Kundli detail projection exposes calculated, entered, and derived birth facts", () => {
  const details = getKundliDetails({
    input: { fullName: "Test name" },
    ascendant: { sign: "Cancer" },
    planets: [{ name: "Moon", sign: "Taurus", house: 2 }],
    planetaryDignity: [{ name: "Moon", signLord: "Venus" }],
    vimshottariDasha: {
      startingMahadasha: "Rahu",
      remainingMahadashaBalanceYears: 8.25,
      convention: { yearDays: 365.2425 },
    },
    panchanga: {
      tithi: { paksha: "Shukla", name: "Panchami" },
      nakshatra: { name: "Rohini", pada: 2 },
      yoga: "Siddhi",
      karana: "Bava",
    },
    riseSet: {
      timeZone: "Asia/Kolkata",
      sunrise: { status: "calculated", localTime: "2026-10-19 06:12:00" },
    },
  });

  assert.equal(details.length, 18);
  assert.deepEqual(field(details, "rashi"), { id: "rashi", value: "Taurus", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "naam"), { id: "naam", value: "Test name", secondary: null, source: "user" });
  assert.deepEqual(field(details, "lagna"), { id: "lagna", value: "Cancer", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "dashaBalance"), {
    id: "dashaBalance", value: "Rahu", secondary: "8.250|365.2425", source: "calculated",
  });
  assert.deepEqual(field(details, "tithi"), { id: "tithi", value: "Shukla Panchami", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "nakshatra"), { id: "nakshatra", value: "Rohini", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "nakshatraPada"), { id: "nakshatraPada", value: "2", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "yoga"), { id: "yoga", value: "Siddhi", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "karana"), { id: "karana", value: "Bava", secondary: null, source: "calculated" });
  assert.deepEqual(field(details, "sunrise"), {
    id: "sunrise", value: "2026-10-19 06:12:00", secondary: "Asia/Kolkata", source: "calculated",
  });
  assert.deepEqual(field(details, "rashiSwami"), { id: "rashiSwami", value: "Venus", secondary: null, source: "derived" });
  assert.deepEqual(field(details, "nakshatraSwami"), { id: "nakshatraSwami", value: "Rahu", secondary: null, source: "derived" });
  assert.deepEqual(field(details, "nakshatraPaya"), { id: "nakshatraPaya", value: "Silver", secondary: "Moon house from Lagna", source: "derived" });
});

test("Kundli detail projection leaves unsupported classifications and missing inputs unavailable", () => {
  const missing = getKundliDetails({});
  assert.equal(missing.length, 18);
  for (const id of ["ishtkaal", "nakshatraPaya", "yoni", "gana", "nadi", "varna"]) {
    assert.deepEqual(field(missing, id), { id, value: null, secondary: null, source: "unavailable" });
  }
  assert.equal(field(missing, "rashi").value, null);
  assert.equal(field(missing, "dashaBalance").value, null);
  assert.equal(field(missing, "sunrise").value, null);
});

test("Yoni, Gana, and Nadi use an explicit complete 27-Nakshatra mapping", () => {
  const expected = [
    ["Ashwini", "horse", "deva", "adi"],
    ["Bharani", "elephant", "manushya", "madhya"],
    ["Krittika", "sheep", "rakshasa", "antya"],
    ["Rohini", "serpent", "manushya", "antya"],
    ["Mrigashira", "serpent", "deva", "madhya"],
    ["Ardra", "dog", "manushya", "adi"],
    ["Punarvasu", "cat", "deva", "adi"],
    ["Pushya", "sheep", "deva", "madhya"],
    ["Ashlesha", "cat", "rakshasa", "antya"],
    ["Magha", "rat", "rakshasa", "antya"],
    ["Purva Phalguni", "rat", "manushya", "madhya"],
    ["Uttara Phalguni", "cow", "manushya", "adi"],
    ["Hasta", "buffalo", "deva", "adi"],
    ["Chitra", "tiger", "rakshasa", "madhya"],
    ["Swati", "buffalo", "deva", "antya"],
    ["Vishakha", "tiger", "rakshasa", "antya"],
    ["Anuradha", "deer", "deva", "madhya"],
    ["Jyeshtha", "deer", "rakshasa", "adi"],
    ["Mula", "dog", "rakshasa", "adi"],
    ["Purva Ashadha", "monkey", "manushya", "madhya"],
    ["Uttara Ashadha", "mongoose", "manushya", "antya"],
    ["Shravana", "monkey", "deva", "antya"],
    ["Dhanishta", "lion", "rakshasa", "madhya"],
    ["Shatabhisha", "horse", "rakshasa", "adi"],
    ["Purva Bhadrapada", "lion", "manushya", "adi"],
    ["Uttara Bhadrapada", "cow", "manushya", "madhya"],
    ["Revati", "elephant", "deva", "antya"],
  ];

  assert.equal(expected.length, 27);
  for (const [nakshatra, yoni, gana, nadi] of expected) {
    assert.deepEqual(getNakshatraClassification(nakshatra), { yoni, gana, nadi });
  }
  assert.equal(getNakshatraClassification("Abhijit"), null);
  assert.equal(getNakshatraClassification("ashwini"), null);
  assert.equal(getNakshatraClassification("constructor"), null);
  assert.equal(getNakshatraClassification("toString"), null);
  assert.equal(getNakshatraClassification(null), null);
  assert.equal(getNakshatraClassification(1), null);
});

test("Varna uses the documented Moon-sign categories for all twelve signs", () => {
  const expected = [
    ["Aries", "kshatriya"],
    ["Taurus", "shudra"],
    ["Gemini", "vaishya"],
    ["Cancer", "brahmin"],
    ["Leo", "kshatriya"],
    ["Virgo", "shudra"],
    ["Libra", "vaishya"],
    ["Scorpio", "brahmin"],
    ["Sagittarius", "kshatriya"],
    ["Capricorn", "shudra"],
    ["Aquarius", "vaishya"],
    ["Pisces", "brahmin"],
  ];
  assert.equal(expected.length, 12);
  for (const [sign, varna] of expected) assert.equal(getMoonSignVarna(sign), varna);
  assert.equal(getMoonSignVarna("aries"), null);
  assert.equal(getMoonSignVarna("constructor"), null);
  assert.equal(getMoonSignVarna(null), null);
  assert.equal(getMoonSignVarna(0), null);
});

test("the projection derives all four classifications only from the calculated Moon facts", () => {
  const details = getKundliDetails({
    planets: [{ name: "Moon", sign: "Cancer", house: 1 }],
    panchanga: { nakshatra: { name: "Ashwini", pada: 1 } },
  });
  for (const [id, value] of [["yoni", "horse"], ["gana", "deva"], ["nadi", "adi"], ["varna", "brahmin"]]) {
    assert.deepEqual(field(details, id), { id, value, secondary: null, source: "derived" });
  }
  const noNakshatra = getKundliDetails({ planets: [{ name: "Moon", sign: "Cancer", house: 1 }] });
  assert.equal(field(noNakshatra, "yoni").value, null);
  assert.equal(field(noNakshatra, "varna").value, "brahmin");
  assert.deepEqual(field(noNakshatra, "nakshatraPaya"), { id: "nakshatraPaya", value: "Gold", secondary: "Moon house from Lagna", source: "derived" });
  const unsupported = getKundliDetails({
    planets: [{ name: "Moon", sign: "Ophiuchus", house: 12 }],
    panchanga: { nakshatra: { name: "Unknown" } },
  });
  for (const id of ["yoni", "gana", "nadi", "varna"]) assert.equal(field(unsupported, id).value, null);
});

test("a reported no-sunrise event is not replaced with an estimated time", () => {
  const details = getKundliDetails({
    riseSet: { timeZone: "Arctic/Longyearbyen", sunrise: { status: "no-event", localTime: null } },
  });
  assert.deepEqual(field(details, "sunrise"), {
    id: "sunrise", value: null, secondary: null, source: "unavailable",
  });
});

test("Kundli Details is localized and wired into live charts and saved reports", () => {
  for (const language of languages) {
    assert.notEqual(translate(language, "kundliDetails.title"), "kundliDetails.title");
    for (const detail of getKundliDetails({})) {
      const key = `kundliDetails.field.${detail.id}`;
      assert.notEqual(translate(language, key), key);
    }
    for (const [id, value] of [
      ...["horse", "elephant", "sheep", "serpent", "dog", "cat", "rat", "cow", "buffalo", "tiger", "deer", "monkey", "mongoose", "lion"]
        .map((value) => ["yoni", value]),
      ["gana", "deva"],
      ["gana", "manushya"],
      ["gana", "rakshasa"],
      ["nadi", "adi"],
      ["nadi", "madhya"],
      ["nadi", "antya"],
      ["varna", "brahmin"],
      ["varna", "kshatriya"],
      ["varna", "vaishya"],
      ["varna", "shudra"],
    ]) {
      const key = `kundliDetails.value.${id}.${value}`;
      assert.equal(hasTranslation(language, key), true);
      assert.notEqual(translate(language, key), key);
    }
  }
  const chartPage = source("src/app/ChartStudioWorkspace.tsx");
  const dashboard = source("src/app/Dashboard.tsx");
  const component = source("src/app/KundliDetails.tsx");
  const styles = source("src/app/kundli.css");
  assert.match(chartPage, /<KundliDetails result=\{chart\} language=\{language\} \/>/);
  assert.match(dashboard, /<KundliDetails result=\{openedReport\.result\} language=\{language\} \/>/);
  assert.match(component, /getKundliDetails\(result\)/);
  assert.match(component, /classificationKey && hasTranslation\(language, classificationKey\)/);
  assert.match(styles, /@media\(max-width:560px\)[\s\S]*?\.kundli-details-grid\{grid-template-columns:1fr\}/);
});
