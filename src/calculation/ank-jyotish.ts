export type AnkJyotishReportSection = { title: string; value: string; interpretation: string };

const nameNumberThemes = [
  "", "initiative and independence", "cooperation and sensitivity", "expression and creativity",
  "structure and steadiness", "adaptability and curiosity", "responsibility and care",
  "analysis and reflection", "ambition and organization", "compassion and broad perspective",
];

function sumDigits(value: number) {
  let total = Math.abs(Math.trunc(value));
  while (total > 9) total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return total;
}

export function calculateBirthNumber(dateOfBirth: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw new Error("Enter a valid date of birth.");
  const date = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateOfBirth) throw new Error("Enter a valid date of birth.");
  return sumDigits(date.getUTCDate());
}

export function calculateDestinyNumber(dateOfBirth: string): number {
  calculateBirthNumber(dateOfBirth);
  return sumDigits(Number(dateOfBirth.replaceAll("-", "")));
}

export function calculateNameNumber(name: string): number {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (!normalized.trim() || normalized.length > 100 || !/^[A-Z .'-]+$/.test(normalized)) {
    throw new Error("Enter a name using Latin letters, spaces, apostrophes, periods or hyphens.");
  }
  const total = [...normalized].reduce((sum, char) => {
    if (char < "A" || char > "Z") return sum;
    return sum + ((char.charCodeAt(0) - 65) % 9) + 1;
  }, 0);
  return sumDigits(total);
}

export function interpretNumber(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > 9) throw new Error("A numerology number must be from 1 to 9.");
  return nameNumberThemes[number];
}

export function calculateNameCompatibility(firstName: string, secondName: string) {
  const first = calculateNameNumber(firstName);
  const second = calculateNameNumber(secondName);
  return {
    firstNameNumber: first,
    secondNameNumber: second,
    sharedThemes: first === second,
    description: first === second
      ? `Both names reduce to ${first}, so this tradition labels them as sharing the theme of ${interpretNumber(first)}.`
      : `The names reduce to ${first} (${interpretNumber(first)}) and ${second} (${interpretNumber(second)}). This tool reports the difference without assigning a compatibility score.`,
  };
}

export function createAnkJyotishReport(input: { name: string; dateOfBirth: string; comparisonName?: string }) {
  const birthNumber = calculateBirthNumber(input.dateOfBirth);
  const destinyNumber = calculateDestinyNumber(input.dateOfBirth);
  const nameNumber = calculateNameNumber(input.name);
  const comparison = input.comparisonName?.trim()
    ? calculateNameCompatibility(input.name, input.comparisonName)
    : null;
  const sections: AnkJyotishReportSection[] = [
    { title: "Birth number", value: String(birthNumber), interpretation: `Traditional numerology associates this number with ${interpretNumber(birthNumber)}.` },
    { title: "Destiny number", value: String(destinyNumber), interpretation: `Traditional numerology associates this number with ${interpretNumber(destinyNumber)}.` },
    { title: "Name number", value: String(nameNumber), interpretation: `The Pythagorean letter mapping reduces this name to a theme of ${interpretNumber(nameNumber)}.` },
    { title: "Birth and destiny blend", value: `${birthNumber} / ${destinyNumber}`, interpretation: `This report places ${interpretNumber(birthNumber)} beside ${interpretNumber(destinyNumber)}; it does not rank or predict outcomes.` },
    { title: "Name and birth blend", value: `${nameNumber} / ${birthNumber}`, interpretation: `The selected name and birth number are both shown as symbolic prompts: ${interpretNumber(nameNumber)} and ${interpretNumber(birthNumber)}.` },
    { title: "Learning style prompt", value: String(destinyNumber), interpretation: `A reflective prompt connected with ${interpretNumber(destinyNumber)}; use your own experience rather than treating it as a measured trait.` },
    { title: "Communication prompt", value: String(nameNumber), interpretation: `A reflective prompt connected with ${interpretNumber(nameNumber)}; communication style cannot be established from a name.` },
    { title: "Relationship prompt", value: String(birthNumber), interpretation: `A reflective prompt connected with ${interpretNumber(birthNumber)}; this is not relationship advice or a compatibility prediction.` },
    { title: "Work preferences", value: String(destinyNumber), interpretation: `Traditional symbolism highlights ${interpretNumber(destinyNumber)} as a reflection prompt, not a career recommendation.` },
    { title: "Career tendencies", value: String(nameNumber), interpretation: `This symbolic theme may prompt reflection on work preferences; it does not predict career success or suitability.` },
    { title: "Financial habits prompt", value: String(birthNumber), interpretation: `Use this as a prompt to reflect on habits only. It is not financial advice or a prediction of wealth.` },
    { title: "Strengths to reflect on", value: String(nameNumber), interpretation: `Consider where ${interpretNumber(nameNumber)} appears in your own experience; the number does not assess personal strengths.` },
    { title: "Growth prompt", value: String(destinyNumber), interpretation: `Consider how to balance ${interpretNumber(destinyNumber)} with your real-world needs and choices.` },
    { title: "Lucky number set", value: [...new Set([birthNumber, destinyNumber, nameNumber])].join(", "), interpretation: "Numbers are presented as traditional symbolic favorites, not as odds, guarantees or a basis for financial decisions." },
    { title: "Name compatibility", value: comparison ? `${comparison.firstNameNumber} / ${comparison.secondNameNumber}` : "Not provided", interpretation: comparison?.description ?? "Add another name to compare letter-number themes. No compatibility score or relationship prediction is produced." },
  ];
  return {
    title: `Ank Jyotish · ${input.name.trim()}`,
    birthNumber,
    destinyNumber,
    nameNumber,
    comparison,
    sections,
    disclaimer: "Traditional numerology is a cultural belief system, not a scientifically validated assessment. This report does not predict outcomes or provide professional, career, relationship or financial advice.",
  };
}
