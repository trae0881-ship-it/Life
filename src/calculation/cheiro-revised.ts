export const CHEIRO_REVISED_METHOD_ID =
  "cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1" as const;

export const CHEIRO_REVISED_MAPPING = Object.freeze({
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
} as const);

export type CheiroInputErrorCode =
  | "EMPTY_NAME"
  | "NAME_TOO_LONG"
  | "INVALID_WORD_SPACING"
  | "AMBIGUOUS_WORD_SEGMENTATION"
  | "UNSUPPORTED_PUNCTUATION"
  | "UNSUPPORTED_SCRIPT"
  | "INVALID_BIRTH_DAY";

export class CheiroInputError extends Error {
  readonly code: CheiroInputErrorCode;

  constructor(code: CheiroInputErrorCode, message: string) {
    super(message);
    this.name = "CheiroInputError";
    this.code = code;
  }
}

export type CheiroWordResult = {
  inputWord: string;
  normalizedWord: string;
  rawTotal: number;
  root: number;
  letterBreakdown: Array<{ letter: string; value: number }>;
};

export type CheiroNameResult = {
  methodId: typeof CHEIRO_REVISED_METHOD_ID;
  methodVersion: 1;
  sourceEdition: "Complete Edition, Revised";
  copyrightYear: 1959;
  printingYear: null;
  words: CheiroWordResult[];
  compoundNameNumber: number;
  nameRoot: number;
};

export type CheiroBirthNumberResult = {
  concept: "cheiro-birth-number";
  dayOfMonth: number;
  birthNumber: number;
};

function reduceToSingleNumber(value: number): number {
  let total = value;
  while (total > 9) {
    total = [...String(total)].reduce((sum, digit) => sum + Number(digit), 0);
  }
  return total;
}

function normalizeCheiroName(name: string): string[] {
  if (typeof name !== "string" || name.length === 0) {
    throw new CheiroInputError("EMPTY_NAME", "Enter a name.");
  }
  if (name.length > 100) {
    throw new CheiroInputError("NAME_TOO_LONG", "Name must be 100 characters or fewer.");
  }
  if (/[\p{L}\p{M}]/u.test(name.replace(/[A-Za-z]/g, ""))) {
    throw new CheiroInputError("UNSUPPORTED_SCRIPT", "Use ASCII letters only; transliteration is not applied.");
  }
  if (/[^\S ]/u.test(name) || name.startsWith(" ") || name.endsWith(" ") || name.includes("  ")) {
    throw new CheiroInputError("INVALID_WORD_SPACING", "Use one ordinary space between name words, without leading or trailing spaces.");
  }
  if (/[-']/u.test(name)) {
    throw new CheiroInputError(
      "AMBIGUOUS_WORD_SEGMENTATION",
      "Hyphens and apostrophes are not accepted because their word-boundary meaning is unspecified.",
    );
  }
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name)) {
    throw new CheiroInputError("UNSUPPORTED_PUNCTUATION", "Use ASCII letters and spaces only.");
  }
  return name.toUpperCase().split(" ");
}

export function calculateCheiroNameNumber(name: string): CheiroNameResult {
  const words = normalizeCheiroName(name).map((normalizedWord, index) => {
    const inputWord = name.split(" ")[index];
    const letterBreakdown = [...normalizedWord].map((letter) => ({
      letter,
      value: CHEIRO_REVISED_MAPPING[letter as keyof typeof CHEIRO_REVISED_MAPPING],
    }));
    const rawTotal = letterBreakdown.reduce((sum, item) => sum + item.value, 0);
    return {
      inputWord,
      normalizedWord,
      rawTotal,
      root: reduceToSingleNumber(rawTotal),
      letterBreakdown,
    };
  });
  const compoundNameNumber = words.reduce((sum, word) => sum + word.root, 0);

  return {
    methodId: CHEIRO_REVISED_METHOD_ID,
    methodVersion: 1,
    sourceEdition: "Complete Edition, Revised",
    copyrightYear: 1959,
    printingYear: null,
    words,
    compoundNameNumber,
    nameRoot: reduceToSingleNumber(compoundNameNumber),
  };
}

export function calculateCheiroBirthNumber(dayOfMonth: number): CheiroBirthNumberResult {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new CheiroInputError("INVALID_BIRTH_DAY", "Birth day must be an integer from 1 through 31.");
  }
  return {
    concept: "cheiro-birth-number",
    dayOfMonth,
    birthNumber: reduceToSingleNumber(dayOfMonth),
  };
}
