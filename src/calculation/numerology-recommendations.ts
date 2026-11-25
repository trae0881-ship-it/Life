import {
  analyzeMobileNumber,
  calculateCareerProfile,
  calculateDateNumbers,
  calculateLoShu,
  calculateMarriageCompatibility,
  calculateNameCorrections,
  calculateNameName,
  generateMobileCorrectionPatterns,
  getPersonalCycles,
  type NumerologySystem,
} from "./numerology.ts";

export type RecommendationEvidence = {
  factor: string;
  relation: "supporting" | "contradictory" | "neutral";
  evidence: string;
};

export type NameRecommendation = {
  original: string;
  alternatives: Array<{
    spelling:string;
    chaldeanCompound:number;
    chaldeanRoot:number;
    pythagoreanCompound:number;
    pythagoreanRoot:number;
    moolankAligned:boolean;
    bhagyankAligned:boolean;
    loShuAligned:boolean;
    score:number;
    changedLetters:Array<{index:number;original:string;suggested:string}>;
    supporting:RecommendationEvidence[];
    contradictory:RecommendationEvidence[];
    neutral:RecommendationEvidence[];
  }>;
};

export type MobilePatternComparison = {
  maskedNumber:string;
  compound:number;
  root:number;
  targetRoot:number;
  compoundDelta:number;
  dobAligned:boolean;
  loShuAligned:boolean;
  supporting:RecommendationEvidence[];
  contradictory:RecommendationEvidence[];
  neutral:RecommendationEvidence[];
  score:number;
};

export type CareerRecommendation = {
  category:string;
  score:number;
  supporting:RecommendationEvidence[];
  contradictory:RecommendationEvidence[];
  neutral:RecommendationEvidence[];
  strengths:string[];
  development:string[];
  employmentOrBusiness:"employment"|"business"|"hybrid";
};

export type MarriageRecommendation = {
  score:number;
  maximumScore:number;
  supporting:RecommendationEvidence[];
  contradictory:RecommendationEvidence[];
  neutral:RecommendationEvidence[];
  communication:string[];
  cooperation:string[];
  practicalSuggestions:string[];
};

export type PersonalizedRecommendations = {
  name:NameRecommendation;
  mobile:MobilePatternComparison[];
  career:CareerRecommendation[];
  marriage:MarriageRecommendation|null;
};

export function createNameRecommendations(input:{
  name:string;
  dateOfBirth:string;
  system?:NumerologySystem;
  preferredSpelling?:string;
}):NameRecommendation {
  const system=input.system??"pythagorean";
  const date=calculateDateNumbers(input.dateOfBirth);
  const grid=calculateLoShu(input.dateOfBirth,"dob-only");
  const original=calculateNameName(input.name,system);
  const corrections=calculateNameCorrections(input.name,input.dateOfBirth,system,input.preferredSpelling);
  const alternatives=corrections.map((item)=>{
    const chaldean=calculateNameName(item.suggested,"chaldean");
    const pythagorean=calculateNameName(item.suggested,"pythagorean");
    const moolankAligned=chaldean.expression.reduced===date.moolank||pythagorean.expression.reduced===date.moolank;
    const bhagyankAligned=chaldean.expression.reduced===date.bhagyank||pythagorean.expression.reduced===date.bhagyank;
    const loShuAligned=grid.present.includes(chaldean.expression.reduced)||grid.present.includes(pythagorean.expression.reduced);
    const supporting:RecommendationEvidence[]=[];
    const contradictory:RecommendationEvidence[]=[];
    const neutral:RecommendationEvidence[]=[];
    if (moolankAligned) supporting.push({factor:"Moolank alignment",relation:"supporting",evidence:`Suggested spelling root matches Moolank ${date.moolank}`});
    else neutral.push({factor:"Moolank relationship",relation:"neutral",evidence:`Neither displayed root is equal to Moolank ${date.moolank}`});
    if (bhagyankAligned) supporting.push({factor:"Bhagyank alignment",relation:"supporting",evidence:`Suggested spelling root matches Bhagyank ${date.bhagyank}`});
    else neutral.push({factor:"Bhagyank relationship",relation:"neutral",evidence:`Neither displayed root is equal to Bhagyank ${date.bhagyank}`});
    if (!loShuAligned) contradictory.push({factor:"Lo Shu relationship",relation:"contradictory",evidence:"Neither name root is present in the selected DOB-only Lo Shu grid"});
    else supporting.push({factor:"Lo Shu relationship",relation:"supporting",evidence:"A name root is present in the selected DOB-only Lo Shu grid"});
    return {
      spelling:item.suggested,
      chaldeanCompound:chaldean.expression.compound,
      chaldeanRoot:chaldean.expression.reduced,
      pythagoreanCompound:pythagorean.expression.compound,
      pythagoreanRoot:pythagorean.expression.reduced,
      moolankAligned,bhagyankAligned,loShuAligned,
      score:item.score+(loShuAligned?10:0),
      changedLetters:item.changedLetters,
      supporting,contradictory,neutral,
    };
  });
  return {original:original.normalized,alternatives};
}

