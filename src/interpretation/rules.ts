import { categoryOrder, natalRuleCatalog, type InterpretationCategory } from "./catalog.ts";

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const lords: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const dashaThemes: Record<string, string> = {
  Sun: "authority, visibility, and responsibility", Moon: "care, adaptation, and public responsiveness",
  Mars: "initiative, technical effort, and competition", Mercury: "analysis, communication, and trade",
  Jupiter: "learning, counsel, and growth", Venus: "agreement, aesthetics, and relationships",
  Saturn: "structure, endurance, and long-term work", Rahu: "unconventional aims and unfamiliar environments",
  Ketu: "simplification, review, and reduced attachment to routine",
};
const dignityFactors = new Set(["Exalted", "Debilitated", "Moolatrikona", "Own sign"]);
const generalLimit = "Traditional interpretation only. Astrological symbolism is not scientifically validated or a guaranteed real-world outcome.";

type Planet = { name: string; sign: string; siderealLongitude: number; house: number; motion: string };
type Period = { lord: string; start: string; end: string };
type Pratyantardasha = Period;
type Antardasha = Period & { pratyantardashas: Pratyantardasha[] };
type Mahadasha = Period & { antardashas: Antardasha[] };

export type InterpretationChart = {
  input: { utc: string; localDate?: string; localTime?: string; timeZone?: string };
  settings?: { houseSystem?: string; ayanamsa?: string; node?: string };
  ascendant: { sign: string; longitude: number };
  houses?: { house: number; sign: string; cuspLongitude: number }[];
  planets: Planet[];
  planetaryDignity: { name: string; dignity: string; sign: string; signLord: string }[];
  planetaryAspects?: { convention: string; details: { name: string; house: number; aspectsHouses: number[]; aspectsPlanets: string[] }[] };
  yogasAndDoshas: { id: string; name: string; category: "yoga" | "dosha"; present: boolean; rule: string; planets: string[] }[];
  vimshottariDasha: {
    convention: { yearDays: number };
    mahadashas: Mahadasha[];
  };
  transits?: { instantUtc: string; ayanamsa?: string; bodies: { name: string; sign: string; longitude: number }[] };
};

export type EvidenceStrength = "single calculated factor" | "multiple calculated factors";
export type Interpretation = {
  id: string;
  section: InterpretationCategory;
  title: string;
  factors: string[];
  matchedConditions: string[];
  dashaFactors: string[];
  transitFactors: string[];
  conflicts: string[];
  evidenceStrength: EvidenceStrength;
  rule: string;
  ruleSource: string;
  reading: string;
  limitation: string;
};

function selectedHouseSign(chart: InterpretationChart, house: number): string | undefined {
  return chart.houses?.find((cusp) => cusp.house === house)?.sign ?? signs[(signs.indexOf(chart.ascendant.sign) + house - 1) % 12];
}

function getPlanet(chart: InterpretationChart, name: string): Planet | undefined {
  if (name === "Rahu" || name === "Ketu") {
    const preferred = chart.settings?.node === "mean" ? "Mean" : "True";
    const counterpart = name === "Rahu" ? "node" : "Ketu";
    return chart.planets.find((planet) => planet.name === `${preferred} ${counterpart}`)
      ?? chart.planets.find((planet) => planet.name === `${preferred === "True" ? "Mean" : "True"} ${counterpart}`);
  }
  return chart.planets.find((planet) => planet.name === name);
}

function rashiHouse(sign: string, ascendant: string): number | undefined {
  const signIndex = signs.indexOf(sign);
  const ascendantIndex = signs.indexOf(ascendant);
  if (signIndex < 0 || ascendantIndex < 0) return undefined;
  return (signIndex - ascendantIndex + 12) % 12 + 1;
}

function periodAt<T extends { start: string; end: string }>(periods: T[], time: number): T | undefined {
  return periods.find((period) => {
    const start = Date.parse(period.start);
    const end = Date.parse(period.end);
    return Number.isFinite(start) && Number.isFinite(end) && start <= time && time < end;
  });
}

