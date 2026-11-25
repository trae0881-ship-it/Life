export type NumerologySystem = "chaldean" | "pythagorean";
export type LoShuMode = "dob-only" | "indian-extended";
export type NumerologyLanguage = "en" | "hi";

export type LoShuPlane = {
  id: string;
  label: string;
  labelHi: string;
  numbers: number[];
  presentNumbers: number[];
  missingNumbers: number[];
  status: "complete" | "partial" | "empty";
  strength: "strong" | "moderate" | "weak" | "absent";
};

export type Pinnacle = { index: number; compound: number; reduced: number; fromAge: number; toAge: number };
export type Challenge = { index: number; compound: number; reduced: number; fromAge: number; toAge: number };

const CHALDEAN: Record<string, number> = {
  A:1,I:1,J:1,Q:1,Y:1,
  B:2,K:2,R:2,
  C:3,G:3,L:3,S:3,
  D:4,M:4,T:4,
  E:5,H:5,N:5,X:5,
  U:6,V:6,W:6,
  O:7,Z:7,
  F:8,P:8,
};

const PYTHAGOREAN: Record<string, number> = {
  A:1,J:1,S:1,
  B:2,K:2,T:2,
  C:3,L:3,U:3,
  D:4,M:4,V:4,
  E:5,N:5,W:5,
  F:6,O:6,X:6,
  G:7,P:7,Y:7,
  H:8,Q:8,Z:8,
  I:9,R:9,
};

export const GRID_LAYOUT = [[4,9,2],[3,5,7],[8,1,6]] as const;
export const PLANE_IDS = [
  ["mind","Mind Plane","मानसिक तल",[4,9,2]],
  ["emotional","Emotional Plane","भावनात्मक तल",[3,5,7]],
  ["practical","Practical Plane","व्यावहारिक तल",[8,1,6]],
  ["planning","Planning Plane","योजना तल",[4,3,8]],
  ["willpower","Willpower Plane","संकल्प तल",[9,5,1]],
  ["success","Success Plane","सफलता तल",[2,7,6]],
  ["golden","Golden Yog","स्वर्ण योग",[4,5,6]],
  ["silver","Silver Yog","रजत योग",[2,5,8]],
] as const;

export function parseIsoDate(dateOfBirth: string): { iso: string; year: number; month: number; day: number } {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  const ddmmyyyyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateOfBirth);
  if (!isoMatch && !ddmmyyyyMatch) throw new Error("Enter date of birth as DD-MM-YYYY or YYYY-MM-DD.");
  const [, first, second, third] = (isoMatch ?? ddmmyyyyMatch)!;
  const year = isoMatch ? Number(first) : Number(third);
  const month = isoMatch ? Number(second) : Number(second);
  const day = isoMatch ? Number(third) : Number(first);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Enter a valid calendar date.");
  }
  if (year < 1800 || year > 2399) throw new Error("Date of birth must be between 1800 and 2399.");
  return { iso: dateOfBirth, year, month, day };
}