export function createMobileRecommendations(input:{
  countryCode:string;
  mobileNumber:string;
  dateOfBirth:string;
  targets?:number[];
}):MobilePatternComparison[] {
  const existing=analyzeMobileNumber(input.countryCode,input.mobileNumber,input.dateOfBirth);
  const grid=calculateLoShu(input.dateOfBirth,"dob-only");
  const date=calculateDateNumbers(input.dateOfBirth);
  return generateMobileCorrectionPatterns(input.countryCode,input.mobileNumber,input.dateOfBirth,input.targets).map((suggestion)=>{
    const root=suggestion.targetRoot;
    const dobAligned=root===date.moolank||root===date.bhagyank;
    const loShuAligned=grid.present.includes(root);
    const supporting:RecommendationEvidence[]=[];
    const contradictory:RecommendationEvidence[]=[];
    const neutral:RecommendationEvidence[]=[];
    if (root===date.moolank) supporting.push({factor:"Moolank root",relation:"supporting",evidence:`Pattern root ${root} equals Moolank ${date.moolank}`});
    if (root===date.bhagyank) supporting.push({factor:"Bhagyank root",relation:"supporting",evidence:`Pattern root ${root} equals Bhagyank ${date.bhagyank}`});
    if (!dobAligned) contradictory.push({factor:"DOB alignment",relation:"contradictory",evidence:`Root ${root} differs from Moolank ${date.moolank} and Bhagyank ${date.bhagyank}`});
    if (loShuAligned) supporting.push({factor:"Lo Shu presence",relation:"supporting",evidence:`Root ${root} is present in the DOB-only grid`});
    else neutral.push({factor:"Lo Shu absence",relation:"neutral",evidence:`Root ${root} is missing in the DOB-only grid`});
    return {
      maskedNumber:`****${suggestion.example.slice(-4)}`,
      compound:suggestion.compoundDelta+existing.compound,
      root,
      targetRoot:root,
      compoundDelta:suggestion.compoundDelta,
      dobAligned,
      loShuAligned,
      supporting,contradictory,neutral,
      score:suggestion.score,
    };
  });
}

export function createCareerRecommendations(input:{
  dateOfBirth:string;
  name:string;
  system?:NumerologySystem;
}):CareerRecommendation[] {
  const career=calculateCareerProfile(input.dateOfBirth,input.name,input.system);
  return career.categories.map((item)=>{
    const supporting:RecommendationEvidence[]=item.match.map((root)=>({factor:`Root ${root}`,relation:"supporting",evidence:`Calculated root ${root} appears in the traditional ${item.category} set`}));
    const contradictory:RecommendationEvidence[]=item.contradictions.map((text)=>({factor:"Contradictory root",relation:"contradictory",evidence:text}));
    const neutral:RecommendationEvidence[]=career.roots
      .filter((root)=>!item.match.includes(root))
      .map((root)=>({factor:`Neutral root ${root}`,relation:"neutral" as const,evidence:`Root ${root} has no listed traditional match for ${item.category}`}));
    const score=Math.min(100,item.match.length*35+supporting.length*10);
    const business=item.category==="Business"||item.category==="Entrepreneurship"||item.category==="Finance";
    const employmentOrBusiness:CareerRecommendation["employmentOrBusiness"]=business?"business":item.category==="Management"?"hybrid":"employment";
    const strengthThemes=item.relevantSkills;
    const development=["Practise measurable skills","Collect real-world evidence","Separate traditional symbolism from demonstrated ability"];
    return {category:item.category,score,supporting,contradictory,neutral:neutral as RecommendationEvidence[],strengths:strengthThemes,development,employmentOrBusiness};
  }).sort((a,b)=>b.score-a.score);
}

