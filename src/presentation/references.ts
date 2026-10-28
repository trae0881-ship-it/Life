export const referenceCategories = [
  "Astronomy and ephemeris",
  "Astrology traditions and calculation methods",
  "Panchanga, Dasha and divisional charts",
  "KP astrology",
  "Birthplace, timezone and geographic datasets",
  "Software libraries and technical documentation",
  "Research, educational material and editorial sources",
] as const;

export type ReferenceCategory = typeof referenceCategories[number];
export type ReferenceVerificationStatus = "verified" | "partially_verified" | "not_yet_verified";
export type ReferenceFeature =
  | "astronomical-positions"
  | "chart-pipeline-validation"
  | "chart-conventions"
  | "divisional-chart-mapping"
  | "vimshottari-dasha"
  | "panchanga"
  | "kp-and-marriage-timing"
  | "kundli-classifications"
  | "interpretation-rules"
  | "remedy-education"
  | "birthplace-search"
  | "timezone-resolution"
  | "time-scale-limitations";

export const referenceFeatures: Record<ReferenceFeature, string> = {
  "astronomical-positions": "Astronomical positions and ephemeris calculations",
  "chart-pipeline-validation": "Narrow numerical cross-check fixtures",
  "chart-conventions": "LIFE's documented chart calculation conventions",
  "divisional-chart-mapping": "D2–D60 divisional sign mapping",
  "vimshottari-dasha": "Vimshottari Dasha period calculation",
  panchanga: "Panchanga conventions and calculated labels",
  "kp-and-marriage-timing": "KP rules and candidate-window implementation",
  "kundli-classifications": "Yoni, Gana, Nadi and Moon-Rashi Varna classifications",
  "interpretation-rules": "Traditional interpretation rules",
  "remedy-education": "Non-prescriptive remedy education records",
  "birthplace-search": "Offline birthplace search",
  "timezone-resolution": "Birth local-time and timezone resolution",
  "time-scale-limitations": "Time-scale provenance and limitations",
};

export type ReferenceEntry = {
  id: string;
  title: string;
  authors_or_organization: string;
  category: ReferenceCategory;
  publisher: string | null;
  url: string | null;
  publication_date: string | null;
  version: string | null;
  accessed_at: string | null;
  description: string;
  used_by: ReferenceFeature[];
  verification_status: ReferenceVerificationStatus;
  verification_review?: {
    checked_at: string;
    method: string;
    evidence: string[];
  };
  license?: string | null;
  rule_ids?: string[];
};

