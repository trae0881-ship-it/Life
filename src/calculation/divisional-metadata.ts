export type DivisionalInterpretationStatus = "UNSUPPORTED" | "REVIEW_REQUIRED";

export type DivisionalChartMetadata = {
  id: `D${number}`;
  division: number;
  name: string;
  purpose: string;
  cannotEstablish: string;
  conventionKind: "named" | "custom" | "selected";
  interpretationStatus: DivisionalInterpretationStatus;
};

type MetadataSeed = Omit<DivisionalChartMetadata, "id" | "division">;

const named: Record<number, MetadataSeed> = {
  1: {
    name: "Rashi",
    purpose: "Overall birth-chart framework: ascendant, houses, and planetary placements.",
    cannotEstablish: "This calculated chart does not establish guaranteed life outcomes or predictive accuracy.",
    conventionKind: "selected",
    interpretationStatus: "UNSUPPORTED",
  },
  2: { name: "Hora", purpose: "Traditional wealth and resource themes.", cannotEstablish: "It does not establish guaranteed wealth, income, or financial events.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  3: { name: "Drekkana", purpose: "Traditional sibling, courage, initiative, and effort themes.", cannotEstablish: "It does not establish sibling outcomes or guaranteed success.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  4: { name: "Chaturthamsha", purpose: "Traditional home, property, and stability themes.", cannotEstablish: "It does not establish property ownership or guaranteed stability.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  5: { name: "Panchamsha", purpose: "A tradition-specific division whose interpretive scope requires review.", cannotEstablish: "No personalized conclusion is available without a reviewed rule.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  6: { name: "Shashthamsha", purpose: "Traditional health and adversity themes, without medical diagnosis.", cannotEstablish: "It cannot diagnose illness or establish a medical outcome.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  7: { name: "Saptamsha", purpose: "Traditional children and progeny-related themes.", cannotEstablish: "It cannot establish fertility, pregnancy, or a child's future.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  8: { name: "Ashtamsha", purpose: "A tradition-specific division whose intended interpretation requires review.", cannotEstablish: "No personalized conclusion is available without a reviewed rule.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  9: { name: "Navamsha", purpose: "Traditional marriage, dharma, and planetary-strength themes.", cannotEstablish: "It does not establish marriage dates, spouse identity, or relationship outcomes.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  10: { name: "Dashamsha", purpose: "Traditional profession, work, responsibility, and career themes.", cannotEstablish: "It does not establish employment, selection, or career success.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  11: { name: "Rudramsha / Ekadashamsha", purpose: "LIFE's selected mapping; its external textual attribution requires verification.", cannotEstablish: "This selected variant is not a universal convention and does not establish personal outcomes.", conventionKind: "selected", interpretationStatus: "REVIEW_REQUIRED" },
  12: { name: "Dwadashamsha", purpose: "Traditional parents, ancestry, and family-lineage themes.", cannotEstablish: "It does not establish facts about relatives or guaranteed family outcomes.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  16: { name: "Shodashamsha", purpose: "Traditional vehicles, comforts, and amenities themes.", cannotEstablish: "It does not establish ownership, safety, or guaranteed material comfort.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  20: { name: "Vimshamsha", purpose: "Traditional spirituality, worship, and spiritual-practice themes.", cannotEstablish: "It does not establish spiritual attainment or religious outcomes.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  24: { name: "Chaturvimshamsha / Siddhamsha", purpose: "Traditional education, learning, and knowledge themes.", cannotEstablish: "It does not establish academic admission, grades, or achievement.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  27: { name: "Saptavimshamsha / Bhamsha", purpose: "Traditional strengths, resilience, and vulnerability themes.", cannotEstablish: "It does not establish physical or psychological health outcomes.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  30: { name: "Trimshamsha", purpose: "Traditional analysis of difficulty and vulnerability themes.", cannotEstablish: "It does not establish misfortune, illness, or unavoidable events.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  40: { name: "Khavedamsha", purpose: "Tradition-specific subtle themes requiring source review.", cannotEstablish: "No personalized conclusion is available without a reviewed rule.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  45: { name: "Akshavedamsha", purpose: "Tradition-specific subtle themes requiring source review.", cannotEstablish: "No personalized conclusion is available without a reviewed rule.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
  60: { name: "Shashtiamsha", purpose: "Fine-grained traditional themes that are highly sensitive to birth-time accuracy.", cannotEstablish: "It does not establish guaranteed outcomes and is not reliable when birth-time precision is uncertain.", conventionKind: "named", interpretationStatus: "REVIEW_REQUIRED" },
};

const customPurpose = "Custom higher-division chart data is displayed for inspection; its interpretive scope requires review.";
const customCannotEstablish = "This custom calculation convention is not presented as universally classical and cannot support a personalized conclusion without review.";

export const divisionalChartMetadata: readonly DivisionalChartMetadata[] = Object.freeze(
  Array.from({ length: 60 }, (_, index) => {
    const division = index + 1;
    const seed = named[division] ?? {
      name: `D${division} custom division`,
      purpose: customPurpose,
      cannotEstablish: customCannotEstablish,
      conventionKind: "custom" as const,
      interpretationStatus: "UNSUPPORTED" as const,
    };
    return Object.freeze({ ...seed, id: `D${division}` as `D${number}`, division });
  }),
);

export const divisionalChartMetadataById = Object.fromEntries(
  divisionalChartMetadata.map((metadata) => [metadata.id, metadata]),
) as Readonly<Record<string, DivisionalChartMetadata>>;
