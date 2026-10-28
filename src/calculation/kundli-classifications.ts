export type Yoni =
  | "horse"
  | "elephant"
  | "sheep"
  | "serpent"
  | "dog"
  | "cat"
  | "rat"
  | "cow"
  | "buffalo"
  | "tiger"
  | "deer"
  | "monkey"
  | "mongoose"
  | "lion";

export type Gana = "deva" | "manushya" | "rakshasa";
export type Nadi = "adi" | "madhya" | "antya";
export type Varna = "brahmin" | "kshatriya" | "vaishya" | "shudra";

export type NakshatraClassification = {
  yoni: Yoni;
  gana: Gana;
  nadi: Nadi;
};

const NAKSHATRA_CLASSIFICATIONS: Readonly<Record<string, NakshatraClassification>> = {
  Ashwini: { yoni: "horse", gana: "deva", nadi: "adi" },
  Bharani: { yoni: "elephant", gana: "manushya", nadi: "madhya" },
  Krittika: { yoni: "sheep", gana: "rakshasa", nadi: "antya" },
  Rohini: { yoni: "serpent", gana: "manushya", nadi: "antya" },
  Mrigashira: { yoni: "serpent", gana: "deva", nadi: "madhya" },
  Ardra: { yoni: "dog", gana: "manushya", nadi: "adi" },
  Punarvasu: { yoni: "cat", gana: "deva", nadi: "adi" },
  Pushya: { yoni: "sheep", gana: "deva", nadi: "madhya" },
  Ashlesha: { yoni: "cat", gana: "rakshasa", nadi: "antya" },
  Magha: { yoni: "rat", gana: "rakshasa", nadi: "antya" },
  "Purva Phalguni": { yoni: "rat", gana: "manushya", nadi: "madhya" },
  "Uttara Phalguni": { yoni: "cow", gana: "manushya", nadi: "adi" },
  Hasta: { yoni: "buffalo", gana: "deva", nadi: "adi" },
  Chitra: { yoni: "tiger", gana: "rakshasa", nadi: "madhya" },
  Swati: { yoni: "buffalo", gana: "deva", nadi: "antya" },
  Vishakha: { yoni: "tiger", gana: "rakshasa", nadi: "antya" },
  Anuradha: { yoni: "deer", gana: "deva", nadi: "madhya" },
  Jyeshtha: { yoni: "deer", gana: "rakshasa", nadi: "adi" },
  Mula: { yoni: "dog", gana: "rakshasa", nadi: "adi" },
  "Purva Ashadha": { yoni: "monkey", gana: "manushya", nadi: "madhya" },
  "Uttara Ashadha": { yoni: "mongoose", gana: "manushya", nadi: "antya" },
  Shravana: { yoni: "monkey", gana: "deva", nadi: "antya" },
  Dhanishta: { yoni: "lion", gana: "rakshasa", nadi: "madhya" },
  Shatabhisha: { yoni: "horse", gana: "rakshasa", nadi: "adi" },
  "Purva Bhadrapada": { yoni: "lion", gana: "manushya", nadi: "adi" },
  "Uttara Bhadrapada": { yoni: "cow", gana: "manushya", nadi: "madhya" },
  Revati: { yoni: "elephant", gana: "deva", nadi: "antya" },
};

const MOON_SIGN_VARNAS: Readonly<Record<string, Varna>> = {
  Aries: "kshatriya",
  Taurus: "shudra",
  Gemini: "vaishya",
  Cancer: "brahmin",
  Leo: "kshatriya",
  Virgo: "shudra",
  Libra: "vaishya",
  Scorpio: "brahmin",
  Sagittarius: "kshatriya",
  Capricorn: "shudra",
  Aquarius: "vaishya",
  Pisces: "brahmin",
};

export type JanmaPaya = "gold" | "silver" | "copper" | "iron";

const JANMA_PAYA_BY_HOUSE: Readonly<Record<number, JanmaPaya>> = {
  1: "gold",
  2: "silver",
  3: "copper",
  4: "iron",
  5: "silver",
  6: "gold",
  7: "copper",
  8: "iron",
  9: "silver",
  10: "copper",
  11: "gold",
  12: "iron",
};

export function getJanmaPaya(value: unknown): JanmaPaya | null {
  return typeof value === "number" && Number.isInteger(value) && Object.hasOwn(JANMA_PAYA_BY_HOUSE, value)
    ? JANMA_PAYA_BY_HOUSE[value]
    : null;
}

export function getNakshatraClassification(value: unknown): NakshatraClassification | null {
  return typeof value === "string" && Object.hasOwn(NAKSHATRA_CLASSIFICATIONS, value)
    ? NAKSHATRA_CLASSIFICATIONS[value]
    : null;
}

export function getMoonSignVarna(value: unknown): Varna | null {
  return typeof value === "string" && Object.hasOwn(MOON_SIGN_VARNAS, value)
    ? MOON_SIGN_VARNAS[value]
    : null;
}