function makeSummary(chart: InterpretationChart, sections: ReturnType<typeof buildSections>['sections'], currentMaha: Mahadasha | undefined, currentAntar: Antardasha | undefined, currentPratyantar: Pratyantardasha | undefined, transitNames: string[]) {
  const overviewPlanets = chart.planets.slice(0, 6);
  const moon = chart.planets.find((planet) => planet.name === "Moon");
  const sun = chart.planets.find((planet) => planet.name === "Sun");
  const ascendantLine = `Lagna is ${chart.ascendant.sign}${moon ? ` and Moon is in ${moon.sign}` : ""}${sun ? `; Sun is in ${sun.sign}` : ""}.`;
  const sourceSections = [
    sections.find((section) => section.name === "Personality"),
    sections.find((section) => section.name === "Career"),
    sections.find((section) => section.name === "Business"),
    sections.find((section) => section.name === "Finances"),
    sections.find((section) => section.name === "Relationships"),
  ].filter(Boolean) as typeof sections;

  const strongFactors = Array.from(new Set(
    sourceSections.flatMap((section) => section.interpretations.slice(0, 2).flatMap((item) => item.factors.slice(0, 2)))
  )).slice(0, 4);

  const cautionAreas = Array.from(new Set(
    sections
      .filter((section) => ["Education", "Relationships", "Transits", "Yogas and Doshas"].includes(section.name))
      .flatMap((section) => section.interpretations.slice(0, 2).flatMap((item) => [
        ...(item.conflicts.length ? item.conflicts : []),
        ...(item.factors.slice(0, 2)),
      ]))
  )).slice(0, 4);

  const opportunities = Array.from(new Set(
    sections
      .filter((section) => ["Career", "Business", "Finances"].includes(section.name))
      .flatMap((section) => section.interpretations.slice(0, 2).flatMap((item) => item.title ? [item.title] : []))
  )).slice(0, 3);

  const timingWindows = [
    currentMaha ? `${currentMaha.lord} Mahadasha is active.` : "No active Mahadasha is resolved.",
    currentAntar ? `${currentAntar.lord} Antardasha is active.` : "No active Antardasha is resolved.",
    ...transitNames.slice(0, 2),
  ].filter(Boolean).slice(0, 3);

  const recommendations = [
    opportunities[0] ? `Give thoughtful attention to ${opportunities[0].toLowerCase()}.` : "Keep a measured, evidence-based approach to career and business decisions.",
    cautionAreas[0] ? `Protect stability in areas reflected by ${cautionAreas[0].toLowerCase()}.` : "Maintain flexibility in relationships and education-related planning.",
    currentMaha ? `Use the current ${currentMaha.lord} period as a context for timing rather than a guarantee.` : "Treat the current timing as a general framework, not a fixed prediction.",
  ];

  const finalConclusion = `${ascendantLine} The strongest chart emphasis is ${strongFactors[0] ? strongFactors[0].replace(/.*?:\s*/, "") : "read from the relevant houses and planetary placements"}, while ${cautionAreas[0] ? cautionAreas[0].replace(/.*?:\s*/, "") : "the chart remains balanced when considered alongside the current Dasha and transit context"}. ${currentMaha ? `Current ${currentMaha.lord} Mahadasha frames the theme of the period.` : "No current Mahadasha could be resolved for the selected instant."} The overall reading should guide practical choices rather than impose a fixed outcome.`;

  return {
    overview: ascendantLine,
    strongFactors: strongFactors.slice(0, 3),
    cautionAreas: cautionAreas.slice(0, 3),
    opportunities: opportunities.slice(0, 3),
    timingWindows: timingWindows.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    finalConclusion,
  };
}

function buildSections(chart: InterpretationChart, results: Interpretation[], missingByCategory: Map<InterpretationCategory, Set<string>>, currentMaha: Mahadasha | undefined) {
  const sections = categoryOrder.map((name: InterpretationCategory) => ({
    name,
    available: results.some((item) => item.section === name),
    unavailableReason: name === "Dasha" && !currentMaha
      ? "No Mahadasha period contains the selected instant, or the period data is incomplete."
      : name === "Transits" && !chart.transits
        ? "No selected-date transit snapshot was supplied."
        : missingByCategory.has(name)
          ? `Required calculated factors are missing: ${[...missingByCategory.get(name)!].join(", ")}.`
          : undefined,
    interpretations: results.filter((item) => item.section === name),
  }));
  return { sections };
}

