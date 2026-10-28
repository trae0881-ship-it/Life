import { sourcesForRuleIds } from "./marriage-timing-sources.ts";

type KpPlanet = { name: string; significations: { houses: number[] } };
type KpCusp = { house: number; sub: { lord: string }; subSub: { lord: string }; nakshatra: { lord: string }; sign: string; signLord: string; signifiedBy: string[] };
type DashaPeriod = { lord: string; start: string; end: string; antardashas: { lord: string; start: string; end: string; pratyantardashas: { lord: string; start: string; end: string }[] }[] };
export type MarriageTimingChart = {
  input: { timeZone: string };
  settings?: { ayanamsa?: string; houseSystem?: string; ruleSetVersion?: string; engine?: string };
  kp: { system: string; ayanamsa: string; houseSystem: string; planets: KpPlanet[]; cusps: KpCusp[] } | null;
  vimshottariDasha: { mahadashas: DashaPeriod[] };
  transits?: { instantUtc: string; horizonDays: number; bodies: { name: string; sign: string; longitude: number; nextSignIngress: { utc: string; fromSign: string; toSign: string; direction: string } | null }[] };
};

export type MarriageCandidateWindow = {
  start: string;
  end: string;
  start_date: string;
  end_date: string;
  mahadasha: string;
  bhukti: string;
  antara: string;
  supporting_lords: string[];
};

export type MarriageTimingResult = {
  status: "candidate_window" | "multiple_windows" | "insufficient_evidence";
  earliest_date: string | null;
  latest_date: string | null;
  candidate_windows: MarriageCandidateWindow[];
  supporting_dasha_periods: { mahadasha: string; bhukti: string; antara: string; start: string; end: string; supporting_lords: string[] }[];
  kp_evidence: string[];
  transit_evidence: string[];
  contradictory_evidence: string[];
  rule_ids: string[];
  source_ids: string[];
  explanation_en: string;
  explanation_hi: string;
  explanation_hinglish: string;
  limitations: string[];
};

function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function overlapPeriods(maha: { start: string; end: string }, bhukti: { start: string; end: string }, antara: { lord: string; start: string; end: string }) {
  const start = Math.max(Date.parse(maha.start), Date.parse(bhukti.start), Date.parse(antara.start));
  const end = Math.min(Date.parse(maha.end), Date.parse(bhukti.end), Date.parse(antara.end));
  return start < end ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : null;
}