export const referenceRegistry: ReferenceEntry[] = [
  {
    id: "source-swiss-ephemeris-info",
    title: "Swiss Ephemeris: Technical Information",
    authors_or_organization: "Astrodienst AG",
    category: "Astronomy and ephemeris",
    publisher: "Astrodienst",
    url: "https://www.astro.com/swisseph/swephinfo_e.htm",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Technical and licensing background for the Swiss Ephemeris engine used by LIFE. This documents the upstream engine; it does not independently validate all LIFE outputs.",
    used_by: ["astronomical-positions"],
    verification_status: "partially_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Official technical page inspected; local Swiss engine tests rerun. Upstream claims do not validate every LIFE output, and bundled-data licensing remains separate.",
      evidence: ["https://www.astro.com/swisseph/swephinfo_e.htm", "src/calculation/engine.ts", "tests/engine.test.mjs"],
    },
  },
  {
    id: "swiss-ephemeris-programmer-manual",
    title: "Swiss Ephemeris Programmer's Documentation",
    authors_or_organization: "Astrodienst AG",
    category: "Software libraries and technical documentation",
    publisher: "Astrodienst",
    url: "https://www.astro.com/swisseph-download/doc/swisseph.pdf",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Upstream programmer and licensing documentation. LIFE selected the AGPL path; the redistribution terms for individual bundled ephemeris files remain unresolved.",
    used_by: ["astronomical-positions"],
    verification_status: "partially_verified",
    license: "Swiss Ephemeris dual licensing: AGPL or a professional license; review the original terms.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Official PDF endpoint retrieved but not rendered as readable text by the available fetcher; licensing claim and separate .se1 redistribution rights remain unresolved.",
      evidence: ["https://www.astro.com/swisseph-download/doc/swisseph.pdf", "docs/PHASE_20_CALCULATION_REFERENCE_AUDIT.md"],
    },
  },
  {
    id: "swiss-ephemeris-programming-interface",
    title: "Swiss Ephemeris Programming Interface",
    authors_or_organization: "Astrodienst AG",
    category: "Software libraries and technical documentation",
    publisher: "Astrodienst",
    url: "https://www.astro.com/swisseph/swephprg.htm",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Documents the upstream Julian-day and swe_calc_ut API flow used by the binding. It does not establish that LIFE's UTC-as-UT input is an exact UT1 conversion or independently validate chart outputs.",
    used_by: ["astronomical-positions", "time-scale-limitations"],
    verification_status: "partially_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Official programmer-interface page inspected and compared with the current calculation/time-scale code; no independent end-to-end accuracy claim is made.",
      evidence: ["https://www.astro.com/swisseph/swephprg.htm", "src/calculation/engine.ts", "tests/engine.test.mjs"],
    },
  },
  {
    id: "swisseph-node-package",
    title: "@swisseph/node package",
    authors_or_organization: "Swiss Ephemeris JS contributors",
    category: "Software libraries and technical documentation",
    publisher: "npm / Swiss Ephemeris JS",
    url: "https://github.com/swisseph-js/swisseph/tree/main/packages/node",
    publication_date: null,
    version: "1.4.0",
    accessed_at: null,
    description: "The installed package delegates chart position calls to the Swiss Ephemeris native binding. The upstream repository page and local package metadata identify version 1.4.0 and AGPL-3.0; this does not resolve rights for the separate bundled .se1 files.",
    used_by: ["astronomical-positions"],
    verification_status: "partially_verified",
    license: "AGPL-3.0 according to the installed package metadata and bundled LICENSE. This does not resolve rights for the separate .se1 files.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Upstream repository page and installed package metadata/LICENSE inspected; engine tests pass. Ephemeris-file redistribution terms remain unresolved.",
      evidence: ["https://github.com/swisseph-js/swisseph/tree/main/packages/node", "node_modules/@swisseph/node/package.json", "node_modules/@swisseph/node/LICENSE", "tests/engine.test.mjs"],
    },
  },
  {
    id: "jpl-horizons-de441",
    title: "JPL Horizons System",
    authors_or_organization: "NASA Jet Propulsion Laboratory, Solar System Dynamics Group",
    category: "Astronomy and ephemeris",
    publisher: "NASA/JPL",
    url: "https://ssd.jpl.nasa.gov/horizons/",
    publication_date: null,
    version: "DE441 snapshots in LIFE's checked-in fixtures",
    accessed_at: "2026-10-26",
    description: "Used for fixed comparisons of selected geocentric apparent tropical planetary longitudes and latitudes at documented epochs. These fixtures do not validate LIFE's sidereal conversion, houses, ascendant, or astrology interpretations.",
    used_by: ["chart-pipeline-validation"],
    verification_status: "verified",
  },
  {
    id: "jpl-horizons-api-documentation",
    title: "Horizons API documentation",
    authors_or_organization: "NASA Jet Propulsion Laboratory, Solar System Dynamics Group",
    category: "Software libraries and technical documentation",
    publisher: "NASA/JPL",
    url: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    publication_date: "Version 1.3, 2025-06",
    version: "1.3",
    accessed_at: "2026-10-26",
    description: "Documents the API/query interface used to produce the fixed Horizons comparison fixtures. The offline tests use checked-in results and make no network request.",
    used_by: ["chart-pipeline-validation"],
    verification_status: "verified",
  },
  {
    id: "source-iana-time-zone-database",
    title: "Time Zone Database",
    authors_or_organization: "Internet Assigned Numbers Authority",
    category: "Birthplace, timezone and geographic datasets",
    publisher: "IANA",
    url: "https://www.iana.org/time-zones",
    publication_date: null,
    version: "2026e was listed as the latest IANA release when accessed; this is not a claim about the runtime's bundled version.",
    accessed_at: "2026-10-26",
    description: "The timezone identifier and wall-time rules used in LIFE's conversion flow are reported with chart provenance. Runtime timezone data may differ from the latest IANA release.",
    used_by: ["timezone-resolution", "chart-pipeline-validation"],
    verification_status: "partially_verified",
    rule_ids: ["KP-LOCAL-DATE-CONVERSION"],
    verification_review: {
      checked_at: "2026-10-27",
      method: "Official IANA release page inspected and local wall-time/DST regression tests rerun. This confirms current upstream publication, not the runtime's bundled timezone database version.",
      evidence: ["https://www.iana.org/time-zones", "src/calculation/time.ts", "tests/time.test.mjs"],
    },
  },
  {
    id: "geonames-cities500",
    title: "GeoNames cities500 extract",
    authors_or_organization: "GeoNames",
    category: "Birthplace, timezone and geographic datasets",
    publisher: "GeoNames",
    url: "https://download.geonames.org/export/dump/",
    publication_date: null,
    version: "cities500 extract described in data/locations/README.md",
    accessed_at: "2026-10-26",
    description: "A reduced-field local gazetteer used for birthplace search and suggested coordinates/timezone. It is not exhaustive; users are asked to verify a selected place and may enter coordinates manually. The repository records this extract as downloaded 2026-10-21.",
    used_by: ["birthplace-search"],
    verification_status: "verified",
    license: "Creative Commons Attribution 4.0 (CC BY 4.0): provide attribution, link the license, and indicate changes. The current shard/source-count discrepancy is documented in the audit.",
  },
  {
    id: "pyjhora-varga-mapping-fixture",
    title: "PyJHora pinned source and D2–D60 mapping fixture",
    authors_or_organization: "PyJHora contributors",
    category: "Astrology traditions and calculation methods",
    publisher: "GitHub",
    url: "https://github.com/naturalstupid/PyJHora/tree/ca22995709bd60e371e7820a1a5efc80ce4cf821",
    publication_date: null,
    version: "4.8.7; commit ca22995709bd60e371e7820a1a5efc80ce4cf821",
    accessed_at: "2026-10-26",
    description: "A pinned comparison of synthetic D2–D60 sign mappings only. It is not an input to LIFE, does not validate natal planetary positions, and is not treated as an authority for disputed traditions. Fixture documentation records conflicting upstream license metadata.",
    used_by: ["divisional-chart-mapping"],
    verification_status: "partially_verified",
    license: "The pinned wheel metadata and bundled license say AGPL-3.0; the upstream project also has a conflicting MIT classifier. Review before reuse or redistribution.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Pinned upstream repository page and checked-in numerical fixtures inspected; focused divisional and natal-reference tests pass. Conflicting license metadata remains unresolved.",
      evidence: ["https://github.com/naturalstupid/PyJHora/tree/ca22995709bd60e371e7820a1a5efc80ce4cf821", "tests/divisional-charts.test.mjs", "tests/pyjhora-natal-reference.test.mjs"],
    },
  },
  {
    id: "maitreya8-nakshatra-map",
    title: "Maitreya 8 Nakshatra.cpp",
    authors_or_organization: "Maitreya 8 contributors",
    category: "Software libraries and technical documentation",
    publisher: "GitHub",
    url: "https://github.com/martin-pe/maitreya8/blob/master/src/jyotish/Nakshatra.cpp",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Its explicit index maps were compared with LIFE's selected 27-star Yoni, Gana and Nadi classification tables. This is a software cross-check, not primary-text validation.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: "GNU GPL-2.0-or-later according to the upstream COPYING file. LIFE references the mapping and does not redistribute Maitreya source code.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Upstream raw Nakshatra source inspected and local classification regression tests rerun. This is a software cross-check, not primary-text validation; source reuse/licensing remains subject to review.",
      evidence: ["https://raw.githubusercontent.com/martin-pe/maitreya8/master/src/jyotish/Nakshatra.cpp", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "pyjhora-moon-rashi-varna-crosscheck",
    title: "PyJHora compatibility implementation",
    authors_or_organization: "PyJHora contributors",
    category: "Software libraries and technical documentation",
    publisher: "GitHub",
    url: "https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/horoscope/match/compatibility.py",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Cross-check for the selected Moon-Rashi Varna mapping only. It does not establish a universal or scientifically validated interpretation.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: null,
    verification_review: {
      checked_at: "2026-10-27",
      method: "Upstream raw compatibility implementation inspected and local Moon-sign classification tests rerun; no universal or tradition-level claim is inferred.",
      evidence: ["https://raw.githubusercontent.com/naturalstupid/PyJHora/main/src/jhora/horoscope/match/compatibility.py", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "saravali-yoni-koota",
    title: "Yoni Koota",
    authors_or_organization: "Saravali",
    category: "Astrology traditions and calculation methods",
    publisher: "Saravali",
    url: "https://saravali.github.io/astrology/koota_yoni.html",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "A published 27-star table used as one reference for LIFE's selected Yoni category mapping. LIFE does not calculate compatibility scores or claim the tradition is scientifically validated.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: "Existing LIFE documentation reports CC BY-SA 4.0, but an authoritative license notice could not be verified on the cited page or linked repository. Confirm reuse terms before redistributing adapted table data.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Cited table page inspected and local 27-star mapping tests rerun. No authoritative reuse license notice was established; status remains partial.",
      evidence: ["https://saravali.github.io/astrology/koota_yoni.html", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "saravali-gana-koota",
    title: "Gana Koota",
    authors_or_organization: "Saravali",
    category: "Astrology traditions and calculation methods",
    publisher: "Saravali",
    url: "https://saravali.github.io/astrology/koota_gana.html",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "A published 27-star table used as one reference for LIFE's selected Gana mapping. Other published traditions may use different assignments.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: "Existing LIFE documentation reports CC BY-SA 4.0, but an authoritative license notice could not be verified on the cited page or linked repository. Confirm reuse terms before redistributing adapted table data.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Cited table page inspected and local 27-star mapping tests rerun. No authoritative reuse license notice was established; status remains partial.",
      evidence: ["https://saravali.github.io/astrology/koota_gana.html", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "saravali-nadi-koota",
    title: "Nadi Koota",
    authors_or_organization: "Saravali",
    category: "Astrology traditions and calculation methods",
    publisher: "Saravali",
    url: "https://saravali.github.io/astrology/koota_nadi.html",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "A published 27-star table used as one reference for LIFE's selected Nadi mapping. LIFE provides the classification only and does not make health claims.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: "Existing LIFE documentation reports CC BY-SA 4.0, but an authoritative license notice could not be verified on the cited page or linked repository. Confirm reuse terms before redistributing adapted table data.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Cited table page inspected and local 27-star mapping tests rerun. No authoritative reuse license notice was established; status remains partial.",
      evidence: ["https://saravali.github.io/astrology/koota_nadi.html", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "saravali-varna-koota",
    title: "Varna Koota",
    authors_or_organization: "Saravali",
    category: "Astrology traditions and calculation methods",
    publisher: "Saravali",
    url: "https://saravali.github.io/astrology/koota_varna.html",
    publication_date: null,
    version: null,
    accessed_at: "2026-10-26",
    description: "Describes multiple Varna methods and the Moon-Rashi option selected by LIFE. LIFE presents this only as a historical/traditional category, not as a claim about a person's caste or qualities.",
    used_by: ["kundli-classifications"],
    verification_status: "partially_verified",
    license: "Existing LIFE documentation reports CC BY-SA 4.0, but an authoritative license notice could not be verified on the cited page or linked repository. Confirm reuse terms before redistributing adapted table data.",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Cited table page inspected and local Moon-sign mapping tests rerun. No authoritative reuse license notice was established; status remains partial.",
      evidence: ["https://saravali.github.io/astrology/koota_varna.html", "src/calculation/kundli-classifications.ts", "tests/kundli-details.test.mjs"],
    },
  },
  {
    id: "life-d11-attribution-pending",
    title: "LIFE D11 Rudramsha mapping (external attribution pending)",
    authors_or_organization: "LIFE project; external author attribution not verified",
    category: "Astrology traditions and calculation methods",
    publisher: "LIFE project documentation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "LIFE selects a reverse-sign seed with forward parts. No exact external work, edition, or passage has been verified for this mapping. The PyJHora comparison checks software mapping only and does not verify authorship or tradition.",
    used_by: ["divisional-chart-mapping"],
    verification_status: "not_yet_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Local D11 implementation and fixture tests reviewed; exact external author, edition, passage, and tradition attribution remain unverified.",
      evidence: ["src/calculation/rules.ts", "tests/divisional-charts.test.mjs"],
    },
  },
  {
    id: "brihat-parashara-hora-shastra-dasha-passage",
    title: "Brihat Parashara Hora Shastra, Chapter 61, verses 1–2 (claimed Dasha passage)",
    authors_or_organization: "Traditionally attributed to Parashara; translation and edition details not verified",
    category: "Panchanga, Dasha and divisional charts",
    publisher: null,
    url: "https://www.lakshminarayanlenasia.com/articles/BrihatParasaraHoraSastra.pdf",
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "CALCULATION_METHODS.md previously cited this passage for proportional Pratyantardasha duration. The linked PDF was not available as readable text during this audit, so the chapter, verses, translation, and claimed formula-to-text connection remain unverified. LIFE's arithmetic tests are internal, not an independent Dasha reference test.",
    used_by: ["vimshottari-dasha"],
    verification_status: "not_yet_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Linked PDF retrieval returned raw binary rather than readable text; internal Dasha tests verify arithmetic only and do not authenticate the cited chapter, verses, translation, or formula.",
      evidence: ["https://www.lakshminarayanlenasia.com/articles/BrihatParasaraHoraSastra.pdf", "src/calculation/rules.ts", "tests/rules.test.mjs"],
    },
  },
  {
    id: "iers-bulletin-d-product-metadata",
    title: "IERS Bulletin D product metadata",
    authors_or_organization: "International Earth Rotation and Reference Systems Service",
    category: "Astronomy and ephemeris",
    publisher: "IERS",
    url: "https://datacenter.iers.org/productMetadata.php?id=17",
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "Cited in LIFE's verification report for the meaning and precision context of DUT1 (UT1−UTC). The IERS product metadata endpoint returned an error during this audit; its precise metadata and stated precision have not been re-verified here. LIFE does not apply DUT1.",
    used_by: ["time-scale-limitations"],
    verification_status: "not_yet_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "IERS metadata endpoint returned HTTP 400. Existing time-scale tests do not validate DUT1 metadata or precision; status remains unverified.",
      evidence: ["https://datacenter.iers.org/productMetadata.php?id=17", "src/calculation/engine.ts", "tests/engine.test.mjs"],
    },
  },
  {
    id: "life-interpretation-attributions-pending",
    title: "Traditional interpretation source mapping (pending)",
    authors_or_organization: "LIFE project; exact external works not established",
    category: "Astrology traditions and calculation methods",
    publisher: "LIFE project documentation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "LIFE's interpretation catalog and rules use traditional associations, but no complete feature-to-primary-text bibliography has been verified. Existing internal tests confirm software behavior only, not the astrological meanings.",
    used_by: ["interpretation-rules"],
    verification_status: "not_yet_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Local rule registry and validation tests inspected; these confirm software gating only, not primary-text attribution or interpretation accuracy.",
      evidence: ["src/calculation/rules.ts", "tests/interpretation-validation.test.mjs"],
    },
  },
  {
    id: "life-remedy-attributions-pending",
    title: "Remedy tradition attributions (exact sources pending)",
    authors_or_organization: "LIFE project; exact source editions not supplied",
    category: "Astrology traditions and calculation methods",
    publisher: "LIFE project documentation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "Remedy records are labeled educational and non-prescriptive. Some mention Lal Kitab generally, and project documentation says no exact source or verified eligibility rule is established. No remedy efficacy or chart-based eligibility is claimed.",
    used_by: ["remedy-education"],
    verification_status: "not_yet_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Local remedy catalog and safety tests inspected; exact source editions, eligibility rules, and efficacy remain unverified.",
      evidence: ["src/calculation/rules.ts", "tests/remedies.test.mjs", "tests/personalized-remedies.test.mjs"],
    },
  },
  {
    id: "life-chart-conventions",
    title: "LIFE chart calculation conventions",
    authors_or_organization: "LIFE project",
    category: "Astrology traditions and calculation methods",
    publisher: "LIFE project documentation and implementation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "LIFE's own selected ayanamsa, house, D1–D60, Panchanga, Dasha and interpretation conventions. These are implementation choices, not external sources, universal doctrine, or scientifically validated predictions. Independent validation varies by feature.",
    used_by: ["chart-conventions", "divisional-chart-mapping", "panchanga"],
    verification_status: "partially_verified",
    verification_review: {
      checked_at: "2026-10-27",
      method: "Local convention code and calculation regression tests inspected/rerun. This verifies selected implementation behavior only; independent validation varies by calculation.",
      evidence: ["src/calculation/rules.ts", "tests/engine.test.mjs", "tests/divisional-charts.test.mjs", "tests/rules.test.mjs"],
    },
  },
  {
    id: "source-life-kp-convention",
    title: "LIFE KP calculation convention",
    authors_or_organization: "LIFE project",
    category: "KP astrology",
    publisher: "LIFE project documentation and implementation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "LIFE's implemented KP significator and candidate-window rules. These are project-defined conventions; the associated calculation is not independently validated against an authoritative KP reference.",
    used_by: ["kp-and-marriage-timing"],
    verification_status: "not_yet_verified",
    rule_ids: ["KP-2-7-11-SIGNIFICATORS", "KP-7TH-CUSP-SUB-LORD", "KP-DASHA-INTERSECTION"],
    verification_review: {
      checked_at: "2026-10-27",
      method: "Local KP rule implementation and boundary/significator regression tests inspected/rerun; authoritative independent KP convention validation remains unavailable.",
      evidence: ["src/calculation/kp.ts", "tests/kp.test.mjs", "tests/marriage-timing.test.mjs"],
    },
  },
  {
    id: "source-life-kp-window-limitation",
    title: "LIFE marriage-window limitations",
    authors_or_organization: "LIFE project",
    category: "KP astrology",
    publisher: "LIFE project documentation and implementation",
    url: null,
    publication_date: null,
    version: null,
    accessed_at: null,
    description: "A project-defined disclosure: displayed periods are rule-based candidates only, not marriage dates, probabilities, guarantees, or scientifically established predictions.",
    used_by: ["kp-and-marriage-timing"],
    verification_status: "verified",
    rule_ids: ["KP-TRANSIT-SECONDARY-ONLY", "KP-NO-GUARANTEE"],
  },
];

export function getReferencesByIds(ids: readonly string[]): ReferenceEntry[] {
  const requestedIds = new Set(ids);
  return referenceRegistry.filter((reference) => requestedIds.has(reference.id));
}

export function referencesForFeature(feature: ReferenceFeature): ReferenceEntry[] {
  return referenceRegistry.filter((reference) => reference.used_by.includes(feature));
}

export function referencesForRuleIds(ruleIds: readonly string[]): ReferenceEntry[] {
  const requestedRuleIds = new Set(ruleIds);
  return referenceRegistry.filter((reference) => reference.rule_ids?.some((id) => requestedRuleIds.has(id)));
}