export function createMarriageRecommendations(input:{
  firstName:string;
  firstDob:string;
  secondName:string;
  secondDob:string;
  system?:NumerologySystem;
}):MarriageRecommendation|null {
  if (!input.firstName.trim()||!input.secondName.trim()) return null;
  const system=input.system??"pythagorean";
  const marriage=calculateMarriageCompatibility(input.firstName,input.firstDob,input.secondName,input.secondDob,system);
  const supporting:RecommendationEvidence[]=[];
  const contradictory:RecommendationEvidence[]=[];
  const neutral:RecommendationEvidence[]=[];
  for (const [label,left,right] of marriage.pairs) {
    if (left===right) supporting.push({factor:`Matching ${label}`,relation:"supporting",evidence:`Both profiles reduce to ${left}`});
    else neutral.push({factor:`Different ${label}`,relation:"neutral",evidence:`First ${left}; second ${right}`});
  }
  if (marriage.sharedMissing.length>0) neutral.push({factor:"Shared missing digits",relation:"neutral",evidence:`Shared missing numbers: ${marriage.sharedMissing.join(", ")}`});
  if (marriage.complementary>0) supporting.push({factor:"Lo Shu complementarity",relation:"supporting",evidence:`${marriage.complementary} complementary relationships`});
  if (marriage.chaldean.first!==marriage.chaldean.second) contradictory.push({factor:"Chaldean name difference",relation:"contradictory",evidence:`${marriage.chaldean.first} versus ${marriage.chaldean.second}`});
  if (marriage.pythagorean.first!==marriage.pythagorean.second) contradictory.push({factor:"Pythagorean name difference",relation:"contradictory",evidence:`${marriage.pythagorean.first} versus ${marriage.pythagorean.second}`});
  return {
    score:marriage.traditionalMethodScore,
    maximumScore:marriage.maximumScore,
    supporting,contradictory,neutral,
    communication:["Clarify preferences and decision-making styles","Schedule regular practical reviews","Respect differences as communication prompts"],
    cooperation:["Define shared responsibilities","Use complementary strengths","Avoid interpreting score as relationship certainty"],
    practicalSuggestions:["Discuss long-term expectations directly","Use real compatibility evidence alongside tradition","Seek qualified support if conflict is serious"],
  };
}

export type SavedReportComparison = {
  leftTitle:string;
  rightTitle:string;
  differences:Array<{field:string;left:string;right:string}>;
  summary:string;
};

export function compareSavedNumerologyReports(leftTitle:string,leftPayload:Record<string,unknown>,rightTitle:string,rightPayload:Record<string,unknown>):SavedReportComparison {
  const fields=["dateOfBirth","name","system","loShuMode","language","moolank","bhagyank","nameRoot","mobileMask"];
  const differences=fields.flatMap((field)=>{
    const left=leftPayload[field]??(leftPayload.date as Record<string,unknown>|undefined)?.[field];
    const right=rightPayload[field]??(rightPayload.date as Record<string,unknown>|undefined)?.[field];
    return JSON.stringify(left)!==JSON.stringify(right)?[{field,left:String(left??"not provided"),right:String(right??"not provided")}]:[];
  });
  return {
    leftTitle,rightTitle,differences,
    summary:differences.length===0?"The compared report fields are identical.":`${differences.length} report field${differences.length===1?"":"s"} changed between these readings.`,
  };
}

export function sanitizeNumerologyExport<T extends Record<string,unknown>>(payload:T):T {
  const sanitize=(value:unknown,depth=0):unknown=>{
    if (depth>6||value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean") {
      if (typeof value==="string"&&/^\d{7,15}$/.test(value)) return `****${value.slice(-4)}`;
      return value;
    }
    if (Array.isArray(value)) return value.map((item)=>sanitize(item,depth+1));
    if (typeof value==="object") {
      return Object.fromEntries(Object.entries(value as Record<string,unknown>).flatMap(([key,item])=>{
        if (/mobile|phone|nationalNumber|fullNumber/i.test(key)&&typeof item==="string") return [[key,`****${item.slice(-4)}`]];
        return [[key,sanitize(item,depth+1)]];
      }));
    }
    return value;
  };
  return sanitize(payload) as T;
}