export function calculateMarriageTiming(chart: MarriageTimingChart, asOf = new Date()): MarriageTimingResult {
  const base = {
    earliest_date: null,
    latest_date: null,
    candidate_windows: [],
    supporting_dasha_periods: [],
    kp_evidence: [],
    transit_evidence: [],
    contradictory_evidence: [],
    rule_ids: ["KP-2-7-11-SIGNIFICATORS", "KP-7TH-CUSP-SUB-LORD", "KP-DASHA-INTERSECTION", "KP-TRANSIT-SECONDARY-ONLY", "KP-NO-GUARANTEE"],
    source_ids: ["source-life-kp-window-limitation"],
    limitations: [
      "A candidate Dasha window is not a marriage date, guarantee, probability or event prediction.",
      "LIFE does not implement a reviewed KP marriage-event transit filter; no transit evidence is used to qualify or date these periods.",
      "Traditional KP interpretation is convention-based and is not scientifically established.",
    ],
  };
  if (!chart.kp?.cusps?.length || !chart.kp.planets?.length) {
    return { ...base, status: "insufficient_evidence", source_ids: ["source-life-kp-window-limitation"], explanation_en: "Insufficient evidence: KP cusps and planetary significations are unavailable, so LIFE will not estimate a marriage window.", explanation_hi: "प्रमाण अपर्याप्त है: KP cusp और ग्रह significations उपलब्ध नहीं हैं, इसलिए LIFE विवाह की अवधि का अनुमान नहीं लगाएगा।", explanation_hinglish: "Evidence insufficient hai: KP cusps aur planetary significations available nahi hain, isliye LIFE marriage window estimate nahi karega." };
  }
  const seventh = chart.kp.cusps.find((cusp) => cusp.house === 7);
  const kpPlanets = new Map(chart.kp.planets.map((planet) => [planet.name, planet]));
  if (!seventh || !seventh.sub?.lord) {
    return { ...base, status: "insufficient_evidence", explanation_en: "Insufficient evidence: the 7th-cusp sub-lord is unavailable, so the required KP relationship anchor cannot be evaluated.", explanation_hi: "प्रमाण अपर्याप्त है: 7वें cusp का sub-lord उपलब्ध नहीं है, इसलिए आवश्यक KP संबंध आधार का मूल्यांकन नहीं हो सकता।", explanation_hinglish: "Evidence insufficient hai: 7th cusp ka sub-lord available nahi hai, isliye required KP relationship anchor evaluate nahi ho sakta." };
  }
  const targetHouses = new Set([2, 7, 11]);
  const supportiveLords = chart.kp.planets.filter((planet) => planet.significations.houses.some((house) => targetHouses.has(house))).map((planet) => planet.name);
  const seventhSub = kpPlanets.get(seventh.sub.lord);
  const seventhSubHouses = seventhSub?.significations.houses ?? [];
  const kpEvidence = [
    `7th cusp: ${seventh.sign} ${seventh.signLord}; star lord ${seventh.nakshatra.lord}; sub-lord ${seventh.sub.lord}; sub-sub-lord ${seventh.subSub.lord}.`,
    `7th-cusp sub-lord ${seventh.sub.lord} signifies houses: ${seventhSubHouses.length ? seventhSubHouses.join(", ") : "none available"}.`,
    `House 2 significators: ${chart.kp.cusps.find((cusp) => cusp.house === 2)?.signifiedBy.join(", ") || "none"}.`,
    `House 7 significators: ${chart.kp.cusps.find((cusp) => cusp.house === 7)?.signifiedBy.join(", ") || "none"}.`,
    `House 11 significators: ${chart.kp.cusps.find((cusp) => cusp.house === 11)?.signifiedBy.join(", ") || "none"}.`,
    `Supportive planet lords with 2/7/11 significations: ${supportiveLords.join(", ") || "none"}.`,
  ];
  const periods: MarriageTimingResult["supporting_dasha_periods"] = [];
  for (const maha of chart.vimshottariDasha.mahadashas) {
    for (const bhukti of maha.antardashas) {
      for (const antara of bhukti.pratyantardashas) {
        const lords = [maha.lord, bhukti.lord, antara.lord];
        const allSupport = lords.every((lord) => supportiveLords.includes(lord));
        const cuspSupport = seventhSubHouses.some((house) => targetHouses.has(house));
        const overlap = overlapPeriods(maha, bhukti, antara);
        if (allSupport && cuspSupport && overlap && Date.parse(overlap.end) > asOf.getTime()) {
          periods.push({ mahadasha: maha.lord, bhukti: bhukti.lord, antara: antara.lord, ...overlap, supporting_lords: lords });
        }
      }
    }
  }
  const uniquePeriods = [...new Map(periods.map((period) => [
    `${period.start}|${period.end}|${period.mahadasha}|${period.bhukti}|${period.antara}`,
    period,
  ])).values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Date.parse(a.end) - Date.parse(b.end));
  const candidateWindows: MarriageCandidateWindow[] = uniquePeriods.map((period) => ({
    ...period,
    start_date: localDate(period.start, chart.input.timeZone),
    end_date: localDate(period.end, chart.input.timeZone),
  }));
  const transitEvidence: string[] = [];
  const contradictory = supportiveLords.length === 0 ? ["No planet in the available KP chart signifies any of houses 2, 7 or 11 under the project's four-fold rule."] : [];
  const sourceIds = ["source-life-kp-convention", "source-life-kp-window-limitation", "source-iana-time-zone-database"];
  if (!uniquePeriods.length) {
    return { ...base, status: "insufficient_evidence", kp_evidence: kpEvidence, transit_evidence: transitEvidence, contradictory_evidence: contradictory, source_ids: sourceIds, explanation_en: "Insufficient evidence: no future Mahadasha/Bhukti/Antara intersection satisfies both the 2/7/11 significator rule and the 7th-cusp sub-lord condition.", explanation_hi: "प्रमाण अपर्याप्त है: कोई भी भविष्य Mahadasha/Bhukti/Antara अवधि 2/7/11 significator नियम और 7वें cusp sub-lord की शर्त दोनों पूरी नहीं करती।", explanation_hinglish: "Evidence insufficient hai: koi future Mahadasha/Bhukti/Antara intersection 2/7/11 significator rule aur 7th-cusp sub-lord condition dono satisfy nahi karta." };
  }
  const earliest = uniquePeriods[0].start;
  const latest = uniquePeriods[uniquePeriods.length - 1].end;
  const singleWindow = uniquePeriods.length === 1;
  return {
    ...base,
    status: singleWindow ? "candidate_window" : "multiple_windows",
    earliest_date: localDate(earliest, chart.input.timeZone),
    latest_date: localDate(latest, chart.input.timeZone),
    candidate_windows: candidateWindows,
    supporting_dasha_periods: uniquePeriods,
    kp_evidence: kpEvidence,
    transit_evidence: transitEvidence,
    contradictory_evidence: contradictory,
    source_ids: sourceIds,
    explanation_en: singleWindow
      ? "The displayed candidate window is the intersection of one future Vimshottari Dasha hierarchy period whose three lords signify houses 2, 7 or 11 and whose 7th-cusp sub-lord also signifies at least one of those houses. It is a traditional candidate period, not a marriage date."
      : `The calculation found ${uniquePeriods.length} separate future Vimshottari Dasha candidate periods. Their earliest start and latest end are shown as bounds, not as one continuous period. Each period meets the same 2/7/11 and 7th-cusp sub-lord conditions. These are traditional candidate periods, not a marriage date.`,
    explanation_hi: singleWindow
      ? "दिखाई गई संभावित अवधि एक भविष्य की विंशोत्तरी दशा अवधि का intersection है, जिसके तीनों lord 2, 7 या 11 भाव signify करते हैं और 7वें cusp का sub-lord भी इनमें से कम-से-कम एक भाव signify करता है। यह पारंपरिक संभावित अवधि है, विवाह की तारीख नहीं।"
      : `गणना में ${uniquePeriods.length} अलग-अलग भविष्य की विंशोत्तरी दशा संभावित अवधियाँ मिली हैं। उनकी सबसे पहली शुरुआत और सबसे अंतिम समाप्ति केवल सीमाएँ हैं, एक लगातार अवधि नहीं। हर अवधि 2/7/11 और 7वें cusp sub-lord की समान शर्तें पूरी करती है। ये पारंपरिक संभावित अवधियाँ हैं, विवाह की तारीख नहीं।`,
    explanation_hinglish: singleWindow
      ? "Dikhaya gaya candidate window ek future Vimshottari Dasha hierarchy period ka intersection hai jiske teenon lords 2, 7 ya 11 houses signify karte hain aur 7th-cusp sub-lord bhi inmein se kam-se-kam ek house signify karta hai. Yeh traditional candidate period hai, marriage date nahi."
      : `Calculation mein ${uniquePeriods.length} alag future Vimshottari Dasha candidate periods mile hain. Sabse pehli start aur sabse aakhri end sirf bounds hain, continuous period nahi. Har period same 2/7/11 aur 7th-cusp sub-lord conditions satisfy karta hai. Yeh traditional candidate periods hain, marriage date nahi.`,
  };
}

export function marriageTimingSourcesForResult(result: MarriageTimingResult) {
  return sourcesForRuleIds(result.rule_ids).filter((source) => result.source_ids.includes(source.id));
}
