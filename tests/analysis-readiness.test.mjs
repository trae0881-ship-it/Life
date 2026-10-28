import test from "node:test";
import assert from "node:assert/strict";
import { analysisReadiness } from "../src/calculation/analysis-readiness.ts";
import { hasTranslation, translate } from "../src/presentation/language.ts";
import { ageOnDate, timelineRange } from "../src/calculation/life-timeline.ts";

const completeBirthDetails = {
  localDate: "2000-02-29",
  localTime: "12:30",
  timeZone: "Asia/Kolkata",
  latitude: 28.6139,
  longitude: 77.209,
  birthPlace: "New Delhi, India",
  timeKnown: true,
};

test("analysis readiness progresses only when required profile/chart inputs are present", () => {
  assert.equal(analysisReadiness({}), "MISSING_DOB");
  assert.equal(analysisReadiness({ localDate: "2000-02-29" }), "DOB_AVAILABLE");
  assert.equal(analysisReadiness({ localDate: "2000-02-29", timeKnown: false }), "DOB_AVAILABLE");
  assert.equal(analysisReadiness({ localDate: "2000-02-29", birthPlace: "Delhi" }), "BIRTH_DETAILS_INCOMPLETE");
  assert.equal(analysisReadiness({ localDate: "2000-02-29", localTime: "12:30" }), "BIRTH_DETAILS_INCOMPLETE");
  assert.equal(analysisReadiness({ ...completeBirthDetails, birthPlace: undefined }), "CHART_READY");
  assert.equal(analysisReadiness(completeBirthDetails), "CHART_READY");
  assert.equal(analysisReadiness(completeBirthDetails, { chartCalculated: true }), "CHART_CALCULATED");
  assert.equal(analysisReadiness(completeBirthDetails, { chartCalculated: true, supportedAnalysisAvailable: true }), "ANALYSIS_READY");
});

test("DOB-only readiness retains the correct 80-year timeline and birthday-based age", () => {
  const dateOnly = { localDate: "1997-04-27" };
  assert.equal(analysisReadiness(dateOnly), "DOB_AVAILABLE");
  assert.deepEqual(timelineRange(dateOnly.localDate), { start: "1997-04-27", end: "2077-04-27" });
  assert.equal(ageOnDate(dateOnly.localDate, "2026-10-19"), 29);
});

test("invalid or unknown birth details never advance analysis readiness", () => {
  assert.equal(analysisReadiness({ ...completeBirthDetails, localDate: "2001-02-29" }), "MISSING_DOB");
  assert.equal(analysisReadiness({ ...completeBirthDetails, timeKnown: false }), "BIRTH_DETAILS_INCOMPLETE");
  assert.equal(analysisReadiness({ ...completeBirthDetails, timeZone: "Mars/Olympus" }), "BIRTH_DETAILS_INCOMPLETE");
  assert.equal(analysisReadiness({ ...completeBirthDetails, latitude: 91 }), "BIRTH_DETAILS_INCOMPLETE");
  assert.equal(analysisReadiness({ ...completeBirthDetails, longitude: Number.NaN }), "BIRTH_DETAILS_INCOMPLETE");
});

test("readiness and saved-report labels are localized in English, Hindi, and Hinglish", () => {
  for (const language of ["en", "hi", "hinglish"]) {
    for (const key of [
      "readiness.title",
      "readiness.MISSING_DOB",
      "readiness.DOB_AVAILABLE",
      "readiness.BIRTH_DETAILS_INCOMPLETE",
      "readiness.CHART_READY",
      "readiness.CHART_CALCULATED",
      "readiness.ANALYSIS_READY",
      "readiness.ANALYSIS_LIMITED",
      "readiness.timelineLink",
      "account.savedCharts",
      "account.reportProfileChanged",
      "account.reportSections",
      "account.reportSettings",
      "account.reportSettingsChanged",
      "account.pdfUnavailable",
      "error.invalidProfileDate",
      "timeline.openDetails",
      "timeline.dashaSource",
      "timeline.dashaUnavailable",
      "timeline.dateOutOfRange",
      "timeline.ageUnavailable",
    ]) {
      assert.equal(hasTranslation(language, key), true, `${language} missing ${key}`);
      assert.doesNotMatch(translate(language, key), /Translation unavailable/);
    }
  }
});
