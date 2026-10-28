import type { Language } from "./language";

export type RemedyCategory = "sattvik" | "lal-kitab" | "tantra";
export type RemedyProblem = "marriage" | "partner" | "government" | "career" | "business" | "education" | "foreign" | "discipline" | "peace" | "planetary" | "learning";
export type RemedyPriceTier = "free" | "low" | "budget" | "mid" | "premium";

export type LocalizedText = Record<Language, string>;

export type Remedy = {
  id: string;
  category: RemedyCategory;
  problems: RemedyProblem[];
  name: LocalizedText;
  purpose: LocalizedText;
  tradition: LocalizedText;
  materials: LocalizedText;
  steps: LocalizedText;
  duration: LocalizedText;
  time: LocalizedText;
  price: number | null;
  tier: RemedyPriceTier;
  freeAlternative: LocalizedText;
  safety: LocalizedText;
  evidence: LocalizedText;
  chartFactors: string[];
};

const text = (en: string, hi: string, hinglish: string): LocalizedText => ({ en, hi, hinglish });

export const remedyCatalog: Remedy[] = [
  {
    id: "daily-gratitude-discipline",
    category: "sattvik",
    problems: ["discipline", "learning", "career"],
    name: text("Gratitude and daily discipline", "कृतज्ञता और दैनिक अनुशासन", "Kritagyata aur daily discipline"),
    purpose: text("Build reflection, steadiness and responsible action.", "आत्मचिंतन, स्थिरता और जिम्मेदार कर्म विकसित करना।", "Reflection, steadiness aur responsible action banana."),
    tradition: text("Personal devotional practice; a general Saatvik principle, not a chart-specific rule.", "व्यक्तिगत भक्ति अभ्यास; सामान्य सात्त्विक सिद्धांत, कुंडली-विशिष्ट नियम नहीं।", "Personal devotional practice; general Saatvik principle, chart-specific rule nahi."),
    materials: text("None; a notebook is optional.", "कोई सामग्री नहीं; नोटबुक वैकल्पिक है।", "Koi material nahi; notebook optional hai."),
    steps: text("Write three things you appreciate, choose one practical task, and review the day without self-blame.", "तीन कृतज्ञताएँ लिखें, एक व्यावहारिक कार्य चुनें और बिना आत्म-दोष के दिन की समीक्षा करें।", "Teen gratitude points likhein, ek practical task chunein aur bina self-blame din review karein."),
    duration: text("A short daily practice; no traditional fixed duration is claimed.", "छोटा दैनिक अभ्यास; कोई निश्चित पारंपरिक अवधि दावा नहीं की गई है।", "Short daily practice; fixed traditional duration claim nahi."),
    time: text("5–10 minutes", "5–10 मिनट", "5–10 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("This practice is already free.", "यह अभ्यास पहले से निःशुल्क है।", "Yeh practice already free hai."),
    safety: text("Do not replace medical, legal or financial help with spiritual practice.", "आध्यात्मिक अभ्यास को चिकित्सा, कानूनी या वित्तीय सहायता का विकल्प न बनाएं।", "Spiritual practice ko medical, legal ya financial help ka replacement na banayein."),
    evidence: text("Educational and personal practice; not independently verified as an intervention.", "शैक्षिक और व्यक्तिगत अभ्यास; intervention के रूप में स्वतंत्र रूप से सत्यापित नहीं।", "Educational aur personal practice; intervention ke roop mein independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "seva-charity",
    category: "sattvik",
    problems: ["marriage", "government", "career", "business", "discipline"],
    name: text("Seva and transparent charity", "सेवा और पारदर्शी दान", "Seva aur transparent charity"),
    purpose: text("Practice generosity and community responsibility without expecting a guaranteed result.", "निश्चित परिणाम की अपेक्षा बिना उदारता और सामुदायिक जिम्मेदारी का अभ्यास।", "Guaranteed result ki expectation ke bina generosity aur community responsibility practice karna."),
    tradition: text("Saatvik seva and dana are broad devotional values; no claim is made that a payment changes a chart.", "सात्त्विक सेवा और दान व्यापक भक्ति-मूल्य हैं; भुगतान से कुंडली बदलने का दावा नहीं।", "Saatvik seva aur dana broad devotional values hain; payment se chart badalne ka claim nahi."),
    materials: text("Only a chosen amount or volunteer time.", "केवल चुनी हुई राशि या स्वयंसेवा का समय।", "Sirf chosen amount ya volunteer time."),
    steps: text("Choose a reputable cause, verify how help is used, and give only what is affordable.", "विश्वसनीय संस्था चुनें, उपयोग की जाँच करें और केवल वह दें जो वहन कर सकें।", "Reputable cause choose karein, use verify karein aur jitna affordable ho utna hi dein."),
    duration: text("Flexible; no fixed duration claimed.", "लचीला; कोई निश्चित अवधि दावा नहीं।", "Flexible; fixed duration claim nahi."),
    time: text("15–60 minutes", "15–60 मिनट", "15–60 minutes"),
    price: null, tier: "free",
    freeAlternative: text("Volunteer time instead of money.", "पैसे के बजाय स्वयंसेवा का समय दें।", "Paise ke badle volunteer time dein."),
    safety: text("Never donate under fear, pressure or a promise of avoiding a predicted event.", "डर, दबाव या भविष्यवाणी टालने के वादे पर दान न करें।", "Fear, pressure ya predicted event avoid karne ke promise par donate na karein."),
    evidence: text("Traditional ethical practice; effectiveness for life outcomes is not independently verified.", "पारंपरिक नैतिक अभ्यास; जीवन-परिणामों के लिए प्रभाव स्वतंत्र रूप से सत्यापित नहीं।", "Traditional ethical practice; life outcomes ke liye effect independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "simple-mantra-prayer",
    category: "sattvik",
    problems: ["planetary", "discipline", "peace"],
    name: text("Simple prayer or mantra reflection", "सरल प्रार्थना या मंत्र-चिंतन", "Simple prayer ya mantra reflection"),
    purpose: text("Support focus and devotional reflection in a personally meaningful form.", "ध्यान और भक्ति-चिंतन में सहायक व्यक्तिगत अभ्यास।", "Focus aur devotional reflection ko support karne wali personal practice."),
    tradition: text("Faith-based practice; use a tradition and pronunciation you understand.", "आस्था-आधारित अभ्यास; ऐसी परंपरा और उच्चारण चुनें जिसे आप समझते हों।", "Faith-based practice; wahi tradition aur pronunciation use karein jo samajh aaye."),
    materials: text("None; a quiet place is sufficient.", "कोई सामग्री नहीं; शांत स्थान पर्याप्त है।", "Koi material nahi; quiet place enough hai."),
    steps: text("Sit comfortably, use a short familiar prayer, and stop if it causes distress.", "आराम से बैठें, परिचित छोटी प्रार्थना करें और परेशानी हो तो रोक दें।", "Comfortably baithkar short familiar prayer karein; distress ho to stop karein."),
    duration: text("No fixed duration is asserted.", "कोई निश्चित अवधि दावा नहीं।", "Fixed duration assert nahi ki gayi."),
    time: text("5–15 minutes", "5–15 मिनट", "5–15 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("Use a free personal prayer without purchasing materials.", "सामग्री खरीदे बिना व्यक्तिगत प्रार्थना करें।", "Materials purchase kiye bina personal prayer karein."),
    safety: text("Do not use chants to control, threaten or coerce another person.", "किसी को नियंत्रित, धमकाने या मजबूर करने के लिए मंत्र का उपयोग न करें।", "Kisi ko control, threaten ya coerce karne ke liye mantra use na karein."),
    evidence: text("Personal devotional practice; not independently verified.", "व्यक्तिगत भक्ति अभ्यास; स्वतंत्र रूप से सत्यापित नहीं।", "Personal devotional practice; independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "lal-kitab-simple-charity",
    category: "lal-kitab",
    problems: ["planetary", "business", "career"],
    name: text("Lal Kitab-inspired simple charity", "लाल किताब-प्रेरित सरल दान", "Lal Kitab-inspired simple charity"),
    purpose: text("Study a traditional symbolic remedy idea through modest, ethical charity.", "साधारण, नैतिक दान के माध्यम से पारंपरिक प्रतीकात्मक उपाय-विचार का अध्ययन।", "Modest, ethical charity ke through traditional symbolic remedy idea samajhna."),
    tradition: text("Lal Kitab tradition is cited generally; this record does not assert a verified classical citation or universal rule.", "लाल किताब परंपरा का सामान्य उल्लेख है; यह रिकॉर्ड प्रमाणित शास्त्रीय उद्धरण या सार्वभौमिक नियम का दावा नहीं करता।", "Lal Kitab tradition ka general reference hai; verified classical citation ya universal rule claim nahi."),
    materials: text("Optional ordinary food or household item chosen for donation.", "दान के लिए वैकल्पिक सामान्य भोजन या घरेलू वस्तु।", "Donation ke liye optional normal food ya household item."),
    steps: text("Give a useful item through a reputable channel; do not leave objects in public places or create waste.", "उपयोगी वस्तु विश्वसनीय माध्यम से दें; सार्वजनिक स्थान पर वस्तु छोड़कर कचरा न बनाएं।", "Useful item reputable channel se dein; public place par object chhodkar waste na banayein."),
    duration: text("No fixed duration is verified for this educational example.", "इस शैक्षिक उदाहरण की कोई निश्चित अवधि सत्यापित नहीं।", "Is educational example ki fixed duration verified nahi."),
    time: text("10–20 minutes", "10–20 मिनट", "10–20 minutes"),
    price: null, tier: "free",
    freeAlternative: text("Donate time or a useful item already available at home.", "घर में उपलब्ध उपयोगी वस्तु या समय दान करें।", "Ghar mein available useful item ya time donate karein."),
    safety: text("No fire, ingestion, animal harm, disposal or fear-based instruction is included.", "अग्नि, सेवन, पशु-हानि, अनुचित विसर्जन या डर-आधारित निर्देश शामिल नहीं हैं।", "Fire, ingestion, animal harm, unsafe disposal ya fear-based instruction nahi."),
    evidence: text("Educational tradition reference; authenticity and effectiveness are not independently verified.", "शैक्षिक परंपरा संदर्भ; प्रामाणिकता और प्रभाव स्वतंत्र रूप से सत्यापित नहीं।", "Educational tradition reference; authenticity aur effect independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "lal-kitab-discipline",
    category: "lal-kitab",
    problems: ["career", "government", "education"],
    name: text("Lal Kitab-style household order", "लाल किताब-शैली का घरेलू अनुशासन", "Lal Kitab-style household order"),
    purpose: text("Use cleanliness, responsibility and regular helpful action as a safe symbolic practice.", "स्वच्छता, जिम्मेदारी और नियमित सहायक कर्म को सुरक्षित प्रतीकात्मक अभ्यास बनाना।", "Cleanliness, responsibility aur helpful action ko safe symbolic practice banana."),
    tradition: text("A modern educational adaptation inspired by household-remedy discussions; no exact source is asserted.", "घरेलू उपाय चर्चाओं से प्रेरित आधुनिक शैक्षिक रूपांतरण; कोई सटीक स्रोत दावा नहीं।", "Household remedy discussions se inspired modern educational adaptation; exact source claim nahi."),
    materials: text("None.", "कोई सामग्री नहीं।", "Koi material nahi."),
    steps: text("Keep one workspace orderly, return borrowed items and complete one neglected responsibility.", "एक कार्यस्थल व्यवस्थित रखें, उधार वस्तु लौटाएं और एक टाली हुई जिम्मेदारी पूरी करें।", "Ek workspace orderly rakhein, borrowed item return karein aur ek pending responsibility complete karein."),
    duration: text("Repeat only if it remains useful; no traditional fixed duration verified.", "उपयोगी लगे तभी दोहराएं; निश्चित पारंपरिक अवधि सत्यापित नहीं।", "Useful lage tabhi repeat karein; fixed traditional duration verified nahi."),
    time: text("10 minutes", "10 मिनट", "10 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("No-cost household organization.", "निःशुल्क घरेलू व्यवस्था।", "No-cost household organization."),
    safety: text("Never discard needed belongings or blame a person for a planetary condition.", "जरूरी वस्तुएं न फेंकें और किसी व्यक्ति को ग्रह-दोष के लिए दोषी न ठहराएं।", "Zaroori belongings na phenkein aur kisi person ko planetary condition ke liye blame na karein."),
    evidence: text("Educational adaptation; not independently verified.", "शैक्षिक रूपांतरण; स्वतंत्र रूप से सत्यापित नहीं।", "Educational adaptation; independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "tantra-devotional-meditation",
    category: "tantra",
    problems: ["peace", "discipline", "learning"],
    name: text("Tantra-informed devotional meditation", "तंत्र-परंपरा से परिचित भक्ति-ध्यान", "Tantra-informed devotional meditation"),
    purpose: text("Learn that Tantra contains diverse ritual, mantra and contemplative traditions; practise only a simple, non-coercive reflection.", "तंत्र की विविध साधना, मंत्र और ध्यान परंपराओं को समझना; केवल सरल, अहिंसक चिंतन करना।", "Tantra ki diverse practices samajhna aur simple, non-coercive reflection karna."),
    tradition: text("Educational overview of Tantra traditions; not a claim about one uniform school or modern commercial service.", "तंत्र परंपराओं का शैक्षिक परिचय; किसी एक समान शाखा या आधुनिक व्यावसायिक सेवा का दावा नहीं।", "Tantra traditions ka educational overview; one uniform school ya commercial service ka claim nahi."),
    materials: text("None; avoid unverified substances, initiations or paid claims.", "कोई सामग्री नहीं; अप्रमाणित पदार्थ, दीक्षा या भुगतान वाले दावों से बचें।", "Koi material nahi; unverified substances, initiation ya paid claims avoid karein."),
    steps: text("Use quiet breathing and a respectful personal intention. Do not attempt rituals involving harm, coercion or altered states.", "शांत श्वास और सम्मानपूर्ण संकल्प रखें। हानि, दबाव या परिवर्तित चेतना वाले अनुष्ठान न करें।", "Quiet breathing aur respectful intention rakhein. Harm, coercion ya altered states wale rituals na karein."),
    duration: text("No fixed duration claimed.", "कोई निश्चित अवधि दावा नहीं।", "Fixed duration claim nahi."),
    time: text("5–15 minutes", "5–15 मिनट", "5–15 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("Free quiet reflection or study from a reputable library source.", "विश्वसनीय पुस्तकालय स्रोत से निःशुल्क चिंतन या अध्ययन।", "Reputable library source se free reflection ya study."),
    safety: text("Avoid claims of possession, guaranteed powers, control of others, hazardous substances or animal harm.", "वशीकरण, निश्चित चमत्कार, दूसरों पर नियंत्रण, खतरनाक पदार्थ या पशु-हानि वाले दावों से बचें।", "Possession, guaranteed powers, control, hazardous substances ya animal harm claims avoid karein."),
    evidence: text("Educational explanation and personal practice; not independently verified.", "शैक्षिक व्याख्या और व्यक्तिगत अभ्यास; स्वतंत्र रूप से सत्यापित नहीं।", "Educational explanation aur personal practice; independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "guided-study-session",
    category: "sattvik",
    problems: ["education", "career", "government"],
    name: text("Focused study session", "एकाग्र अध्ययन सत्र", "Focused study session"),
    purpose: text("Support education through a practical, measurable habit.", "व्यावहारिक और मापने योग्य आदत से शिक्षा में सहायता।", "Practical, measurable habit se education support karna."),
    tradition: text("Practical alternative, not a planetary remedy.", "व्यावहारिक विकल्प, ग्रह-उपाय नहीं।", "Practical alternative, planetary remedy nahi."),
    materials: text("Study material and a timer.", "अध्ययन सामग्री और टाइमर।", "Study material aur timer."),
    steps: text("Choose one topic, silence distractions, study for a short block and record what was completed.", "एक विषय चुनें, ध्यान भटकाने वाली चीजें बंद करें, छोटे समयखंड में पढ़ें और पूरा काम लिखें।", "Ek topic choose karein, distractions silence karein, short block padhein aur completed work note karein."),
    duration: text("Repeat according to your schedule; no astrological duration is claimed.", "अपने कार्यक्रम के अनुसार दोहराएं; कोई ज्योतिषीय अवधि दावा नहीं।", "Schedule ke hisaab se repeat karein; astrological duration claim nahi."),
    time: text("25–50 minutes", "25–50 मिनट", "25–50 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("Use existing books and free public study resources.", "मौजूदा पुस्तकों और निःशुल्क सार्वजनिक संसाधनों का उपयोग करें।", "Existing books aur free public resources use karein."),
    safety: text("Take breaks and seek appropriate support for anxiety, attention or learning difficulties.", "विराम लें और चिंता, ध्यान या सीखने की कठिनाई में उचित सहायता लें।", "Breaks lein; anxiety, attention ya learning difficulty mein proper help lein."),
    evidence: text("Practical educational guidance; not independently verified as astrology.", "व्यावहारिक शैक्षिक मार्गदर्शन; ज्योतिष के रूप में स्वतंत्र रूप से सत्यापित नहीं।", "Practical educational guidance; astrology ke roop mein independently verified nahi."),
    chartFactors: [],
  },
  {
    id: "planetary-chart-reflection",
    category: "sattvik",
    problems: ["planetary", "marriage", "career", "business", "foreign"],
    name: text("Chart-factor reflection", "कुंडली-कारक चिंतन", "Chart-factor reflection"),
    purpose: text("Review calculated placements and choose a practical action without treating symbolism as certainty.", "गणना की गई स्थितियों की समीक्षा कर प्रतीकात्मक अर्थ को निश्चितता माने बिना व्यावहारिक कदम चुनना।", "Calculated placements review karke symbolism ko certainty na maanate hue practical step choose karna."),
    tradition: text("Traditional interpretation is educational; this is not a remedial rule or scientific intervention.", "पारंपरिक व्याख्या शैक्षिक है; यह उपाय-नियम या वैज्ञानिक intervention नहीं।", "Traditional interpretation educational hai; remedial rule ya scientific intervention nahi."),
    materials: text("The calculated LIFE chart, if available.", "यदि उपलब्ध हो तो LIFE की गणना की गई कुंडली।", "Agar available ho to LIFE calculated chart."),
    steps: text("Read the evidence, note uncertainties, and select one ordinary action such as preparation, communication or budgeting.", "प्रमाण और सीमाएं पढ़ें और तैयारी, संवाद या बजट जैसे एक सामान्य कदम चुनें।", "Evidence aur limitations padhein aur preparation, communication ya budgeting jaisa ek normal step choose karein."),
    duration: text("As needed; no fixed traditional duration.", "आवश्यकतानुसार; कोई निश्चित पारंपरिक अवधि नहीं।", "Need ke hisaab se; fixed traditional duration nahi."),
    time: text("10–20 minutes", "10–20 मिनट", "10–20 minutes"),
    price: 0, tier: "free",
    freeAlternative: text("Use the existing chart evidence at no cost.", "मौजूदा कुंडली प्रमाण का निःशुल्क उपयोग करें।", "Existing chart evidence free mein use karein."),
    safety: text("Do not make health, legal, financial or relationship decisions from a symbolic factor alone.", "केवल प्रतीकात्मक कारक से स्वास्थ्य, कानूनी, वित्तीय या संबंध निर्णय न लें।", "Sirf symbolic factor se health, legal, financial ya relationship decision na lein."),
    evidence: text("Uses calculated chart data only when available; traditional meanings are not scientifically established and this practice is not independently verified.", "केवल उपलब्ध गणना डेटा का उपयोग; पारंपरिक अर्थ वैज्ञानिक रूप से स्थापित नहीं हैं और यह अभ्यास स्वतंत्र रूप से सत्यापित नहीं।", "Sirf available calculated data use hota hai; traditional meanings scientifically established nahi aur yeh practice independently verified nahi."),
    chartFactors: ["active Dasha", "planetary dignity", "documented interpretation factors"],
  },
];

export const remedyCategories: { id: RemedyCategory; label: LocalizedText }[] = [
  { id: "sattvik", label: text("Saatvik Upay", "सात्त्विक उपाय", "Saatvik Upay") },
  { id: "lal-kitab", label: text("Lal Kitab Upay", "लाल किताब उपाय", "Lal Kitab Upay") },
  { id: "tantra", label: text("Tantra Parampara", "तंत्र परंपरा", "Tantra Parampara") },
];

export const remedyProblems: { id: RemedyProblem; label: LocalizedText }[] = [
  { id: "marriage", label: text("Marriage & relationships", "विवाह और संबंध", "Marriage aur relationships") },
  { id: "partner", label: text("Life partner & compatibility", "जीवनसाथी और अनुकूलता", "Life partner aur compatibility") },
  { id: "government", label: text("Government job & exams", "सरकारी नौकरी और परीक्षा", "Government job aur exams") },
  { id: "career", label: text("Private job & career", "निजी नौकरी और करियर", "Private job aur career") },
  { id: "business", label: text("Business & finances", "व्यवसाय और वित्त", "Business aur finances") },
  { id: "education", label: text("Education & concentration", "शिक्षा और एकाग्रता", "Education aur concentration") },
  { id: "foreign", label: text("Foreign travel & study", "विदेश यात्रा और अध्ययन", "Foreign travel aur study") },
  { id: "discipline", label: text("Peace, confidence & discipline", "शांति, आत्मविश्वास और अनुशासन", "Peace, confidence aur discipline") },
  { id: "planetary", label: text("Planetary & Dasha practices", "ग्रह और दशा अभ्यास", "Planetary aur Dasha practices") },
  { id: "learning", label: text("General spiritual learning", "सामान्य आध्यात्मिक अध्ययन", "General spiritual learning") },
];

export const priceTiers: { id: RemedyPriceTier; label: LocalizedText; min: number; max: number | null }[] = [
  { id: "free", label: text("Free · ₹0", "निःशुल्क · ₹0", "Free · ₹0"), min: 0, max: 0 },
  { id: "low", label: text("Low cost · ₹1–₹199", "कम लागत · ₹1–₹199", "Low cost · ₹1–₹199"), min: 1, max: 199 },
  { id: "budget", label: text("Budget · ₹200–₹499", "बजट · ₹200–₹499", "Budget · ₹200–₹499"), min: 200, max: 499 },
  { id: "mid", label: text("Mid-range · ₹500–₹1,999", "मध्यम · ₹500–₹1,999", "Mid-range · ₹500–₹1,999"), min: 500, max: 1999 },
  { id: "premium", label: text("Premium · ₹2,000+", "प्रीमियम · ₹2,000+", "Premium · ₹2,000+"), min: 2000, max: null },
];

export function localized(value: LocalizedText, language: Language): string {
  return value[language];
}

export function sortRemedies(remedies: Remedy[], order: "lowest" | "highest" | "category"): Remedy[] {
  return [...remedies].sort((a, b) => {
    if (order === "category") return a.category.localeCompare(b.category) || a.name.en.localeCompare(b.name.en);
    if (a.price === null && b.price === null) return a.name.en.localeCompare(b.name.en);
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    const difference = a.price - b.price;
    return order === "highest" ? -difference : difference;
  });
}