export function interpretChart(chart: InterpretationChart, at = new Date()) {
  const results: Interpretation[] = [];
  const seen = new Set<string>();
  const missingByCategory = new Map<InterpretationCategory, Set<string>>();
  const dignity = new Map(chart.planetaryDignity.map((item) => [item.name, item]));
  const framework = chart.settings?.houseSystem ?? "Whole Sign (Rashi fallback)";
  const add = (item: Omit<Interpretation, "evidenceStrength" | "conflicts" | "dashaFactors" | "transitFactors"> & Partial<Pick<Interpretation, "evidenceStrength" | "conflicts" | "dashaFactors" | "transitFactors">>) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    results.push({
      ...item,
      matchedConditions: item.matchedConditions,
      dashaFactors: item.dashaFactors ?? [],
      transitFactors: item.transitFactors ?? [],
      conflicts: item.conflicts ?? [],
      evidenceStrength: item.evidenceStrength ?? (item.matchedConditions.length > 1 ? "multiple calculated factors" : "single calculated factor"),
    });
  };

  for (const definition of natalRuleCatalog) {
    const usedPlanets = definition.planets.map((name) => ({ name, planet: getPlanet(chart, name) }));
    const presentHouses = definition.houses.map((number) => ({ number, sign: selectedHouseSign(chart, number) }));
    const houseLordPlanets = presentHouses.map(({ sign }) => ({ sign, lord: sign ? lords[sign] : undefined }));
    const missing = [
      ...presentHouses.filter((house) => !house.sign).map((house) => `House ${house.number} cusp sign`),
      ...houseLordPlanets.filter((house) => house.lord && !getPlanet(chart, house.lord)).map((house) => `Lord ${house.lord}`),
      ...usedPlanets.filter((item) => !item.planet).map((item) => item.name),
    ];
    if (missing.length) {
      const categoryMissing = missingByCategory.get(definition.category) ?? new Set<string>();
      missing.forEach((factor) => categoryMissing.add(factor));
      missingByCategory.set(definition.category, categoryMissing);
      continue;
    }

    const houseFactors = presentHouses.map(({ number, sign }) => {
      const lord = lords[sign!];
      const lordPlanet = getPlanet(chart, lord);
      const occupants = chart.planets.filter((planet) => planet.house === number).map((planet) => planet.name);
      const location = lordPlanet ? `house ${lordPlanet.house}` : "placement unavailable";
      const lordDignity = dignity.get(lord);
      return {
        factor: `House ${number}: ${sign} cusp${lord ? `; lord ${lord}` : ""}${lordPlanet ? ` in ${lordPlanet.sign}, ${location}` : ""}${lordDignity ? `; reported dignity ${lordDignity.dignity}` : ""}${occupants.length ? `; occupants ${occupants.join(", ")}` : "; no listed occupants"}`,
        condition: `House ${number} sign and lordship considered`,
      };
    });
    const planetaryFactors = usedPlanets.map(({ name, planet }) => `${name}${name === "Rahu" || name === "Ketu" ? ` (${planet!.name}; ${chart.settings?.node ?? "selected"} node mode)` : ""}: ${planet!.sign}, house ${planet!.house}${planet!.motion === "Retrograde" ? ", retrograde" : ""}`);
    const relevantPlanets = [...new Set([...usedPlanets.map(({ name }) => name), ...houseLordPlanets.map(({ lord }) => lord).filter((lord): lord is string => Boolean(lord))])];
    const conflicts = relevantPlanets.flatMap((name) => {
      const condition = dignity.get(name);
      return condition && (condition.dignity === "Debilitated" || condition.dignity === "Enemy")
        ? [`${name} has reported ${condition.dignity.toLowerCase()} dignity in ${condition.sign}.`]
        : [];
    });
    const allFactors = [...houseFactors.map((item) => item.factor), ...planetaryFactors];
    const matchedConditions = [...houseFactors.map((item) => item.condition), ...usedPlanets.map(({ name, planet }) => `${name} placement available`)];
    const personalizedHouseLinks = presentHouses.map(({ number, sign }) => {
      const lord = lords[sign!];
      const placement = getPlanet(chart, lord);
      return `House ${number} (${sign}) lord ${lord} is in ${placement!.sign}, house ${placement!.house}`;
    }).join("; ");
    const personalizedPlanetLinks = planetaryFactors.join("; ");
    const interpretation = definition.id === "personality-lagna-lord"
      ? `${definition.theme} For this chart, Lagna is ${chart.ascendant.sign} at ${chart.ascendant.longitude.toFixed(2)}°; ${personalizedHouseLinks}; ${personalizedPlanetLinks}. This is a symbolic traditional reading, not a personality diagnosis.`
      : `${definition.theme} For this chart, ${personalizedHouseLinks}; ${personalizedPlanetLinks}. These chart-specific links indicate traditional areas of emphasis only; they do not establish aptitude, wealth, occupation, or relationship outcomes.`;
    add({
      id: definition.id,
      section: definition.category,
      title: definition.category === "Personality" ? `${chart.ascendant.sign} Lagna and temperament factors` : `${definition.category} factors`,
      factors: allFactors,
      matchedConditions,
      rule: `${definition.convention} House framework: ${framework}.`,
      ruleSource: definition.convention,
      reading: interpretation,
      limitation: `${generalLimit} No D9/D10/D60 inference is used; no independently validated outcome rule is available.`,
      conflicts,
    });
  }

  for (const item of chart.planetaryDignity) {
    if (!dignityFactors.has(item.dignity)) continue;
    add({
      id: `dignity-${item.name}-${item.dignity}`,
      section: "Planetary strengths",
      title: `${item.name}: ${item.dignity}`,
      factors: [`${item.name} in ${item.sign}`, `Reported dignity: ${item.dignity}`, `Sign lord: ${item.signLord}`],
      matchedConditions: [`Configured dignity table reports ${item.dignity}`],
      rule: "Configured sidereal planetary dignity classification.",
      ruleSource: "Dignity tables documented in src/calculation/yogas.ts; tradition and table variants may differ.",
      reading: `${item.dignity} is the engine's reported dignity classification. Classical readings may treat it as a relative symbolic strength or challenge, not as a real-world result.`,
      limitation: generalLimit,
    });
  }

  for (const finding of chart.yogasAndDoshas.filter((item) => item.present)) {
    add({
      id: `yoga-${finding.id}`,
      section: "Yogas and Doshas",
      title: finding.name,
      factors: [`Matched bodies: ${finding.planets.join(", ") || "none listed"}`, `Calculation rule: ${finding.rule}`],
      matchedConditions: [finding.rule],
      rule: finding.rule,
      ruleSource: "The literal rule is supplied by the local yoga/dosha calculation module; rule convention may be broad or school-dependent.",
      reading: `The calculation engine reports this ${finding.category} as present under the stated condition. Presence alone does not establish its strength or promise an outcome.`,
      limitation: generalLimit,
    });
  }

  const now = at.getTime();
  const currentMaha = periodAt(chart.vimshottariDasha.mahadashas, now);
  const currentAntar = currentMaha && periodAt(currentMaha.antardashas, now);
  const currentPratyantar = currentAntar && periodAt(currentAntar.pratyantardashas, now);
  if (currentMaha) {
    const active = [
      { level: "Mahadasha", period: currentMaha },
      ...(currentAntar ? [{ level: "Antardasha", period: currentAntar }] : []),
      ...(currentPratyantar ? [{ level: "Pratyantardasha", period: currentPratyantar }] : []),
    ];
    for (const entry of active) {
      const planet = getPlanet(chart, entry.period.lord);
      if (!planet) continue;
      const condition = dignity.get(entry.period.lord);
      const coSign = chart.planets.filter((other) => other.name !== planet.name && other.sign === planet.sign).map((other) => other.name);
      const aspects = chart.planetaryAspects?.details.find((detail) => detail.name === entry.period.lord)?.aspectsPlanets ?? [];
      const activeInteractions = [...new Set(active
        .filter((other) => other.period.lord !== entry.period.lord)
        .flatMap((other) => {
          const otherPlanet = getPlanet(chart, other.period.lord);
          if (!otherPlanet) return [];
          if (otherPlanet.sign === planet.sign) return [`Active ${entry.period.lord}/${other.period.lord} lords share ${planet.sign}.`];
          const reciprocal = chart.planetaryAspects?.details.some((detail) =>
            (detail.name === entry.period.lord && detail.aspectsPlanets.includes(other.period.lord))
            || (detail.name === other.period.lord && detail.aspectsPlanets.includes(entry.period.lord)));
          return reciprocal ? [`Available Parashari aspect links active ${entry.period.lord}/${other.period.lord} lords.`] : [];
        }))];
      const houseLordships = Array.from({ length: 12 }, (_, index) => index + 1)
        .filter((house) => lords[selectedHouseSign(chart, house) ?? ""] === entry.period.lord);
      const factors = [
        `${entry.level}: ${entry.period.lord} (${entry.period.start} to ${entry.period.end}; start inclusive, end exclusive)`,
        `Natal ${entry.period.lord}: ${planet.sign}, selected-system house ${planet.house}${planet.motion === "Retrograde" ? ", retrograde" : ""}`,
        `House lordships under ${framework}: ${houseLordships.length ? houseLordships.join(", ") : "none resolved"}`,
        ...(condition ? [`Reported dignity: ${condition.dignity} in ${condition.sign}`] : []),
        ...(coSign.length ? [`Same-sign planets: ${coSign.join(", ")}`] : []),
        ...(aspects.length ? [`Parashari aspects to: ${aspects.join(", ")}`] : []),
        ...activeInteractions,
      ];
      add({
        id: `dasha-${entry.level.toLowerCase()}-${entry.period.lord}-${entry.period.start}`,
        section: "Dasha",
        title: `Active ${entry.level}: ${entry.period.lord}`,
        factors,
        matchedConditions: [`${entry.period.lord} period contains the selected instant`, `${entry.period.lord} natal placement and house lordships resolved`],
        dashaFactors: factors.filter((factor) => factor.startsWith(`${entry.level}:`) || factor.startsWith(`Natal ${entry.period.lord}:`) || factor.startsWith("Active ") || factor.startsWith("Reported dignity:") || factor.startsWith("House lordships")),
        rule: "Vimshottari period hierarchy from the existing chart engine, contextualized by the period lord's natal Rashi placement and selected-house framework.",
        ruleSource: `Vimshottari convention: ${chart.vimshottariDasha.convention.yearDays}-day year; natal context uses the configured sidereal chart.`,
        reading: `${entry.period.lord} is traditionally associated with ${dashaThemes[entry.period.lord] ?? "its planetary themes"}. Its natal sign, house, resolved lordships, and any listed dignity/association are the contextual factors; this is not a dated event prediction.`,
        limitation: `${generalLimit} Divisional charts and transits are not folded into this reading because their suitability is not established by this rule set.`,
        conflicts: condition?.dignity === "Debilitated" || condition?.dignity === "Enemy" ? [`The reported dignity is ${condition.dignity.toLowerCase()}, a contextual challenge in this convention.`] : [],
      });
    }
  }

  const transitInstant = chart.transits?.instantUtc;
  if (transitInstant && Number.isFinite(Date.parse(transitInstant))) {
    for (const transit of chart.transits!.bodies) {
      const natal = getPlanet(chart, transit.name);
      if (!natal || natal.sign === transit.sign) continue;
      const transitHouse = rashiHouse(transit.sign, chart.ascendant.sign);
      const when = new Date(transitInstant).toISOString();
      const factors = [
        `Natal ${transit.name}: ${natal.sign}, natal house ${natal.house}`,
        `Transit ${transit.name}: ${transit.sign} at ${transit.longitude.toFixed(2)}°${transitHouse ? `, Rashi house ${transitHouse} from Lagna` : ""}`,
        `Transit instant: ${when}${chart.input.timeZone ? ` (${chart.input.timeZone})` : ""}`,
        ...(chart.transits?.ayanamsa ? [`Transit ayanamsa: ${chart.transits.ayanamsa}`] : []),
      ];
      add({
        id: `transit-${transit.name}-${when}`,
        section: "Transits",
        title: `${transit.name}: selected-date sign comparison`,
        factors,
        matchedConditions: [`Transit sign differs from natal sign`, `Selected transit snapshot: ${when}`],
        transitFactors: factors.slice(0, 3),
        rule: "Compare selected-date sidereal transit sign with natal sign; Lagna-relative house is explicitly Rashi-counted.",
        ruleSource: "Selected local Swiss Ephemeris transit snapshot; sign and Rashi-house comparison convention.",
        reading: `At the selected transit instant, ${transit.name} is in ${transit.sign}, unlike its natal sign ${natal.sign}. This is a calculated placement comparison, not an event forecast.`,
        limitation: `${generalLimit} Transit house is counted by sign from Lagna, not by the selected non-sign cusp system.`,
      });
    }
  }

  const { sections } = buildSections(chart, results, missingByCategory, currentMaha);
  const transitNames = chart.transits?.bodies.slice(0, 2).map((body) => `Transit ${body.name}: ${body.sign}`) ?? [];
  const summary = makeSummary(chart, sections, currentMaha, currentAntar, currentPratyantar, transitNames);
  return {
    generatedAt: at.toISOString(),
    asOf: at.toISOString(),
    currentDasha: currentMaha ? {
      maha: currentMaha.lord,
      antar: currentAntar?.lord ?? null,
      pratyantar: currentPratyantar?.lord ?? null,
    } : null,
    houseFramework: framework,
    calculatedFactsRemainSeparate: true as const,
    disclaimer: "Astronomical placements are calculated outputs; interpretations are traditional astrology and are not scientifically established or guaranteed predictions.",
    summary,
    sections,
  };
}