export function reduceDigitSum(value: number, keepMaster = false): number {
  let total = Math.abs(Math.trunc(value));
  while (total > 9) {
    if (keepMaster && [11,22,33].includes(total)) return total;
    total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return total;
}

export function compoundAndReduced(value: number, keepMaster = false) {
  const compound = Math.abs(Math.trunc(value));
  return { compound, reduced: keepMaster && [11,22,33].includes(compound) ? compound : reduceDigitSum(compound, keepMaster) };
}

export function calculateDateNumbers(dateOfBirth: string) {
  const date = parseIsoDate(dateOfBirth);
  const moolank = reduceDigitSum(date.day);
  const digitString = `${String(date.day).padStart(2,"0")}${String(date.month).padStart(2,"0")}${date.year}`;
  const bhagyankCompound = [...digitString].reduce((sum,digit)=>sum+Number(digit),0);
  const bhagyank = reduceDigitSum(bhagyankCompound);
  const birthDay = reduceDigitSum(date.day);
  const lifePath = reduceDigitSum(bhagyankCompound);
  const attitude = reduceDigitSum(date.month + date.day);
  return { ...date, moolank, bhagyankCompound, bhagyank, birthDay, lifePath, attitude };
}

export function getPersonalCycles(dateOfBirth: string, referenceDate = new Date(), timezone = "UTC") {
  const birth = parseIsoDate(dateOfBirth);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const personalYear = reduceDigitSum(birth.month + birth.day + year);
  const personalMonth = reduceDigitSum(personalYear + month);
  const personalDay = reduceDigitSum(personalMonth + day);
  return { year, month, day, personalYear, personalMonth, personalDay };
}

export function calculatePinnaclesAndChallenges(dateOfBirth: string) {
  const birth = parseIsoDate(dateOfBirth);
  const m = reduceDigitSum(birth.month), d = reduceDigitSum(birth.day), y = reduceDigitSum(birth.year);
  const p1 = reduceDigitSum(m + d), p2 = reduceDigitSum(d + y), p3 = reduceDigitSum(p1 + p2), p4 = reduceDigitSum(m + y);
  const c1 = Math.abs(m - d), c2 = Math.abs(d - y), c3 = Math.abs(c1 - c2), c4 = Math.abs(m - y);
  const destiny = reduceDigitSum(birth.day + birth.month + birth.year);
  const firstEnd = Math.max(0, 36 - destiny);
  const ages = [
    [0, firstEnd],
    [firstEnd + 1, firstEnd + 9],
    [firstEnd + 10, firstEnd + 18],
    [firstEnd + 19, 999],
  ] as const;
  const pinnacleCompounds = [m+d,d+y,p1+p2,m+y];
  const challengeCompounds = [c1,c2,c3,c4];
  const pinnacleNumbers = [p1,p2,p3,p4];
  const challengeNumbers = [c1,c2,c3,c4];
  return {
    pinnacles: pinnacleNumbers.map((reduced, index): Pinnacle => ({ index:index+1, compound:pinnacleCompounds[index], reduced, fromAge:ages[index][0], toAge:ages[index][1] })),
    challenges: challengeNumbers.map((reduced, index): Challenge => ({ index:index+1, compound:challengeCompounds[index], reduced, fromAge:ages[index][0], toAge:ages[index][1] })),
  };
}

export function normalizeName(name: string): { normalized: string; supported: string[]; unsupported: string[] } {
  if (!name.trim()) throw new Error("Enter a name.");
  if (name.length > 100) throw new Error("Name must be 100 characters or fewer.");
  const devanagariTransliteration: Record<string,string> = {
    "अ":"A","आ":"AA","इ":"I","ई":"EE","उ":"U","ऊ":"OO","ए":"E","ऐ":"AI","ओ":"O","औ":"AU",
    "क":"K","ख":"KH","ग":"G","घ":"GH","ङ":"NG","च":"CH","छ":"CHH","ज":"J","झ":"JH","ञ":"NY",
    "ट":"T","ठ":"TH","ड":"D","ढ":"DH","ण":"N","त":"T","थ":"TH","द":"D","ध":"DH","न":"N",
    "प":"P","फ":"PH","ब":"B","भ":"BH","म":"M","य":"Y","र":"R","ल":"L","व":"V","श":"SH","ष":"SH","स":"S","ह":"H",
  };
  let transliterated = name;
  if (/[\u0900-\u097F]/.test(name)) {
    transliterated = [...name].map((char)=>devanagariTransliteration[char] ?? (/\u093E|\u093F|\u0940|\u0941|\u0942|\u0947|\u0948|\u094B|\u094C/.test(char) ? "" : char)).join("").replace(/[\u0900-\u097F]/g," ");
  }
  const decomposed = transliterated.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleUpperCase();
  const normalized = decomposed.replace(/[^A-Z\s'.\-]/g, " ");
  const letters = [...decomposed].filter((char) => /\p{L}/u.test(char));
  const latin = letters.filter((char) => /[A-Z]/.test(char));
  const unsupported = [...new Set(letters.filter((char) => !/[A-Z]/.test(char)))];
  return { normalized: normalized.replace(/\s+/g," ").trim(), supported: latin, unsupported };
}

function letterGroups(word: string) {
  const chars = [...word.toLocaleUpperCase().replace(/[^A-Z]/g,"")];
  const vowels: number[] = [];
  const consonants: number[] = [];
  chars.forEach((char, index) => {
    let vowel = ["A","E","I","O","U"].includes(char);
    if (char === "Y") {
      const previous = chars[index-1];
      const next = chars[index+1];
      vowel = Boolean((!previous || !/^[AEIOU]$/.test(previous)) && (!next || !/^[AEIOU]$/.test(next)));
    }
    (vowel ? vowels : consonants).push(char.charCodeAt(0));
  });
  return { vowels, consonants };
}

export function calculateNameName(name: string, system: NumerologySystem, keepMaster = false) {
  const { normalized, unsupported } = normalizeName(name);
  if (!normalized) throw new Error("Enter a name containing supported letters.");
  const mapping = system === "chaldean" ? CHALDEAN : PYTHAGOREAN;
  const letters = [...normalized].filter((char) => /^[A-Z]$/.test(char));
  const breakdown = letters.map((letter) => ({ letter, value:mapping[letter] })).filter((item) => item.value);
  const letterValues = breakdown.map((item) => item.value);
  const expressionCompound = letterValues.reduce((sum,value)=>sum+value,0);
  const words = normalized.split(/[\s'.-]+/).filter(Boolean);
  const vowelValues: number[] = [];
  const consonantValues: number[] = [];
  const vowelBreakdown: string[] = [];
  for (const word of words) {
    const group = letterGroups(word);
    for (const code of group.vowels) {
      const letter = String.fromCharCode(code);
      vowelValues.push(mapping[letter]);
      vowelBreakdown.push(letter);
    }
    for (const code of group.consonants) consonantValues.push(mapping[String.fromCharCode(code)]);
  }
  const soulCompound = vowelValues.reduce((sum,value)=>sum+value,0);
  const personalityCompound = consonantValues.reduce((sum,value)=>sum+value,0);
  return {
    normalized,
    unsupported,
    system,
    breakdown,
    mapping: Object.fromEntries(Object.keys(mapping).sort().map((letter)=>[letter,mapping[letter]])),
    expression: compoundAndReduced(expressionCompound,keepMaster),
    soulUrge: compoundAndReduced(soulCompound,keepMaster),
    personality: compoundAndReduced(personalityCompound,keepMaster),
    vowelLetters: vowelBreakdown,
  };
}

export function calculateLoShu(dateOfBirth: string, mode: LoShuMode) {
  const date = parseIsoDate(dateOfBirth);
  const digits = `${date.day}${String(date.month).padStart(2,"0")}${date.year}`.replaceAll("0","").split("").map(Number).filter(Boolean);
  const frequency: Record<number,number> = Object.fromEntries(Array.from({length:9},(_,index)=>[index+1,0]));
  for (const digit of digits) frequency[digit] += 1;
  let gridDigits = [...digits];
  if (mode === "indian-extended") {
    const dateNumbers = calculateDateNumbers(dateOfBirth);
    gridDigits.push(dateNumbers.moolank, dateNumbers.bhagyank);
    frequency[dateNumbers.moolank] += 1;
    frequency[dateNumbers.bhagyank] += 1;
  }
  const present = Array.from({length:9},(_,index)=>index+1).filter((number)=>frequency[number]>0);
  const missing = Array.from({length:9},(_,index)=>index+1).filter((number)=>frequency[number]===0);
  const repeated = present.filter((number)=>frequency[number]>1).map((number)=>({number,count:frequency[number]}));
  const planes: LoShuPlane[] = PLANE_IDS.map(([id,label,labelHi,numbers]) => {
    const presentNumbers = numbers.filter((number)=>frequency[number]>0);
    const missingNumbers = numbers.filter((number)=>frequency[number]===0);
    const status = presentNumbers.length === 3 ? "complete" : presentNumbers.length === 0 ? "empty" : "partial";
    const strength = presentNumbers.length === 3 ? "strong" : presentNumbers.length === 2 ? "moderate" : presentNumbers.length === 1 ? "weak" : "absent";
    return {id,label,labelHi,numbers:[...numbers],presentNumbers,missingNumbers,status,strength};
  });
  return { mode, layout:GRID_LAYOUT, gridDigits, frequency, present, missing, repeated, planes };
}

export type AdvancedLoShuAnalysis = {
  dobOnly: ReturnType<typeof calculateLoShu>;
  indianExtended: ReturnType<typeof calculateLoShu>;
  nameEnhanced: ReturnType<typeof calculateLoShu> | ReturnType<typeof calculateNameEnhancedLoShu>;
  presentOverlap: number[];
  missingOverlap: number[];
  contradictions: string[];
};

export function calculateNameEnhancedLoShu(dateOfBirth: string, name: string, system: NumerologySystem = "pythagorean") {
  const base = calculateLoShu(dateOfBirth, "dob-only");
  const nameValue = calculateNameName(name, system);
  const digits = String(nameValue.expression.compound).split("").filter((digit) => digit !== "0").map(Number);
  const frequency: Record<number, number> = { ...base.frequency };
  for (const digit of digits) frequency[digit] += 1;
  const present = Array.from({ length: 9 }, (_, index) => index + 1).filter((number) => frequency[number] > 0);
  const missing = Array.from({ length: 9 }, (_, index) => index + 1).filter((number) => frequency[number] === 0);
  const repeated = present.filter((number) => frequency[number] > 1).map((number) => ({ number, count: frequency[number] }));
  const planes = base.planes.map((plane) => {
    const presentNumbers = plane.numbers.filter((number) => frequency[number] > 0);
    const missingNumbers = plane.numbers.filter((number) => frequency[number] === 0);
    const status = presentNumbers.length === 3 ? "complete" : presentNumbers.length === 0 ? "empty" : "partial";
    const strength = presentNumbers.length === 3 ? "strong" : presentNumbers.length === 2 ? "moderate" : presentNumbers.length === 1 ? "weak" : "absent";
    return { ...plane, presentNumbers, missingNumbers, status, strength };
  });
  return { ...base, mode: "name-enhanced" as const, gridDigits: [...base.gridDigits, ...digits], frequency, present, missing, repeated, planes, nameCompound: nameValue.expression.compound, nameRoot: nameValue.expression.reduced, system };
}

export function analyzeAdvancedLoShu(dateOfBirth: string, name?: string, system: NumerologySystem = "pythagorean"): AdvancedLoShuAnalysis {
  const dobOnly = calculateLoShu(dateOfBirth, "dob-only");
  const indianExtended = calculateLoShu(dateOfBirth, "indian-extended");
  const nameEnhanced = name ? calculateNameEnhancedLoShu(dateOfBirth, name, system) : calculateLoShu(dateOfBirth, "dob-only");
  const presentOverlap = dobOnly.present.filter((number) => indianExtended.present.includes(number));
  const missingOverlap = dobOnly.missing.filter((number) => indianExtended.missing.includes(number));
  const contradictions = indianExtended.present.filter((number) => dobOnly.missing.includes(number)).map((number) =>
    `Number ${number} is missing in DOB-only mode but becomes present after separate Indian Moolank/Bhagyank entries.`);
  if (name) {
    const enhanced = nameEnhanced as ReturnType<typeof calculateNameEnhancedLoShu>;
    enhanced.present.filter((number) => dobOnly.missing.includes(number)).forEach((number) =>
      contradictions.push(`Optional name-enhanced method makes number ${number} present; this is not a DOB-only result.`));
  }
  return { dobOnly, indianExtended, nameEnhanced, presentOverlap, missingOverlap, contradictions };
}

export const NUMEROLOGY_NUMBER_PROFILES = [
  null,
  {planet:"Sun",theme:"initiative, identity and leadership",strength:"pioneering and self-directed",challenge:"stubbornness or dominance"},
  {planet:"Moon",theme:"cooperation, sensitivity and intuition",strength:"adaptable and empathetic",challenge:"indecision or mood dependence"},
  {planet:"Jupiter",theme:"expression, creativity and teaching",strength:"optimistic and articulate",challenge:"scattered focus or extravagance"},
  {planet:"Rahu",theme:"structure, reform and unconventional method",strength:"enduring and systematic",challenge:"restlessness or rigidity"},
  {planet:"Mercury",theme:"communication, versatility and curiosity",strength:"quick-learning and adaptable",challenge:"inconsistency or nervous energy"},
  {planet:"Venus",theme:"harmony, care and responsibility",strength:"cooperative and aesthetic",challenge:"over-attachment or people-pleasing"},
  {planet:"Ketu",theme:"analysis, reflection and spirituality",strength:"observant and independent",challenge:"isolation or detachment"},
  {planet:"Saturn",theme:"discipline, organization and resilience",strength:"patient and persevering",challenge:"delay or workaholism"},
  {planet:"Mars",theme:"energy, courage and completion",strength:"determined and direct",challenge:"impulsiveness or conflict"},
] as const;

export type NumerologyReportSection = { title:string; titleHi:string; value:string; evidence:string; interpretation:string; interpretationHi:string };

export function createNumerologyReport(input:{name:string;dateOfBirth:string;system?:NumerologySystem;loShuMode?:LoShuMode;language?:NumerologyLanguage;comparisonName?:string;referenceDate?:Date;keepMasterNumbers?:boolean}) {
  const date = calculateDateNumbers(input.dateOfBirth);
  const system = input.system ?? "pythagorean";
  const loShuMode = input.loShuMode ?? "dob-only";
  const language = input.language ?? "en";
  const keepMasterNumbers = input.keepMasterNumbers ?? false;
  const name = calculateNameName(input.name,system,keepMasterNumbers);
  const comparison = input.comparisonName?.trim() ? calculateNameName(input.comparisonName,system,keepMasterNumbers) : null;
  const grid = calculateLoShu(input.dateOfBirth,loShuMode);
  const cycles = getPersonalCycles(input.dateOfBirth,input.referenceDate);
  const stages = calculatePinnaclesAndChallenges(input.dateOfBirth);
  const sections: NumerologyReportSection[] = [
    ["Numerology Overview","संख्या-ज्योतिष सारांश",`Name · ${name.normalized}`,`DOB ${input.dateOfBirth}; system ${system}; grid ${loShuMode}`,"A 30-section traditional, calculation-led reflection report.","एक पारंपरिक और गणना-आधारित 30 भागों का चिंतन-पठन।"],
    ["Moolank Analysis","मूलांक विश्लेषण",String(date.moolank),`Day ${date.day}; digit sum ${date.day} → ${date.moolank}`,`Traditional Indian Moolank is derived from the birth day only.`,"भारतीय मूलांक केवल जन्म-दिन की अंकों के योग से निकाला जाता है।"],
    ["Bhagyank Analysis","भाग्यांक विश्लेषण",String(date.bhagyank),`Day + month + year = ${date.bhagyankCompound} → ${date.bhagyank}`,`Bhagyank/Life Path uses all digits and reduces their sum.`,"भाग्यांक/लाइफ पाथ पूरी जन्मतिथि के अंकों के योग का घटा हुआ रूप है।"],
    ["Name Number Analysis","नामांक विश्लेषण",String(name.expression.reduced),`${system} expression compound ${name.expression.compound} → ${name.expression.reduced}`,`The selected name system is used consistently for the full name.`,"चयनित नाम-पद्धति पूरे नाम पर एकसमान रूप से लागू है।"],
    ["Chaldean Analysis","चाल्दीयन विश्लेषण",system==="chaldean"?String(name.expression.reduced):"System not selected",`Chaldean mapping used: ${system==="chaldean"?"yes":"no"}`,`Chaldean and Pythagorean mappings are never mixed.`,"चाल्दीयन और पाइथागोरियन मानचित्रण कभी नहीं मिलाए जाते।"],
    ["Pythagorean Analysis","पाइथागोरियन विश्लेषण",system==="pythagorean"?String(name.expression.reduced):"System not selected",`Pythagorean mapping used: ${system==="pythagorean"?"yes":"no"}`,`Pythagorean and Chaldean calculations remain separate.`,"पाइथागोरियन और चाल्दीयन गणनाएँ अलग रहती हैं।"],
    ["Lo Shu Grid","लो शु जाल",loShuMode,`Layout 4-9-2 / 3-5-7 / 8-1-6`,grid.mode==="dob-only"?"Traditional mode uses raw non-zero birth-date digits only.":"Indian extended mode also adds Moolank and Bhagyank separately.","पारंपरिक रूप में कच्चे जन्मतिथि-अंक; भारतीय विस्तृत रूप में मूलांक और भाग्यांक भी अलग जोड़े जाते हैं।"],
    ["Present Numbers","उपस्थित अंक",grid.present.join(", ")||"None",`Frequency ${JSON.stringify(grid.frequency)}`,`These numbers occur in the selected grid mode.`,"चयनित जाल-पद्धति में ये अंक उपस्थित हैं।"],
    ["Missing Numbers","अनुपस्थित अंक",grid.missing.join(", ")||"None",`Absent from frequency map`,`Missing numbers are developmental prompts, not faults.`,"अनुपस्थित अंक दोष नहीं बल्कि विकास-सूचक हैं।"],
    ["Repeated Numbers","दोहराए गए अंक",grid.repeated.map((item)=>`${item.number}×${item.count}`).join(", ")||"None",`Repeated counts from selected grid`,`Repeated numbers indicate a traditionally amplified theme.`,"दोहराए अंक पारंपरिक रूप से उभरे हुए विषय बताते हैं।"],
    ["All Eight Planes","आठों तल",grid.planes.map((plane)=>`${plane.label}: ${plane.status}`).join(" · "),grid.planes.map((plane)=>`${plane.numbers.join("-")}`).join(" | "),`Complete: 3 cells present; partial: 1–2; empty: 0; per the magic-square line model.`,"पूर्ण: 3 कक्ष उपस्थित; आंशिक: 1–2; रिक्त: 0।"],
    ["Personality Interpretation","व्यक्तित्व व्याख्या",String(name.expression.reduced),`Expression ${name.expression.reduced}; Moolank ${date.moolank}`,`Traditional number themes are used as reflection prompts.`,"संख्या-विषयों को चिंतन संकेत माना गया है।"],
    ["Communication Tendencies","संवाद प्रवृत्तियाँ",String(name.personality.reduced),`Personality compound ${name.personality.compound} → ${name.personality.reduced}`,`The consonant sum represents the selected traditional Personality number.`,"व्यंजन-अंक योग चयनित पारंपरिक व्यक्तित्व-अंक देता है।"],
    ["Thinking Tendencies","सोच प्रवृत्तियाँ",String(date.moolank),`Moolank ${date.moolank}; Mind plane ${grid.planes[0].status}`,`Thinking is described symbolically, not measured.`,"सोच का वर्णन प्रतीकात्मक है, मापा हुआ नहीं।"],
    ["Emotional Tendencies","भावनात्मक प्रवृत्तियाँ",String(name.soulUrge.reduced),`Soul Urge ${name.soulUrge.compound} → ${name.soulUrge.reduced}`,`The vowel sum represents an inner-name theme under the chosen system.`,"स्वर-अंक योग चयनित पद्धति में अंतर्नाम-विषय देता है।"],
    ["Relationships","संबंध",comparison ? `${name.expression.reduced} / ${comparison.expression.reduced}`:"Not provided",comparison?`Name totals ${name.expression.compound}/${comparison.expression.compound}`:"No comparison name","No relationship outcome or romantic guarantee is inferred.","कोई संबंध-परिणाम या रोमांटिक गारंटी नहीं दी गई।"],
    ["Career Tendencies","करियर प्रवृत्तियाँ",String(date.bhagyank),`Bhagyank ${date.bhagyank}; Expression ${name.expression.reduced}`,`Career is a traditional reflection category, not suitability or success prediction.`,"करियर चिंतन-वर्ग है, योग्यता या सफलता की भविष्यवाणी नहीं।"],
    ["Business Tendencies","व्यवसाय प्रवृत्तियाँ",String(date.moolank),`Moolank ${date.moolank}; name ${name.expression.reduced}`,`Use human judgment and evidence before business decisions.`,"व्यावसायिक निर्णयों में मानवीय विवेक और प्रमाण आवश्यक हैं।"],
    ["Financial Habits and Tendencies","वित्तीय आदतें",String(grid.planes[5].status),`Success plane ${grid.planes[5].numbers.join("-")} is ${grid.planes[5].status}`,`The plane is a cultural prompt, not financial evidence or advice.`,"यह सांस्कृतिक संकेत है, वित्तीय प्रमाण या सलाह नहीं।"],
    ["Leadership","नेतृत्व",String(date.moolank),`Moolank ${date.moolank}; Willpower plane ${grid.planes[4].status}`,`Leadership themes are symbolic prompts only.`,"नेतृत्व विषय केवल प्रतीकात्मक संकेत हैं।"],
    ["Strengths","बल",grid.present.join(", "),`Present numbers ${grid.present.join(", ")}`,`Present numbers and complete planes provide reflective strengths.`,"उपस्थित अंक और पूर्ण तल चिंतन बल देते हैं।"],
    ["Development Areas","विकास क्षेत्र",grid.missing.join(", ")||"None",`Missing numbers ${grid.missing.join(", ")||"none"}`,`Missing numbers indicate qualities the tradition suggests practising.`,"अनुपस्थित अंक वे गुण बताते हैं जिन्हें परंपरा अभ्यास योग्य कहती है।"],
    ["Personal Year","व्यक्तिगत वर्ष",String(cycles.personalYear),`${cycles.year}: month ${cycles.month} + birth ${date.month}/${date.day}; year cycle ${cycles.personalYear}`,`Calendar year ${cycles.year}; personal year is the reduced birth month + birth day + calendar year.`,"व्यक्तिगत वर्ष जन्म-माह + जन्म-दिन + वर्ष का घटा योग है।"],
    ["Personal Month","व्यक्तिगत माह",String(cycles.personalMonth),`Personal year ${cycles.personalYear} + calendar month ${cycles.month}`,`Monthly cycle uses the documented personal-year plus calendar-month rule.`,"मासिक चक्र व्यक्तिगत-वर्ष और कैलेंडर-माह के योग से बनता है।"],
    ["Personal Day","व्यक्तिगत दिन",String(cycles.personalDay),`Personal month ${cycles.personalMonth} + calendar day ${cycles.day}`,`Day cycle uses the documented personal-month plus calendar-day rule.`,"दैनिक चक्र व्यक्तिगत-माह और कैलेंडर-दिन के योग से बनता है।"],
    ["Number Compatibility","अंक सामंजस्य",name.expression.reduced+" / "+date.moolank+ " / "+date.bhagyank,`Name ${name.expression.reduced}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,`Traditional friendship checks are descriptive; no score or outcome is guaranteed.`,"यह वर्णनात्मक पारंपरिक संगति है; अंक नहीं और परिणाम की गारंटी नहीं।"],
    ["Name and Date Compatibility","नाम-विज्ञान संगति",`${name.expression.reduced} + ${date.moolank}/${date.bhagyank}`,`Expression ${name.expression.reduced}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,`Name and date totals are compared only as separate symbolic themes.`,"नाम और जन्मांक केवल अलग प्रतीकात्मक विषयों के रूप में तुलना किए जाते हैं।"],
    ["Traditional Suggestions","पारंपरिक सुझाव","Practice, reflection, and evidence-based action",`Based on missing numbers ${grid.missing.join(", ")||"none"} and repeated numbers ${grid.repeated.map((item)=>item.number).join(", ")||"none"}`,`Suggestions are practical reflection prompts, not remedies or guarantees.`,"सुझाव चिंतन संकेत हैं, उपाय या गारंटी नहीं।"],
    ["Calculation Evidence","गणना प्रमाण",`M ${date.moolank} · D ${date.bhagyank} · Name ${name.expression.compound}→${name.expression.reduced}`,`DOB ${input.dateOfBirth}; grid ${JSON.stringify(grid.frequency)}; plane lines ${grid.planes.map((plane)=>plane.numbers.join("-")).join(",")}`,`Every displayed result traces back to the inputs and documented reductions.`,"हर परिणाम इनपुट और दस्तावेज़ घटाव से जुड़ा है।"],
    ["Final Summary","अंतिम सारांश",`${name.expression.reduced}/${date.moolank}/${date.bhagyank}`,`Expression/Moolank/Bhagyank are shown together`,`Traditional symbolism may support reflection but cannot predict life, marriage, wealth, health or employment.`,"पारंपरिक प्रतीक चिंतन में सहायक हो सकते हैं, पर जीवन, विवाह, धन, स्वास्थ्य या रोजगार नहीं तय करते।"],
  ].map(([title,titleHi,value,evidence,interpretation,interpretationHi]) => ({title,titleHi,value,evidence,interpretation,interpretationHi}));
  return {
    title:`Ank Jyotish · ${name.normalized}`,
    name:name.normalized,
    dateOfBirth:input.dateOfBirth,
    system,
    loShuMode,
    language,
    date,
    nameAnalysis:name,
    comparison,
    grid,
    cycles,
    ...stages,
    sections,
    disclaimer:language==="hi"
      ? "यह सांस्कृतिक और मनोरंजन उद्देश्य की पारंपरिक व्याख्या है, वैज्ञानिक रूप से प्रमाणित नहीं है। यह विवाह, धन, रोजगार, स्वास्थ्य या भविष्य की गारंटी नहीं देता। पेशेवर सलाह के लिए योग्य विशेषज्ञ से सलाह लें।"
      : "This is a traditional cultural and reflective interpretation, not scientifically validated. It does not guarantee marriage, wealth, employment, health or future events. Seek qualified professionals for consequential advice.",
  };
}

export const NUMEROLOGY_SOURCES = [
  {id:"traditional-indian-lo-shu",title:"Traditional Indian Ank Jyotish / Lo Shu practice",tradition:"Indian numerology",covered:["Moolank","Bhagyank","Lo Shu","Indian name traditions"],basis:"Internally documented traditional framework; no single textbook claim is presented as universal.",url:""},
  {id:"western-chaldean-pythagorean",title:"Chaldean and Pythagorean numerology references",tradition:"Western numerology",covered:["Name trinity","letter mappings","master numbers","personal cycles"],basis:"Letter mappings are documented conventions; schools vary.",url:""},
  {id:"magic-square-reference",title:"Lo Shu magic-square geometry",tradition:"Chinese and Lo Shu",covered:["3x3 layout","rows","columns","diagonals"],basis:"The fixed 4-9-2 / 3-5-7 / 8-1-6 arrangement and 15 sums are mathematical properties.",url:""},
] as const;

export type MobileAnalysis = {
  countryCode: string;
  nationalNumber: string;
  fullNumber: string;
  compound: number;
  root: number;
  digitFrequency: Record<number, number>;
  repeated: Array<{ digit:number; count:number }>;
  missing: number[];
  patterns: string[];
};

export function analyzeMobileNumber(countryCode: string, mobileNumber: string, dateOfBirth?: string) {
  if (!/^\+?\d{1,4}$/.test(countryCode.trim())) throw new Error("Country code must contain 1 to 4 digits.");
  const code = countryCode.trim().replace(/^\+/, "").replace(/\D/g, "");
  const national = mobileNumber.trim().replace(/[^\d]/g, "");
  if (!/^\d{1,4}$/.test(code)) throw new Error("Country code must contain 1 to 4 digits.");
  if (!/^\d{7,15}$/.test(national)) throw new Error("Mobile number must contain 7 to 15 digits.");
  if (national.length > 1 && national.startsWith("00")) throw new Error("Remove international zero padding from the country code or number.");
  const fullNumber = `${code}${national}`;
  const compound = [...fullNumber].reduce((sum, digit) => sum + Number(digit), 0);
  const root = reduceDigitSum(compound);
  const digitFrequency: Record<number,number> = Object.fromEntries(Array.from({length:10},(_,digit)=>[digit,0]));
  for (const digit of [...fullNumber]) digitFrequency[Number(digit)] += 1;
  const repeated = Array.from({length:10},(_,digit)=>({digit,count:digitFrequency[digit]})).filter((item)=>item.count>1);
  const missing = Array.from({length:10},(_,digit)=>digit).filter((digit)=>digitFrequency[digit]===0);
  const patterns: string[] = [];
  if (/(\d)\1{2}/.test(fullNumber)) patterns.push("Triple or longer repeated-digit run");
  if (/^(.+)\1+$/.test(national)) patterns.push("Repeating block pattern");
  if ([...new Set(national)].length === 1) patterns.push("Uniform repeated digit");
  if (/123|234|345|456|567|678|789/.test(national)) patterns.push("Ascending sequence");
  if (/987|876|765|654|543|432|321/.test(national)) patterns.push("Descending sequence");
  const result: MobileAnalysis = { countryCode:code,nationalNumber:national,fullNumber,compound,root,digitFrequency,repeated,missing,patterns };
  if (dateOfBirth) {
    const date = calculateDateNumbers(dateOfBirth);
    const grid = calculateLoShu(dateOfBirth,"dob-only");
    const compatibleRoots = [date.moolank,date.bhagyank,root].filter((value,index,array)=>array.indexOf(value)===index);
    Object.assign(result,{dobCompatibility:{
      moolank:date.moolank,
      bhagyank:date.bhagyank,
      mobileRoot:root,
      moolankAligned:root===date.moolank,
      bhagyankAligned:root===date.bhagyank,
      loShuAligned:grid.present.includes(root),
      compatibleRoots,
    }});
  }
  return result;
}

export type MobilePatternSuggestion = {
  pattern: string;
  example: string;
  targetRoot: number;
  compoundDelta: number;
  rationale: string;
  score: number;
};

export function generateMobileCorrectionPatterns(countryCode: string, mobileNumber: string, dateOfBirth: string, targets: number[] = []) {
  const existing = analyzeMobileNumber(countryCode,mobileNumber,dateOfBirth);
  const date = calculateDateNumbers(dateOfBirth);
  const targetRoots = [...new Set([...targets, date.moolank, date.bhagyank].filter((root)=>Number.isInteger(root)&&root>=1&&root<=9))];
  const prefixes = ["","1","2","3","7","9"];
  const suggestions: MobilePatternSuggestion[] = [];
  for (const root of targetRoots) {
    for (const prefix of prefixes) {
      let digits = prefix ? prefix + existing.nationalNumber.slice(prefix.length) : existing.nationalNumber;
      if (digits.length !== existing.nationalNumber.length) digits = existing.nationalNumber;
      const countryCompound = [...existing.countryCode].reduce((sum,digit)=>sum+Number(digit),0);
      const nationalCompound = [...digits].reduce((sum,digit)=>sum+Number(digit),0);
      const actualFullCompound = countryCompound + nationalCompound;
      const prefixSum = countryCompound + [...digits.slice(0,-1)].reduce((sum,digit)=>sum+Number(digit),0);
      let finalDigit = ((root - (prefixSum % 9)) + 9) % 9;
      if (finalDigit === 0) finalDigit = 9;
      digits = `${digits.slice(0,-1)}${finalDigit}`;
      const compound = countryCompound + [...digits].reduce((sum,digit)=>sum+Number(digit),0);
      const actualRoot = reduceDigitSum(compound);
      if (actualRoot !== root) continue;
      const loShu = calculateLoShu(dateOfBirth,"dob-only");
      let score = 0;
      if (root === date.moolank) score += 40;
      if (root === date.bhagyank) score += 40;
      if (loShu.present.includes(root)) score += 10;
      if (!existing.missing.includes(root)) score += 5;
      const pattern = `${prefix || "*"}···${digits.slice(-4)}`;
      const rationale = `Targets root ${root}: ${root === date.moolank ? "matches Moolank" : "does not match Moolank"}; ${root === date.bhagyank ? "matches Bhagyank" : "does not match Bhagyank"}; digit sum is changed transparently.`;
      suggestions.push({pattern,example:`${existing.countryCode}-${digits}`,targetRoot:root,compoundDelta:compound-existing.compound,rationale,score});
    }
  }
  return suggestions.sort((a,b)=>b.score-a.score||a.compoundDelta-b.compoundDelta).filter((item,index,array)=>array.findIndex((other)=>other.example===item.example)<index?false:true).slice(0,12);
}

export type ChangedNameLetter = { index:number; original:string; suggested:string };

export function calculateNameCorrections(name:string,dateOfBirth:string,system:NumerologySystem,preferredSpelling = "") {
  const current = calculateNameName(name,system);
  const date = calculateDateNumbers(dateOfBirth);
  const base = (preferredSpelling.trim() || name).normalize("NFKD").replace(/\p{M}+/gu,"").toLocaleUpperCase();
  const candidates = new Set<string>([base]);
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  for (let index=0;index<Math.min(base.length,12);index++) {
    if (!/^[A-Z]$/.test(base[index])) continue;
    for (const letter of letters) {
      if (letter !== base[index]) candidates.add(base.slice(0,index)+letter+base.slice(index+1));
    }
  }
  const ranked = [...candidates].filter((candidate)=>candidate!==base).map((candidate)=>{
    const spelling = candidate.replace(/([A-Z])([A-Z])/g,"$1$2");
    const result = calculateNameName(spelling,system);
    const originalLetters=[...base.replace(/[^A-Z]/g,"")];
    const suggestedLetters=[...spelling.replace(/[^A-Z]/g,"")];
    const changedLetters: ChangedNameLetter[] = suggestedLetters.map((letter,index)=>({index,original:originalLetters[index]??"",suggested:letter})).filter((item)=>item.original!==item.suggested);
    let score=0;
    if (result.expression.reduced===date.moolank) score+=40;
    if (result.expression.reduced===date.bhagyank) score+=40;
    if (result.expression.reduced===date.moolank||result.expression.reduced===date.bhagyank) score+=10;
    return {original:base,suggested:spelling,changedLetters,originalCompound:current.expression.compound,newCompound:result.expression.compound,originalRoot:current.expression.reduced,newRoot:result.expression.reduced,chaldean:system==="chaldean"?result.expression.reduced:calculateNameName(spelling,"chaldean").expression.reduced,pythagorean:system==="pythagorean"?result.expression.reduced:calculateNameName(spelling,"pythagorean").expression.reduced,score,rationale:`The letter substitutions retain familiar pronunciation; root changed only through this documented mapping.`};
  }).filter((item)=>item.changedLetters.length>0&&item.changedLetters.length<=2&&item.suggested.length<=100);
  const unique = [...new Map(ranked.map((item)=>[item.suggested,item])).values()];
  return unique.sort((a,b)=>b.score-a.score||a.newCompound-b.newCompound).slice(0,12);
}

export function calculateMarriageCompatibility(firstName:string,firstDob:string,secondName:string,secondDob:string,system:NumerologySystem="pythagorean") {
  if (!firstName.trim()||!secondName.trim()) throw new Error("Enter both names.");
  const firstDate=calculateDateNumbers(firstDob), secondDate=calculateDateNumbers(secondDob);
  const firstNameValue=calculateNameName(firstName,system), secondNameValue=calculateNameName(secondName,system);
  const pairs=[
    ["Moolank",firstDate.moolank,secondDate.moolank],
    ["Bhagyank",firstDate.bhagyank,secondDate.bhagyank],
    ["Name number",firstNameValue.expression.reduced,secondNameValue.expression.reduced],
  ] as const;
  const weights={moolank:3,bhagyank:4,name:3};
  let score=0;
  if (firstDate.moolank===secondDate.moolank) score+=weights.moolank;
  if (firstDate.bhagyank===secondDate.bhagyank) score+=weights.bhagyank;
  if (firstNameValue.expression.reduced===secondNameValue.expression.reduced) score+=weights.name;
  const loShuFirst=calculateLoShu(firstDob,"dob-only"),loShuSecond=calculateLoShu(secondDob,"dob-only");
  const sharedMissing=loShuFirst.missing.filter((number)=>loShuSecond.missing.includes(number));
  const complementary=loShuFirst.missing.filter((number)=>loShuSecond.present.includes(number)).length+loShuSecond.missing.filter((number)=>loShuFirst.present.includes(number)).length;
  score+=complementary;
  score=Math.min(10,score);
  const firstChaldean=calculateNameName(firstName,"chaldean");
  const secondChaldean=calculateNameName(secondName,"chaldean");
  const firstPythagorean=calculateNameName(firstName,"pythagorean");
  const secondPythagorean=calculateNameName(secondName,"pythagorean");
  const repeatedComparison={
    first:loShuFirst.repeated,
    second:loShuSecond.repeated,
    shared:loShuFirst.repeated.filter((item)=>loShuSecond.repeated.some((other)=>other.number===item.number)).map((item)=>item.number),
  };
  const firstCycles=getPersonalCycles(firstDob),secondCycles=getPersonalCycles(secondDob);
  const communication={
    first:{expression:firstNameValue.expression.reduced,personality:firstNameValue.personality.reduced,soulUrge:firstNameValue.soulUrge.reduced},
    second:{expression:secondNameValue.expression.reduced,personality:secondNameValue.personality.reduced,soulUrge:secondNameValue.soulUrge.reduced},
  };
  const strengths=["Shared core numbers","Complementary Lo Shu present/missing relationships","Potentially similar communication themes"];
  const disagreements=["Different Moolank or Bhagyank roots","Conflicting repeated-number intensities","Chaldean and Pythagorean name roots may differ"];
  const practicalSuggestions=["Clarify decisions and responsibilities explicitly.","Use complementary planning and communication styles.","Do not interpret the traditional score as relationship certainty."];
  return {
    system,pairs,sharedMissing,complementary,traditionalMethodScore:score,maximumScore:10,weights,
    chaldean:{first:firstChaldean.expression.reduced,second:secondChaldean.expression.reduced,compound:[firstChaldean.expression.compound,secondChaldean.expression.compound]},
    pythagorean:{first:firstPythagorean.expression.reduced,second:secondPythagorean.expression.reduced,compound:[firstPythagorean.expression.compound,secondPythagorean.expression.compound]},
    repeatedComparison,personalYear:{first:firstCycles.personalYear,second:secondCycles.personalYear},communication,strengths,disagreements,practicalSuggestions,
    disclaimer:"This is a documented traditional reflection score, not a measured probability, relationship prediction or success guarantee.",
  };
}

export function calculateCareerProfile(dateOfBirth:string,name:string,system:NumerologySystem="pythagorean") {
  const date=calculateDateNumbers(dateOfBirth),nameValue=calculateNameName(name,system),grid=calculateLoShu(dateOfBirth,"dob-only");
  const roots=[...new Set([date.moolank,date.bhagyank,nameValue.expression.reduced])];
  const categories: ReadonlyArray<readonly [string, readonly number[]]>=[
    ["Business",[1,3,5,8]],["Management",[1,4,8]],["Technology",[4,5,7]],
    ["Sales",[1,5,3]],["Marketing",[3,5,9]],["Finance",[4,8,6]],
    ["Education",[3,7,9]],["Creative professions",[2,3,6,9]],["Communication",[3,5,6]],
    ["Entrepreneurship",[1,8,9]],["Research",[4,7,9]],["Leadership",[1,8,9]],
  ] as const;
  return {
    roots,
    missing:grid.missing,
    repeated:grid.repeated,
    categories:categories.map(([category,numbers])=>({
      category,
      match:roots.filter((root)=>numbers.includes(root)),
      associated:numbers.filter((number)=>roots.includes(number)),
      supportingEvidence:roots.filter((root)=>numbers.includes(root)).map((root)=>`Root ${root} supports traditional ${category} associations`),
      contradictions:roots.filter((root)=>!numbers.includes(root)).map((root)=>`Root ${root} is not listed in this category's documented traditional set`),
      relevantSkills:category==="Technology" ? ["Problem solving","systems thinking","data literacy"]
        : category==="Finance" ? ["Financial literacy","accuracy","risk analysis"]
          : category==="Communication" ? ["Listening","clear writing","presentation"]
            : ["Planning","teamwork","measured decision-making"],
    })),
    practicalActions:["Build job evidence through projects and measurable skills.","Develop communication and collaboration through practice.","Use a skill plan separate from numerological symbolism.","Seek qualified career guidance for employment decisions."],
    disclaimer:"Career associations are traditional reflections only and do not determine ability or guarantee employment.",
  };
}

export function analyzeDateRange(dateOfBirth:string,timezone:string,option:{historical:boolean;year?:number;month?:number;now?:Date}={historical:false}) {
  const birth=parseIsoDate(dateOfBirth);
  const birthIso=`${birth.year}-${String(birth.month).padStart(2,"0")}-${String(birth.day).padStart(2,"0")}`;
  const now=option.now??new Date();
  let year: number,month:number;
  if (option.historical) {
    if (!option.year||!option.month) throw new Error("Select a valid year and month for historical analysis.");
    year=option.year; month=option.month;
  } else {
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:"numeric",month:"2-digit"}).formatToParts(now);
    year=Number(parts.find((part)=>part.type==="year")?.value);
    month=Number(parts.find((part)=>part.type==="month")?.value);
  }
  if (!Number.isInteger(year)||year<birth.year||month<1||month>12) throw new Error("Requested date cannot predate the user's date of birth.");
  if (year===birth.year&&month<birth.month) throw new Error("Requested month is earlier than the user's birth month.");
  const selectedIso=`${year}-${String(month).padStart(2,"0")}-01`;
  if (selectedIso<birthIso.slice(0,7)+"-01") throw new Error("Requested date is earlier than the user's date of birth.");
  const date=new Date(Date.UTC(year,month-1,1));
  const personalYear=reduceDigitSum(birth.month+birth.day+year);
  const personalMonth=reduceDigitSum(personalYear+month);
  const universalYear=reduceDigitSum(year);
  const personalDay=reduceDigitSum(personalMonth+date.getUTCDate());
  return {timezone:timezone||"system",year,month,personalYear,personalMonth,personalDay,universalYear,historical:option.historical,minimum:{year:birth.year,month:birth.month}};
}

export type UnifiedNumerologyProfile = {
  date: ReturnType<typeof calculateDateNumbers>;
  name: ReturnType<typeof calculateNameName>;
  chaldean: ReturnType<typeof calculateNameName>;
  pythagorean: ReturnType<typeof calculateNameName>;
  loShu: ReturnType<typeof calculateLoShu>;
  advancedLoShu: AdvancedLoShuAnalysis;
  mobile: MobileAnalysis | null;
  cycles: ReturnType<typeof getPersonalCycles>;
  stages: ReturnType<typeof calculatePinnaclesAndChallenges>;
};

export function createUnifiedNumerologyProfile(input: {
  name:string;
  dateOfBirth:string;
  system?:NumerologySystem;
  loShuMode?:LoShuMode;
  countryCode?:string;
  mobileNumber?:string;
  keepMasterNumbers?:boolean;
  now?:Date;
  timezone?:string;
}) {
  const system=input.system??"pythagorean";
  const date=calculateDateNumbers(input.dateOfBirth);
  const name=calculateNameName(input.name,system,input.keepMasterNumbers);
  const chaldean=calculateNameName(input.name,"chaldean",input.keepMasterNumbers);
  const pythagorean=calculateNameName(input.name,"pythagorean",input.keepMasterNumbers);
  const loShu=calculateLoShu(input.dateOfBirth,input.loShuMode??"dob-only");
  const advancedLoShu=analyzeAdvancedLoShu(input.dateOfBirth,input.name,system);
  const mobile=input.countryCode&&input.mobileNumber?analyzeMobileNumber(input.countryCode,input.mobileNumber,input.dateOfBirth):null;
  const timezone=input.timezone?.trim()||"UTC";
  const cycles=getPersonalCycles(input.dateOfBirth,input.now,timezone);
  const stages=calculatePinnaclesAndChallenges(input.dateOfBirth);
  return {date,name,chaldean,pythagorean,loShu,advancedLoShu,mobile,cycles,stages};
}

export function createFutureCycleOverview(dateOfBirth:string,timezone:string,years=12,now=new Date()) {
  const birth=parseIsoDate(dateOfBirth);
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:"numeric"}).formatToParts(now);
  const startYear=Number(parts.find((part)=>part.type==="year")?.value);
  if (!Number.isInteger(years)||years<1||years>50) throw new Error("Future overview must cover 1 to 50 years.");
  return Array.from({length:years},(_,offset)=>{
    const year=startYear+offset;
    if (year<birth.year) return null;
    return analyzeDateRange(dateOfBirth,timezone,{historical:true,year,month:1,now});
  }).filter((item):item is NonNullable<typeof item>=>item!==null);
}

export type NumerologyComparison = {
  kind:"names"|"mobiles"|"dobs"|"name-corrections"|"career-categories"|"people";
  leftLabel:string;
  rightLabel:string;
  left:Record<string,unknown>;
  right:Record<string,unknown>;
  differences:string[];
};

export function createNumerologyComparison(input:{
  kind:NumerologyComparison["kind"];
  leftLabel:string;
  rightLabel:string;
  left:Record<string,unknown>;
  right:Record<string,unknown>;
}):NumerologyComparison {
  const keys=[...new Set([...Object.keys(input.left),...Object.keys(input.right)])];
  const differences=keys.filter((key)=>JSON.stringify(input.left[key])!==JSON.stringify(input.right[key])).map((key)=>`${key}: ${JSON.stringify(input.left[key]??null)} → ${JSON.stringify(input.right[key]??null)}`);
  return {kind:input.kind,leftLabel:input.leftLabel,rightLabel:input.rightLabel,left:input.left,right:input.right,differences};
}

export type ProfessionalNumerologySection = { title:string; titleHi:string; value:string; evidence:string; interpretation:string; interpretationHi:string };

export type EvidenceRelation = {
  module: string;
  relation: "supporting" | "contradictory" | "neutral";
  formula: string;
  evidence: string;
  explanation: string;
};

export type ExplainableScore = {
  formula: string;
  weights: Record<string, number>;
  positive: Array<{ factor:string; points:number; evidence:string }>;
  negative: Array<{ factor:string; points:number; evidence:string }>;
  neutral: Array<{ factor:string; evidence:string }>;
  finalScore: number;
  maximumScore: number;
  explanation: string;
};

export function compareNumerologyModules(input:{
  dateOfBirth:string;
  name:string;
  system?:NumerologySystem;
  countryCode?:string;
  mobileNumber?:string;
  referenceDate?:Date;
  timezone?:string;
}) {
  const system=input.system??"pythagorean";
  const date=calculateDateNumbers(input.dateOfBirth);
  const name=calculateNameName(input.name,system);
  const grid=calculateLoShu(input.dateOfBirth,"dob-only");
  const cycles=getPersonalCycles(input.dateOfBirth,input.referenceDate,input.timezone??"UTC");
  const mobile=input.countryCode&&input.mobileNumber?analyzeMobileNumber(input.countryCode,input.mobileNumber,input.dateOfBirth):null;
  const relations:EvidenceRelation[]=[];
  relations.push({
    module:"DOB vs Name",
    relation:name.expression.reduced===date.moolank||name.expression.reduced===date.bhagyank?"supporting":"neutral",
    formula:"name.expression.root == moolank OR bhagyank",
    evidence:`Name root ${name.expression.reduced}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,
    explanation:name.expression.reduced===date.moolank||name.expression.reduced===date.bhagyank
      ?"A core root is shared by the DOB and name calculations."
      :"No core root is shared; this is a neutral relationship, not a conflict.",
  });
  relations.push({
    module:"DOB vs Lo Shu",
    relation:grid.present.includes(date.moolank)&&grid.present.includes(date.bhagyank)?"supporting":grid.present.includes(date.moolank)||grid.present.includes(date.bhagyank)?"neutral":"contradictory",
    formula:"moolank/bhagyank in DOB-only present set",
    evidence:`Present {${grid.present.join(",")}}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,
    explanation:"This reports whether core roots occur in the raw DOB grid, without inferring a guaranteed outcome.",
  });
  if (mobile) {
    relations.push({
      module:"DOB vs Mobile",
      relation:mobile.root===date.moolank&&mobile.root===date.bhagyank?"supporting":mobile.root===date.moolank||mobile.root===date.bhagyank?"neutral":"contradictory",
      formula:"mobile.full-digit-root == moolank OR bhagyank",
      evidence:`Mobile root ${mobile.root}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,
      explanation:"Phone-digit alignment is a traditional comparison only.",
    });
  }
  relations.push({
    module:"DOB vs Personal Year",
    relation:cycles.personalYear===date.moolank||cycles.personalYear===date.bhagyank?"supporting":"neutral",
    formula:"reduce(birth.month + birth.day + reference.year)",
    evidence:`Personal Year ${cycles.personalYear}; Moolank ${date.moolank}; Bhagyank ${date.bhagyank}`,
    explanation:"A shared cycle root is recorded when present; it does not predict events.",
  });
  return {system,relations};
}

export function explainMarriageScore(firstName:string,firstDob:string,secondName:string,secondDob:string,system:NumerologySystem="pythagorean"):ExplainableScore {
  const result=calculateMarriageCompatibility(firstName,firstDob,secondName,secondDob,system);
  const weights={moolank:3,bhagyank:4,name:3,complementaryLoShu:1};
  const positive:Array<{factor:string;points:number;evidence:string}>=[];
  const negative:Array<{factor:string;points:number;evidence:string}>=[];
  const neutral:Array<{factor:string;evidence:string}>=[];
  const first=calculateDateNumbers(firstDob),second=calculateDateNumbers(secondDob);
  if (first.moolank===second.moolank) positive.push({factor:"Matching Moolank",points:weights.moolank,evidence:`Both reduce to ${first.moolank}`});
  else neutral.push({factor:"Different Moolank",evidence:`First ${first.moolank}; second ${second.moolank}`});
  if (first.bhagyank===second.bhagyank) positive.push({factor:"Matching Bhagyank",points:weights.bhagyank,evidence:`Both reduce to ${first.bhagyank}`});
  else neutral.push({factor:"Different Bhagyank",evidence:`First ${first.bhagyank}; second ${second.bhagyank}`});
  const firstNameValue=calculateNameName(firstName,system),secondNameValue=calculateNameName(secondName,system);
  if (firstNameValue.expression.reduced===secondNameValue.expression.reduced) positive.push({factor:"Matching name root",points:weights.name,evidence:`Both ${firstNameValue.expression.reduced}`});
  else negative.push({factor:"Different name roots",points:-1,evidence:`First ${firstNameValue.expression.reduced}; second ${secondNameValue.expression.reduced}`});
  if (result.complementary>0) positive.push({factor:"Lo Shu complementarity",points:Math.min(result.complementary,weights.complementaryLoShu*2),evidence:`${result.complementary} complementary missing/present relationships`});
  else neutral.push({factor:"No complementary Lo Shu relationship detected",evidence:"No counted opposite present/missing relationship"});
  const raw=result.traditionalMethodScore;
  const maximum=10;
  const finalScore=Math.max(0,Math.min(maximum,raw));
  return {
    formula:"3 for matching Moolank + 4 for matching Bhagyank + 3 for matching name root + complementary Lo Shu points, capped at 10",
    weights,positive,negative,neutral,finalScore,maximumScore:maximum,
    explanation:`Final score ${finalScore}/${maximum}. It is an auditable traditional similarity summary, not probability or relationship success.`,
  };
}

export function createProfessionalNumerologyReport(input:{
  name:string;
  dateOfBirth:string;
  system?:NumerologySystem;
  loShuMode?:LoShuMode;
  countryCode?:string;
  mobileNumber?:string;
  partnerName?:string;
  partnerDob?:string;
  language?:NumerologyLanguage;
  timezone?:string;
  historical?:{year:number;month:number};
  now?:Date;
}) {
  const profile=createUnifiedNumerologyProfile({...input,now:input.now});
  const language=input.language??"en";
  const career=calculateCareerProfile(input.dateOfBirth,input.name,input.system);
  const marriage=input.partnerName&&input.partnerDob?calculateMarriageCompatibility(input.name,input.dateOfBirth,input.partnerName,input.partnerDob,input.system):null;
  const timezone=input.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
  const consistency=compareNumerologyModules({
    dateOfBirth:input.dateOfBirth,
    name:input.name,
    system:input.system,
    countryCode:input.countryCode,
    mobileNumber:input.mobileNumber,
    referenceDate:input.now,
    timezone,
  });
  const marriageScore=marriage?explainMarriageScore(input.name,input.dateOfBirth,input.partnerName!,input.partnerDob!,input.system):null;
  const dateRange=analyzeDateRange(input.dateOfBirth,timezone,input.historical
    ? {historical:true,year:input.historical.year,month:input.historical.month,now:input.now}
    : {historical:false,now:input.now});
  const sectionRows: ReadonlyArray<readonly [string,string,string,string,string,string]>=[
    ["Personal Numerology Summary","व्यक्तिगत अंक-ज्योतिष सारांश",`${profile.date.moolank}/${profile.date.bhagyank}/${profile.name.expression.reduced}`,`Moolank ${profile.date.moolank}; Bhagyank ${profile.date.bhagyank}; name ${profile.name.expression.reduced}`, "A transparent traditional profile, not a prediction.","एक पारदर्शी पारंपरिक प्रोफ़ाइल, भविष्यवाणी नहीं।"],
    ["DOB and Core Numbers","जन्मतिथि और मूल अंक",`M ${profile.date.moolank} · D ${profile.date.bhagyank}`,`Day ${profile.date.day}; compound ${profile.date.bhagyankCompound}; life path ${profile.date.lifePath}`,"Core numbers are calculated independently.","मूल अंक अलग-अलग गणना किए जाते हैं।"],
    ["Lo Shu Grid","लो शु जाल",profile.loShu.present.join(","),`DOB digits ${profile.loShu.gridDigits.join(",")}; layout 4-9-2/3-5-7/8-1-6`,"DOB, Indian extended and optional name-enhanced methods are labelled separately.","तीनों जाल-पद्धतियाँ अलग नामांकित हैं।"],
    ["Missing and Repeated Numbers","अनुपस्थित और दोहराए अंक",`Missing ${profile.loShu.missing.join(",")||"none"} · Repeated ${profile.loShu.repeated.map((item)=>`${item.number}×${item.count}`).join(",")||"none"}`,`Frequency ${JSON.stringify(profile.loShu.frequency)}`,"Missing and repeated digits are development prompts.","अनुपस्थित और दोहराए अंक विकास संकेत हैं।"],
    ["Name Analysis","नाम विश्लेषण",`${profile.chaldean.expression.compound} Chaldean / ${profile.pythagorean.expression.compound} Pythagorean`,profile.name.breakdown.map((item)=>`${item.letter}=${item.value}`).join(" + "), "The selected and alternative name systems remain separate.","चयनित और वैकल्पिक नाम-पद्धतियाँ अलग हैं।"],
    ["Name Correction Comparison","नाम-संशोधन तुलना",`${profile.name.expression.reduced}`,`Original compound ${profile.name.expression.compound}; root ${profile.name.expression.reduced}`,"No spelling is changed automatically.","कोई वर्तनी स्वतः नहीं बदली जाती।"],
    ["Mobile Number Analysis","मोबाइल अंक विश्लेषण",profile.mobile?`${profile.mobile.compound} → ${profile.mobile.root}`:"Not provided",profile.mobile?`Country ${profile.mobile.countryCode}; national masked; compound ${profile.mobile.compound}`:"No mobile supplied","Mobile patterns are symbolic and never prove telephone availability.","मोबाइल पैटर्न प्रतीकात्मक हैं।"],
    ["Mobile Pattern Suggestions","मोबाइल पैटर्न सुझाव",profile.mobile?generateMobileCorrectionPatterns(profile.mobile.countryCode,profile.mobile.nationalNumber,profile.date.iso).slice(0,3).map((item)=>item.pattern).join("; ") :"Not provided",profile.mobile?"Targeted roots use Moolank and Bhagyank":"No mobile supplied","Suggestions are patterns only.","सुझाव केवल पैटर्न हैं।"],
    ["Combined Compatibility","संयुक्त संगति",`${profile.date.moolank}/${profile.date.bhagyank}/${profile.name.expression.reduced}`,`Date and name roots compared with selected Lo Shu and optional mobile vibration`,"Weights are documented and not probabilities.","भार अलग दस्तावेज़ हैं और संभावना नहीं।"],
    ["Marriage Compatibility","विवाह संगति",marriage?String(marriage.traditionalMethodScore):"Not provided",marriage?JSON.stringify(marriage.pairs):"Partner information not supplied","Traditional reflection only.","केवल पारंपरिक चिंतन।"],
    ["Career and Business Analysis","करियर और व्यवसाय विश्लेषण",career.roots.join(","),career.categories.map((item)=>item.category).join("; "), "Practical evidence and learning actions supplement tradition.","व्यावहारिक प्रमाण परंपरा के पूरक हैं।"],
    ["Pinnacle and Challenge Cycles","पर्व-चक्र और चुनौती-चक्र",profile.stages.pinnacles.map((item)=>item.reduced).join(","),JSON.stringify(profile.stages),"These are age-cycle traditions, not guaranteed timing.","ये पारंपरिक आयु-चक्र हैं।"],
    ["Personal Year and Month","व्यक्तिगत वर्ष और माह",`${profile.cycles.personalYear}/${profile.cycles.personalMonth}`,`Current day ${profile.cycles.personalDay}; timezone ${timezone}`,"Calendar-year and birthday-cycle calculations are distinct.","कैलेंडर-वर्ष और जन्मदिवस चक्र अलग हैं।"],
    ["Historical Analysis","ऐतिहासिक विश्लेषण",`${dateRange.year}-${String(dateRange.month).padStart(2,"0")}`,`Personal year ${dateRange.personalYear}; personal month ${dateRange.personalMonth}; personal day ${dateRange.personalDay}`,"Historical dates are bounded by DOB.","ऐतिहासिक तारीख जन्मतिथि से पहले नहीं हो सकती।"],
    ["Practical Action Plan","व्यावहारिक कार्य योजना","Skills, planning and evidence",career.practicalActions.join(" "), "Practical actions do not depend on a numerology guarantee.","व्यावहारिक कार्य गारंटी पर निर्भर नहीं।"],
    ["Calculation Evidence","गणना प्रमाण",`M ${profile.date.moolank} · D ${profile.date.bhagyank} · N ${profile.name.expression.compound}→${profile.name.expression.reduced}`,`Lo Shu ${JSON.stringify(profile.loShu.frequency)}; mobile ${profile.mobile?.fullNumber?`****${profile.mobile.fullNumber.slice(-4)}`:"not provided"}`,"Every intermediate result should remain visible.","हर मध्यवर्ती परिणाम दिखाई देना चाहिए।"],
    ["Methodology and Limitations","पद्धति और सीमाएँ","Traditional belief system","Chaldean, Pythagorean, Indian and Lo Shu traditions are kept separate.","No scientifically validated prediction or guarantee.","कोई वैज्ञानिक भविष्यवाणी या गारंटी नहीं।"],
  ];
  const sections:ProfessionalNumerologySection[]=sectionRows.map(([title,titleHi,value,evidence,interpretation,interpretationHi])=>({title,titleHi,value,evidence,interpretation,interpretationHi}));
  return {
    title:`Professional Numerology · ${profile.name.normalized}`,
    language,
    timezone,
    profile,
    career,
    marriage,
    dateRange,
    consistency,
    marriageScore,
    sections,
    disclaimer:language==="hi"
      ? "यह केवल पारंपरिक और मनोरंजनात्मक अंक-ज्योतिष है। यह विवाह, धन, स्वास्थ्य, रोजगार या भविष्य की गारंटी नहीं देता।"
      : "This is a traditional, reflective numerology report, not a scientifically validated prediction. It does not guarantee marriage, wealth, health, employment or future events.",
  };
}
