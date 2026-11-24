export type PalmSourceRecord = {
  id: string;
  title: string;
  author: string;
  tradition: string;
  subjects: string[];
  relevantInterpretation: string;
  historicalReliability: "primary historical source" | "historical compilation";
  empiricalReliability: "not scientifically validated";
  reuseBasis: string;
  limitations: string[];
  url: string;
};

export const PALM_SOURCES: PalmSourceRecord[] = [
  {
    id: "cheiro-palmistry-for-all",
    title: "Palmistry for All",
    author: "Cheiro (William John Warner, 1866–1936)",
    tradition: "Cheiro / Western palmistry",
    subjects: ["major lines", "mounts", "fingers", "markings"],
    relevantInterpretation: "Historical source for the Cheiro school’s symbolic vocabulary; LIFE paraphrases rather than reproduces its text.",
    historicalReliability: "primary historical source",
    empiricalReliability: "not scientifically validated",
    reuseBasis: "First published in 1916; treated as public domain in the United States by publication date. Only short bibliographic metadata and original paraphrases are used here; copyright status can vary by jurisdiction.",
    limitations: ["The author presents divinatory claims as a historical palmistry system, not as empirically established findings.", "Digitized copies and editions can differ."],
    url: "https://archive.org/details/palmistryforall20480gut",
  },
  {
    id: "heron-allen-cheirosophy",
    title: "A Manual of Cheirosophy",
    author: "Edward Heron-Allen",
    tradition: "Historical Western cheirosophy",
    subjects: ["hand form", "lines", "mounts", "cheirognomy", "cheiromancy"],
    relevantInterpretation: "Comparative historical description of hand-reading categories and their named locations.",
    historicalReliability: "primary historical source",
    empiricalReliability: "not scientifically validated",
    reuseBasis: "Published in 1885; treated as public domain in the United States by publication date. LIFE uses independently written summaries and does not reproduce the book.",
    limitations: ["Its framing of palmistry as a physical science is historical rhetoric, not a modern scientific conclusion.", "Historical terminology does not map cleanly to current observation labels."],
    url: "https://archive.org/details/manualofcheiroso00heroiala",
  },
  {
    id: "benham-hand-reading",
    title: "The Laws of Scientific Hand-Reading",
    author: "William G. Benham",
    tradition: "Historical Western palmistry",
    subjects: ["hand shapes", "fingers", "lines", "mounts", "markings"],
    relevantInterpretation: "Historical classifications and vocabulary for hand forms and palm features.",
    historicalReliability: "primary historical source",
    empiricalReliability: "not scientifically validated",
    reuseBasis: "The cited edition is dated 1900; treated as public domain in the United States by publication date. LIFE uses original paraphrases, not copied passages.",
    limitations: ["The word “scientific” in the historical title is not evidence that palmistry is scientifically validated.", "Interpretations are culturally situated and can conflict with other schools."],
    url: "https://archive.org/details/dli.ministry.16089",
  },
  {
    id: "indian-samudrika-reference",
    title: "Samudrika Shastra: Sanskrit and Hindi illustrated edition with commentary",
    author: "Traditional text of uncertain individual authorship; 1921 edition associated with Radha Krishna Mishra and Khemraj Shrikrishnadas",
    tradition: "Indian Hasta / Samudrika Shastra",
    subjects: ["traditional hand and bodily signs", "auspicious-mark vocabulary", "Sanskrit/Hindi commentary"],
    relevantInterpretation: "A historical Indian reference for broad Samudrika framing. LIFE does not force Western named-line categories into an unsupported one-to-one Sanskrit equivalence.",
    historicalReliability: "historical compilation",
    empiricalReliability: "not scientifically validated",
    reuseBasis: "The cataloged edition is dated 1921 and is treated as public domain in the United States by publication date. Only metadata and original summaries are used; check local law and edition-specific rights.",
    limitations: ["The underlying text’s authorship and textual history are not securely established by the catalog record.", "The scan’s OCR and attribution may contain errors; the source is not used as empirical evidence.", "This source does not establish that modern Western line taxonomies are identical to Indian categories."],
    url: "https://archive.org/details/crfx-samudrika-shastra-sanvaya-bhasha-tika-radha-krishn",
  },
];

export const PALM_TRADITION_DIFFERENCES = [
  {
    id: "mercury-health-line",
    title: "Mercury line and health line naming",
    note: "Some Western sources use “health line” as a name for the Mercury line; other sources distinguish or omit it. LIFE treats the names as a documented convention, never as a medical finding.",
    sourceIds: ["cheiro-palmistry-for-all", "heron-allen-cheirosophy", "benham-hand-reading"],
  },
  {
    id: "indian-western-taxonomy",
    title: "Indian Samudrika and Western line taxonomies",
    note: "The historical traditions use different vocabularies and classifications. LIFE preserves the named source tradition and does not claim that every Western line or mount has an exact Indian equivalent.",
    sourceIds: ["indian-samudrika-reference", "heron-allen-cheirosophy", "cheiro-palmistry-for-all"],
  },
];
