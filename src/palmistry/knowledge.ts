export type PalmTradition = "hasta-samudrika" | "western" | "cheiro";
export type PalmFeatureCategory = "hand shape" | "major line" | "secondary line" | "mount" | "finger" | "marking";
export type ObservationConfidence = "low" | "medium" | "high";
export type FeaturePresence = "observed" | "absent" | "uncertain" | "not-assessed";

export type PalmFeatureObservation = {
  presence: FeaturePresence;
  shape: string;
  depth: string;
  length: string;
  direction: string;
  continuity: string;
  variation: string;
  confidence: ObservationConfidence;
};

export type PalmFeatureDefinition = {
  id: string;
  label: string;
  category: PalmFeatureCategory;
  location: string;
  theme: string;
  themeHi: string;
  alternative: string;
  alternativeHi: string;
  variations: string[];
  traditions: PalmTradition[];
  sourceIds: string[];
};

const sources = {
  western: ["heron-allen-cheirosophy", "benham-hand-reading"],
  cheiro: ["cheiro-palmistry-for-all"],
  indian: ["indian-samudrika-reference"],
};

const rows: Array<Omit<PalmFeatureDefinition, "traditions" | "sourceIds"> & { traditions?: PalmTradition[] }> = [
  { id: "shape.earth", label: "Earth hand", category: "hand shape", location: "Palm proportions and finger length", theme: "practicality and tangible work", themeHi: "व्यावहारिकता और ठोस काम", alternative: "Hand-shape systems classify proportions differently; mixed proportions are common.", alternativeHi: "हाथ के आकार की प्रणालियाँ अनुपातों को अलग तरह से बाँटती हैं; मिले-जुले अनुपात सामान्य हैं।", variations: ["square palm", "broad palm", "short fingers"], traditions: ["western", "cheiro", "hasta-samudrika"] },
  { id: "shape.air", label: "Air hand", category: "hand shape", location: "Square or rectangular palm with relatively long fingers", theme: "ideas and communication", themeHi: "विचार और संवाद", alternative: "A hand may not fit one element type; proportions are descriptive, not diagnostic.", alternativeHi: "हाथ किसी एक तत्व-वर्ग में पूरी तरह न आए; अनुपात वर्णन हैं, निदान नहीं।", variations: ["square palm", "long fingers"], traditions: ["western", "cheiro"] },
  { id: "shape.fire", label: "Fire hand", category: "hand shape", location: "Long palm with relatively shorter fingers", theme: "initiative and action", themeHi: "पहल और क्रिया", alternative: "Element labels are a modern Western classification and are not universal across traditions.", alternativeHi: "तत्व-आधारित नाम आधुनिक पश्चिमी वर्गीकरण हैं और सभी परंपराओं में समान नहीं हैं।", variations: ["long palm", "short fingers"], traditions: ["western"] },
  { id: "shape.water", label: "Water hand", category: "hand shape", location: "Long palm with relatively long fingers", theme: "imagination and reflection", themeHi: "कल्पना और चिंतन", alternative: "Element labels are a modern Western classification and are not universal across traditions.", alternativeHi: "तत्व-आधारित नाम आधुनिक पश्चिमी वर्गीकरण हैं और सभी परंपराओं में समान नहीं हैं।", variations: ["long palm", "long fingers"], traditions: ["western"] },

  { id: "line.life", label: "Life line", category: "major line", location: "Curves around the base of the thumb toward the wrist", theme: "vitality and everyday change", themeHi: "जीवंतता और दैनिक बदलाव", alternative: "It is not a measure of lifespan, health, or a prediction of events.", alternativeHi: "यह आयु, स्वास्थ्य या घटनाओं की भविष्यवाणी नहीं है।" },
  { id: "line.head", label: "Head line", category: "major line", location: "Crosses the palm from the thumb side toward the outer edge", theme: "thinking and decision-making", themeHi: "सोच और निर्णय", alternative: "Line length or shape does not establish intelligence or ability.", alternativeHi: "रेखा की लंबाई या आकार बुद्धिमत्ता या क्षमता तय नहीं करता।" },
  { id: "line.heart", label: "Heart line", category: "major line", location: "Runs beneath the fingers across the upper palm", theme: "emotional expression and relationships", themeHi: "भावनात्मक अभिव्यक्ति और संबंध", alternative: "It cannot establish a person's feelings or relationship outcomes.", alternativeHi: "यह किसी की भावनाएँ या संबंधों के परिणाम तय नहीं करती।" },
  { id: "line.fate", label: "Fate line", category: "major line", location: "Usually described as a vertical line rising from the wrist or palm center", theme: "direction and changing responsibilities", themeHi: "दिशा और बदलती ज़िम्मेदारियाँ", alternative: "Not everyone has a visible line; it cannot guarantee a career or destiny.", alternativeHi: "हर हाथ में यह रेखा स्पष्ट नहीं होती; यह करियर या भाग्य की गारंटी नहीं।" },
  { id: "line.sun", label: "Sun (Apollo) line", category: "major line", location: "Traditionally placed below the ring finger", theme: "creative expression and recognition", themeHi: "रचनात्मक अभिव्यक्ति और पहचान", alternative: "A line's presence cannot guarantee fame, success, or wealth.", alternativeHi: "रेखा की मौजूदगी प्रसिद्धि, सफलता या धन की गारंटी नहीं।" },
  { id: "line.mercury", label: "Mercury line", category: "major line", location: "Traditionally placed below the little finger, often rising from the lower palm", theme: "communication and exchange", themeHi: "संवाद और लेन-देन", alternative: "Names and meanings differ; some schools call this the health line, which is not medical evidence.", alternativeHi: "नाम और अर्थ अलग हैं; कुछ पद्धतियाँ इसे स्वास्थ्य रेखा कहती हैं, पर यह चिकित्सकीय प्रमाण नहीं।" },

  { id: "secondary.relationship", label: "Relationship / marriage lines", category: "secondary line", location: "Short horizontal marks on the outer edge below the little finger", theme: "close bonds and attachment", themeHi: "निकट संबंध और जुड़ाव", alternative: "Counting marks cannot establish marriage, partners, or dates.", alternativeHi: "रेखाएँ गिनने से विवाह, साथी या तारीख तय नहीं होती।" },
  { id: "secondary.travel", label: "Travel lines", category: "secondary line", location: "Short marks on the lower outer palm, often associated with the Moon mount", theme: "movement and new surroundings", themeHi: "आवागमन और नए परिवेश", alternative: "These marks do not predict travel or relocation.", alternativeHi: "ये चिह्न यात्रा या स्थान-परिवर्तन की भविष्यवाणी नहीं करते।" },
  { id: "secondary.intuition", label: "Intuition line", category: "secondary line", location: "An arc sometimes described along the outer Moon mount", theme: "imagination and inward reflection", themeHi: "कल्पना और आंतरिक चिंतन", alternative: "The line is inconsistently defined across schools and may be confused with ordinary creases.", alternativeHi: "इस रेखा की परिभाषा पद्धतियों में एक जैसी नहीं; इसे सामान्य त्वचा-रेखाओं से भ्रमित किया जा सकता है।" },
  { id: "secondary.venus-girdle", label: "Girdle of Venus", category: "secondary line", location: "A curved marking above the heart line, beneath the fingers", theme: "sensitivity and expressive response", themeHi: "संवेदनशीलता और अभिव्यक्ति", alternative: "It is often faint or absent and has no clinical or psychological meaning.", alternativeHi: "यह अक्सर हल्की या अनुपस्थित होती है; इसका चिकित्सकीय या मनोवैज्ञानिक अर्थ प्रमाणित नहीं।" },
  { id: "secondary.mars", label: "Mars line", category: "secondary line", location: "A possible parallel line inside or beside the life line", theme: "resilience and support", themeHi: "धैर्य और सहारा", alternative: "It may be a crease variant and does not establish protection from harm.", alternativeHi: "यह त्वचा की दूसरी रेखा हो सकती है; इससे नुकसान से सुरक्षा सिद्ध नहीं होती।" },
  { id: "secondary.health", label: "Health line (traditional term)", category: "secondary line", location: "Often used as another name for the Mercury line", theme: "traditional Mercury-line symbolism", themeHi: "मरकरी रेखा का पारंपरिक प्रतीकात्मक अर्थ", alternative: "This is not a health assessment; symptoms require a qualified clinician.", alternativeHi: "यह स्वास्थ्य-जाँच नहीं है; लक्षणों के लिए योग्य चिकित्सक से संपर्क करें।" },

  { id: "mount.jupiter", label: "Mount of Jupiter", category: "mount", location: "Below the index finger", theme: "aspiration and leadership", themeHi: "आकांक्षा और नेतृत्व", alternative: "Mount prominence is subjective and varies with anatomy and viewing angle." },
  { id: "mount.saturn", label: "Mount of Saturn", category: "mount", location: "Below the middle finger", theme: "reflection and responsibility", themeHi: "चिंतन और ज़िम्मेदारी", alternative: "A raised or flat area is descriptive only, not a character measure." },
  { id: "mount.apollo", label: "Mount of Apollo", category: "mount", location: "Below the ring finger", theme: "creativity and appreciation", themeHi: "रचनात्मकता और सराहना", alternative: "Mount meanings differ by school and do not predict recognition." },
  { id: "mount.mercury", label: "Mount of Mercury", category: "mount", location: "Below the little finger", theme: "communication and exchange", themeHi: "संवाद और लेन-देन", alternative: "The mount is not evidence of business or communication ability." },
  { id: "mount.venus", label: "Mount of Venus", category: "mount", location: "Fleshy area at the base of the thumb", theme: "affection and vitality", themeHi: "स्नेह और जीवन्तता", alternative: "Palm fullness varies naturally and does not measure health or affection." },
  { id: "mount.moon", label: "Mount of Moon", category: "mount", location: "Lower outer edge of the palm", theme: "imagination and travel", themeHi: "कल्पना और यात्रा", alternative: "These symbolic associations are not evidence of temperament or future travel." },
  { id: "mount.upper-mars", label: "Upper Mars mount", category: "mount", location: "Outer palm between the heart line and little finger base", theme: "composure under pressure", themeHi: "दबाव में संयम", alternative: "The boundary and meaning vary among palmistry schools." },
  { id: "mount.lower-mars", label: "Lower Mars mount", category: "mount", location: "Inner palm between the thumb base and head line", theme: "initiative and resolve", themeHi: "पहल और दृढ़ता", alternative: "The boundary and meaning vary among palmistry schools." },
  { id: "mount.plain-mars", label: "Plain of Mars", category: "mount", location: "Central area of the palm", theme: "balance and steadiness", themeHi: "संतुलन और स्थिरता", alternative: "Central palm markings overlap and should be recorded descriptively." },

  { id: "finger.index", label: "Index finger", category: "finger", location: "Finger next to the thumb", theme: "aspiration and direction", themeHi: "आकांक्षा और दिशा", alternative: "Length and shape vary naturally; they do not prove leadership ability." },
  { id: "finger.middle", label: "Middle finger", category: "finger", location: "Central finger, traditionally associated with Saturn", theme: "structure and reflection", themeHi: "संरचना और चिंतन", alternative: "Finger proportions alone do not measure responsibility or temperament." },
  { id: "finger.ring", label: "Ring finger", category: "finger", location: "Finger between the middle and little fingers", theme: "creative expression and aesthetics", themeHi: "रचनात्मक अभिव्यक्ति और सौंदर्य-बोध", alternative: "The popular Apollo association is symbolic and not a validated ability test." },
  { id: "finger.little", label: "Little finger", category: "finger", location: "Outer finger, traditionally associated with Mercury", theme: "communication and exchange", themeHi: "संवाद और लेन-देन", alternative: "Finger length does not establish honesty, skill, or business success." },
  { id: "finger.thumb", label: "Thumb", category: "finger", location: "Digit beside the index finger; observe angle, flexibility, and segments", theme: "will and practical judgment", themeHi: "इच्छाशक्ति और व्यावहारिक निर्णय", alternative: "Thumb readings differ across schools; flexibility is not a personality diagnosis." },

  { id: "mark.island", label: "Island", category: "marking", location: "An oval or enclosed loop on a line", theme: "a traditional pause or divided expression", themeHi: "पारंपरिक रूप से विराम या बँटी अभिव्यक्ति", alternative: "Small loops may be skin texture, lighting, or intersecting creases." },
  { id: "mark.break", label: "Break", category: "marking", location: "A visible gap or interruption in a line", theme: "a traditional change in a line's theme", themeHi: "रेखा के विषय में पारंपरिक बदलाव", alternative: "A gap may reflect ordinary crease variation; it does not predict an event." },
  { id: "mark.branch", label: "Branch", category: "marking", location: "A smaller line extending from a main line", theme: "a traditional secondary direction", themeHi: "पारंपरिक रूप से दूसरी दिशा", alternative: "Short branches are easy to misidentify; record location and confidence." },
  { id: "mark.cross", label: "Cross", category: "marking", location: "Two short lines intersecting", theme: "a traditional emphasis or encounter of themes", themeHi: "विषयों के मिलने का पारंपरिक संकेत", alternative: "Intersections are common and their meaning is school-dependent." },
  { id: "mark.star", label: "Star", category: "marking", location: "Several short lines radiating from a point", theme: "a traditional intensified mark", themeHi: "पारंपरिक रूप से उभरा हुआ चिह्न", alternative: "A star is difficult to distinguish from a grille or intersecting creases." },
  { id: "mark.square", label: "Square", category: "marking", location: "A small four-sided enclosure around or near a line", theme: "a traditional enclosing or protective symbol", themeHi: "पारंपरिक रूप से घेरने या सुरक्षा का प्रतीक", alternative: "Shape boundaries are subjective; do not infer actual safety." },
  { id: "mark.triangle", label: "Triangle", category: "marking", location: "Three short lines forming a closed triangular shape", theme: "a traditional focused or specialized mark", themeHi: "पारंपरिक रूप से केंद्रित या विशिष्ट चिह्न", alternative: "Many apparent triangles are incomplete intersections." },
  { id: "mark.grille", label: "Grille", category: "marking", location: "Several crossing lines forming a mesh", theme: "a traditional dispersal or complexity symbol", themeHi: "पारंपरिक रूप से बिखराव या जटिलता का प्रतीक", alternative: "Fine skin texture can resemble a grille; confidence should be conservative." },
  { id: "mark.chain", label: "Chain", category: "marking", location: "A sequence of small linked loops along a line", theme: "a traditional variable or uneven expression", themeHi: "पारंपरिक रूप से बदलती अभिव्यक्ति", alternative: "A chained line may simply reflect normal skin creasing." },
  { id: "mark.circle", label: "Circle", category: "marking", location: "A closed round marking on a line or mount", theme: "a tradition-specific emphasis", themeHi: "परंपरा-विशिष्ट उभार", alternative: "Interpretations conflict across sources; the mark is rare and uncertain." },
  { id: "mark.fork", label: "Fork", category: "marking", location: "A line splitting into two or more ends", theme: "a traditional branching of expression", themeHi: "पारंपरिक रूप से अभिव्यक्ति की शाखाएँ", alternative: "Forks may be natural line endings and do not predict separate events." },
  { id: "mark.vertical", label: "Vertical markings", category: "marking", location: "Short lines rising toward the fingers", theme: "a traditional upward or strengthening accent", themeHi: "पारंपरिक रूप से ऊपर उठता या मज़बूत संकेत", alternative: "Direction is hand-position dependent; record the palm orientation." },
  { id: "mark.horizontal", label: "Horizontal markings", category: "marking", location: "Short lines crossing a mount or major line", theme: "a traditional crossing or interruption accent", themeHi: "पारंपरिक रूप से काटने या रुकावट का संकेत", alternative: "Do not interpret marks without a clear, repeatable location." },
];

