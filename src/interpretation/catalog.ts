export type InterpretationCategory =
  | "Personality"
  | "Education"
  | "Career"
  | "Business"
  | "Finances"
  | "Relationships"
  | "Spiritual interests"
  | "Dasha"
  | "Transits"
  | "Yogas and Doshas"
  | "Planetary strengths";

export type NatalRuleDefinition = {
  id: string;
  category: InterpretationCategory;
  houses: number[];
  planets: string[];
  theme: string;
  convention: string;
};

export const natalRuleCatalog: NatalRuleDefinition[] = [
  {
    id: "personality-lagna-lord",
    category: "Personality",
    houses: [1],
    planets: ["Moon"],
    theme: "Temperament is described from the ascendant, its lord's placement, and the Moon's sign and house.",
    convention: "Parashari-style Rashi ascendant and its sign lord; Moon sign/house are contextual factors.",
  },
  {
    id: "education-4-5-9",
    category: "Education",
    houses: [4, 5, 9],
    planets: ["Mercury", "Jupiter"],
    theme: "Study, learning, and formal knowledge are considered through the 4th, 5th, and 9th houses and their lords.",
    convention: "Parashari house topics; use selected chart house cusps and their sign lords.",
  },
  {
    id: "career-6-10-11",
    category: "Career",
    houses: [6, 10, 11],
    planets: ["Saturn", "Sun", "Mercury"],
    theme: "Work conditions, vocation, and gains are considered together through the 6th, 10th, and 11th houses.",
    convention: "Parashari house topics; use selected chart house cusps and their sign lords.",
  },
  {
    id: "business-3-7-11",
    category: "Business",
    houses: [3, 7, 11],
    planets: ["Mercury", "Venus"],
    theme: "Enterprise and exchange are considered through initiative (3rd), agreements (7th), and gains/networks (11th).",
    convention: "Traditional house-topic heuristic; this is distinct from the relationship rule and does not imply business success.",
  },
  {
    id: "finances-2-5-11",
    category: "Finances",
    houses: [2, 5, 11],
    planets: ["Jupiter", "Venus"],
    theme: "Resources, discretionary judgment, and gains are considered through the 2nd, 5th, and 11th houses.",
    convention: "Parashari house topics; do not treat this combination as a wealth guarantee.",
  },
  {
    id: "relationships-2-7-8",
    category: "Relationships",
    houses: [2, 7, 8],
    planets: ["Venus", "Jupiter"],
    theme: "Partnership and continuity are considered through the 7th house, with family/resources (2nd) and shared commitments (8th) as context.",
    convention: "Traditional house-topic heuristic; it cannot determine relationship outcomes or timing.",
  },
  {
    id: "spiritual-interests-9-12",
    category: "Spiritual interests",
    houses: [9, 12],
    planets: ["Jupiter", "Ketu"],
    theme: "Meaning, contemplative practice, and retreat are considered through the 9th and 12th houses and their lords.",
    convention: "Traditional Parashari house-topic heuristic; it describes symbolic emphasis, not belief or behavior as fact.",
  },
];

export const categoryOrder: InterpretationCategory[] = [
  "Personality",
  "Education",
  "Career",
  "Business",
  "Finances",
  "Relationships",
  "Spiritual interests",
  "Dasha",
  "Transits",
  "Yogas and Doshas",
  "Planetary strengths",
];