export const PALM_FEATURE_DEFINITIONS: PalmFeatureDefinition[] = rows.map((row) => ({
  ...row,
  traditions: row.traditions ?? ["western", "cheiro"],
  sourceIds: (row.traditions ?? ["western", "cheiro"]).flatMap((tradition) => {
    if (tradition === "western") return sources.western;
    if (tradition === "cheiro") return sources.cheiro;
    return sources.indian;
  }),
}));

export const PALM_FEATURE_IDS = PALM_FEATURE_DEFINITIONS.map((feature) => feature.id);
export type PalmFeatureId = (typeof PALM_FEATURE_IDS)[number];

export const PALM_OBSERVATION_OPTIONS = {
  presence: ["observed", "absent", "uncertain", "not-assessed"],
  shape: ["straight", "curved", "arched", "wavy", "forked", "chained", "looped", "crossed", "star-like", "square-like", "triangular", "grilled", "circular", "other", "not-assessed"],
  depth: ["faint", "shallow", "medium", "deep", "not-assessed"],
  length: ["short", "medium", "long", "not-assessed"],
  direction: ["upward", "downward", "toward-thumb", "toward-little-finger", "across-palm", "vertical", "other", "not-assessed"],
  continuity: ["continuous", "interrupted", "chained", "forked", "fragmented", "not-applicable", "not-assessed"],
  confidence: ["low", "medium", "high"],
} as const;

export function createEmptyPalmFeatureObservation(): PalmFeatureObservation {
  return {
    presence: "not-assessed",
    shape: "not-assessed",
    depth: "not-assessed",
    length: "not-assessed",
    direction: "not-assessed",
    continuity: "not-assessed",
    variation: "",
    confidence: "medium",
  };
}
