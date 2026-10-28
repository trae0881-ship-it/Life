import type { DivisionalChartMetadata } from "../calculation/divisional-metadata.ts";
import type { Language } from "./language.ts";

type LocalizedText = Record<Language, string>;

const traditionalUses: Readonly<Record<number, LocalizedText>> = {
  1: {
    en: "Rashi (D1) is the main framework for the recorded ascendant, houses, and planetary sign placements.",
    hi: "राशि (D1) दर्ज लग्न, भावों और ग्रहों की राशि स्थितियों का मुख्य ढाँचा है।",
    hinglish: "Rashi (D1) recorded Lagna, houses aur planetary sign placements ka main framework hai.",
  },
  2: {
    en: "Hora (D2) is traditionally associated with resources and material sustenance.",
    hi: "होरा (D2) को परंपरागत रूप से संसाधनों और भौतिक निर्वाह से जोड़ा जाता है।",
    hinglish: "Hora (D2) ko traditionally resources aur material sustenance se joda jata hai.",
  },
  3: {
    en: "Drekkana (D3) is traditionally associated with siblings, initiative, courage, and effort.",
    hi: "द्रेष्काण (D3) को परंपरागत रूप से भाई-बहनों, पहल, साहस और प्रयास से जोड़ा जाता है।",
    hinglish: "Drekkana (D3) ko traditionally siblings, initiative, courage aur effort se joda jata hai.",
  },
  4: {
    en: "Chaturthamsha (D4) is traditionally associated with home, property, and stability.",
    hi: "चतुर्थांश (D4) को परंपरागत रूप से घर, संपत्ति और स्थिरता से जोड़ा जाता है।",
    hinglish: "Chaturthamsha (D4) ko traditionally home, property aur stability se joda jata hai.",
  },
  5: {
    en: "Panchamsha (D5) has tradition-specific uses; LIFE has not reviewed a chart-specific interpretation rule for it.",
    hi: "पंचमांश (D5) के उपयोग परंपरा-विशेष हैं; LIFE ने इसके लिए चार्ट-विशेष व्याख्या नियम की समीक्षा नहीं की है।",
    hinglish: "Panchamsha (D5) ke uses tradition-specific hain; LIFE ne iske liye chart-specific interpretation rule review nahi kiya hai.",
  },
  6: {
    en: "Shashthamsha (D6) is traditionally associated with adversity and health themes, not medical diagnosis.",
    hi: "षष्ठांश (D6) को परंपरागत रूप से कठिनाइयों और स्वास्थ्य-विषयों से जोड़ा जाता है; यह चिकित्सीय निदान नहीं है।",
    hinglish: "Shashthamsha (D6) ko traditionally adversity aur health themes se joda jata hai; yeh medical diagnosis nahi hai.",
  },
  7: {
    en: "Saptamsha (D7) is traditionally associated with children and progeny themes.",
    hi: "सप्तमांश (D7) को परंपरागत रूप से संतान-संबंधी विषयों से जोड़ा जाता है।",
    hinglish: "Saptamsha (D7) ko traditionally children aur progeny themes se joda jata hai.",
  },
  8: {
    en: "Ashtamsha (D8) has tradition-specific uses; LIFE has not reviewed a chart-specific interpretation rule for it.",
    hi: "अष्टमांश (D8) के उपयोग परंपरा-विशेष हैं; LIFE ने इसके लिए चार्ट-विशेष व्याख्या नियम की समीक्षा नहीं की है।",
    hinglish: "Ashtamsha (D8) ke uses tradition-specific hain; LIFE ne iske liye chart-specific interpretation rule review nahi kiya hai.",
  },
  9: {
    en: "Navamsha (D9) is traditionally considered in dharma, partnership, and planetary-strength analysis.",
    hi: "नवांश (D9) को परंपरागत रूप से धर्म, साझेदारी और ग्रह-बल के विश्लेषण में देखा जाता है।",
    hinglish: "Navamsha (D9) ko traditionally dharma, partnership aur planetary-strength analysis mein dekha jata hai.",
  },
  10: {
    en: "Dashamsha (D10) is traditionally associated with vocation, work, and responsibilities.",
    hi: "दशमांश (D10) को परंपरागत रूप से पेशे, कार्य और जिम्मेदारियों से जोड़ा जाता है।",
    hinglish: "Dashamsha (D10) ko traditionally vocation, work aur responsibilities se joda jata hai.",
  },
  11: {
    en: "Rudramsha (D11) uses the selected reverse-seed variant; it is not a universal convention and its interpretation needs review.",
    hi: "रुद्रांश (D11) चुने हुए उलटे-बीज वाले रूप का उपयोग करता है; यह सार्वभौमिक पद्धति नहीं है और इसकी व्याख्या की समीक्षा आवश्यक है।",
    hinglish: "Rudramsha (D11) selected reverse-seed variant use karta hai; yeh universal convention nahi hai aur interpretation review chahiye.",
  },
  12: {
    en: "Dwadashamsha (D12) is traditionally associated with parents, ancestry, and family lineage.",
    hi: "द्वादशांश (D12) को परंपरागत रूप से माता-पिता, पूर्वजों और पारिवारिक वंश से जोड़ा जाता है।",
    hinglish: "Dwadashamsha (D12) ko traditionally parents, ancestry aur family lineage se joda jata hai.",
  },
  16: {
    en: "Shodashamsha (D16) is traditionally associated with comforts, conveyances, and amenities.",
    hi: "षोडशांश (D16) को परंपरागत रूप से सुख-सुविधाओं, वाहनों और उपभोग की वस्तुओं से जोड़ा जाता है।",
    hinglish: "Shodashamsha (D16) ko traditionally comforts, conveyances aur amenities se joda jata hai.",
  },
  20: {
    en: "Vimshamsha (D20) is traditionally associated with worship and spiritual practice.",
    hi: "विंशांश (D20) को परंपरागत रूप से उपासना और आध्यात्मिक अभ्यास से जोड़ा जाता है।",
    hinglish: "Vimshamsha (D20) ko traditionally worship aur spiritual practice se joda jata hai.",
  },
  24: {
    en: "Chaturvimshamsha (D24) is traditionally associated with learning, education, and knowledge.",
    hi: "चतुर्विंशांश (D24) को परंपरागत रूप से अध्ययन, शिक्षा और ज्ञान से जोड़ा जाता है।",
    hinglish: "Chaturvimshamsha (D24) ko traditionally learning, education aur knowledge se joda jata hai.",
  },
  27: {
    en: "Saptavimshamsha (D27) is traditionally associated with strengths and vulnerabilities.",
    hi: "सप्तविंशांश (D27) को परंपरागत रूप से बल और कमजोरियों से जोड़ा जाता है।",
    hinglish: "Saptavimshamsha (D27) ko traditionally strengths aur vulnerabilities se joda jata hai.",
  },
  30: {
    en: "Trimshamsha (D30) is traditionally associated with difficult or vulnerable themes; its segment rule is unequal by sign.",
    hi: "त्रिंशांश (D30) को परंपरागत रूप से कठिन या संवेदनशील विषयों से जोड़ा जाता है; इसके खंड राशि के अनुसार असमान हैं।",
    hinglish: "Trimshamsha (D30) ko traditionally difficult ya vulnerable themes se joda jata hai; iske segments sign ke hisaab se unequal hain.",
  },
  40: {
    en: "Khavedamsha (D40) is a named varga; LIFE's selected mapping is displayed, while its personalized interpretation remains unreviewed.",
    hi: "खवेदांश (D40) एक नामित वर्ग है; LIFE चुना हुआ मानचित्रण दिखाता है, जबकि इसकी व्यक्तिगत व्याख्या की समीक्षा नहीं हुई है।",
    hinglish: "Khavedamsha (D40) ek named varga hai; LIFE selected mapping dikhata hai, lekin personalized interpretation review nahi hui hai.",
  },
  45: {
    en: "Akshavedamsha (D45) is a named varga; LIFE's selected mapping is displayed, while its personalized interpretation remains unreviewed.",
    hi: "अक्षवेदांश (D45) एक नामित वर्ग है; LIFE चुना हुआ मानचित्रण दिखाता है, जबकि इसकी व्यक्तिगत व्याख्या की समीक्षा नहीं हुई है।",
    hinglish: "Akshavedamsha (D45) ek named varga hai; LIFE selected mapping dikhata hai, lekin personalized interpretation review nahi hui hai.",
  },
  60: {
    en: "Shashtiamsha (D60) is a fine division traditionally used for subtle analysis and is highly sensitive to birth-time precision.",
    hi: "षष्ट्यंश (D60) सूक्ष्म विश्लेषण में परंपरागत रूप से प्रयुक्त होता है और जन्म-समय की सटीकता के प्रति अत्यधिक संवेदनशील है।",
    hinglish: "Shashtiamsha (D60) subtle analysis mein traditionally use hota hai aur birth-time precision ke liye bahut sensitive hai.",
  },
};

const copy: Readonly<Record<Language, {
  explanation: string;
  unreviewed: string;
  customName: string;
  customPurpose: string;
  reviewRequired: string;
  unsupported: string;
  birthTime: string;
  unequalBirthTime: string;
  methodLabel: string;
  d1Calculation: string;
  dXCalculation: string;
  customCalculation: string;
  unequalCalculation: string;
  d1BirthTime: string;
}>> = {
  en: {
    explanation: "Chart explanation",
    unreviewed: "Traditional associations are context only. This panel does not apply a personalized outcome rule to this divisional chart; displayed signs and degrees are calculated placements, not predictions. Other chart-analysis panels have separate rule coverage.",
    customName: "custom cyclic division",
    customPurpose: "No chart-specific traditional life topic is asserted for D{division}; this custom factor is shown to explain its arithmetic mapping only.",
    reviewRequired: "Interpretation status: traditional use only; rule review required.",
    unsupported: "Interpretation status: no divisional-chart-specific personalized rule is implemented for this factor.",
    birthTime: "Birth-time sensitivity: each equal part spans about {width}° of a 30° sign. A time or location error can change time-sensitive inputs and therefore divisional placements; this is especially consequential for narrow divisions such as D60. Recorded time precision: {accuracy}.",
    unequalBirthTime: "Birth-time sensitivity: D30 uses sign-specific unequal parts, with its narrowest part 5°. A time or location error can change time-sensitive inputs and therefore placements. Recorded time precision: {accuracy}.",
    methodLabel: "Selected mapping",
    d1Calculation: "D1 shows the calculated planets and ascendant in the selected ayanamsa; houses use the selected house system. Selected settings: {ayanamsa}; {houseSystem}.",
    dXCalculation: "D{division} divides each 30° sign into {division} equal parts, about {width}° each. Planet and ascendant positions are mapped from full-precision sidereal longitudes using the selected ayanamsa ({ayanamsa}).",
    customCalculation: "D{division} divides each 30° sign into {division} equal parts. For source sign index s and zero-based part p, target sign index is (s × {division} + p) mod 12; the within-part fraction is preserved. Source longitudes use ayanamsa {ayanamsa}.",
    unequalCalculation: "D30 divides each sign into unequal, sign-specific parts. Planet and ascendant positions are mapped from full-precision sidereal longitudes using the selected ayanamsa ({ayanamsa}).",
    d1BirthTime: "Birth-time sensitivity: D1 ascendant and house assignments depend on recorded birth time and location. Recorded time precision: {accuracy}.",
  },
  hi: {
    explanation: "कुंडली की व्याख्या",
    unreviewed: "पारंपरिक संबंध केवल संदर्भ हैं। यह पैनल इस विभागीय कुंडली पर व्यक्तिगत परिणाम-नियम लागू नहीं करता; दिखाई गई राशियाँ और अंश गणना की स्थितियाँ हैं, भविष्यवाणियाँ नहीं। अन्य कुंडली-विश्लेषण पैनलों के नियम अलग हैं।",
    customName: "कस्टम चक्रीय विभाग",
    customPurpose: "D{division} के लिए कोई चार्ट-विशेष पारंपरिक जीवन-विषय घोषित नहीं किया गया है; यह कस्टम factor केवल इसकी अंकगणितीय मैपिंग समझाने के लिए दिखाया गया है।",
    reviewRequired: "व्याख्या स्थिति: केवल पारंपरिक उपयोग; नियम की समीक्षा आवश्यक।",
    unsupported: "व्याख्या स्थिति: इस factor के लिए कोई विभागीय-कुंडली-विशेष व्यक्तिगत नियम लागू नहीं है।",
    birthTime: "जन्म-समय संवेदनशीलता: प्रत्येक समान भाग 30° राशि में लगभग {width}° का है। समय या स्थान की त्रुटि समय-संवेदनशील इनपुट और इसलिए विभागीय स्थितियाँ बदल सकती है; D60 जैसे संकीर्ण भागों में इसका प्रभाव विशेष रूप से अधिक है। दर्ज समय-सटीकता: {accuracy}।",
    unequalBirthTime: "जन्म-समय संवेदनशीलता: D30 में राशि-विशेष असमान भाग हैं और सबसे छोटा भाग 5° का है। समय या स्थान की त्रुटि समय-संवेदनशील इनपुट और स्थितियाँ बदल सकती है। दर्ज समय-सटीकता: {accuracy}।",
    methodLabel: "चयनित मानचित्रण",
    d1Calculation: "D1 में चयनित अयनांश के अनुसार गणना किए गए ग्रह और लग्न दिखते हैं; भाव चयनित भाव-पद्धति से आते हैं। चयनित सेटिंग: {ayanamsa}; {houseSystem}।",
    dXCalculation: "D{division} प्रत्येक 30° राशि को {division} समान भागों में बाँटता है, लगभग {width}° प्रति भाग। ग्रह और लग्न की स्थितियाँ चयनित अयनांश ({ayanamsa}) के पूर्ण-सटीकता वाले निरयन देशांतर से मैप होती हैं।",
    customCalculation: "D{division} प्रत्येक 30° राशि को {division} समान भागों में बाँटता है। स्रोत राशि सूचकांक s और शून्य-आधारित भाग p के लिए लक्ष्य राशि सूचकांक (s × {division} + p) mod 12 है; भाग के भीतर अंश सुरक्षित रहता है। स्रोत देशांतर में {ayanamsa} अयनांश उपयोग होता है।",
    unequalCalculation: "D30 प्रत्येक राशि को असमान, राशि-विशेष भागों में बाँटता है। ग्रह और लग्न की स्थितियाँ चयनित अयनांश ({ayanamsa}) के पूर्ण-सटीकता वाले निरयन देशांतर से मैप होती हैं।",
    d1BirthTime: "जन्म-समय संवेदनशीलता: D1 लग्न और भाव-निर्धारण दर्ज समय और स्थान पर निर्भर हैं। दर्ज समय-सटीकता: {accuracy}।",
  },
  hinglish: {
    explanation: "Chart explanation",
    unreviewed: "Traditional associations sirf context hain. Yeh panel is divisional chart par personalized outcome rule apply nahi karta; displayed signs aur degrees calculated placements hain, predictions nahi. Dusre chart-analysis panels ke rules alag hain.",
    customName: "custom cyclic division",
    customPurpose: "D{division} ke liye koi chart-specific traditional life topic assert nahi kiya gaya; yeh custom factor sirf arithmetic mapping samjhane ke liye dikhaya hai.",
    reviewRequired: "Interpretation status: traditional use only; rule review required.",
    unsupported: "Interpretation status: is factor ke liye divisional-chart-specific personalized rule implemented nahi hai.",
    birthTime: "Birth-time sensitivity: har equal part 30° sign mein lagbhag {width}° cover karta hai. Time ya location error time-sensitive inputs aur divisional placements badal sakta hai; D60 jaise narrow divisions mein iska asar khaas hai. Recorded time precision: {accuracy}.",
    unequalBirthTime: "Birth-time sensitivity: D30 mein sign-specific unequal parts hain aur sabse narrow part 5° ka hai. Time ya location error time-sensitive inputs aur placements badal sakta hai. Recorded time precision: {accuracy}.",
    methodLabel: "Selected mapping",
    d1Calculation: "D1 selected ayanamsa ke calculated planets aur Lagna dikhata hai; houses selected house system se aate hain. Selected settings: {ayanamsa}; {houseSystem}.",
    dXCalculation: "D{division} har 30° sign ko {division} equal parts mein divide karta hai, lagbhag {width}° per part. Planet aur ascendant placements selected ayanamsa ({ayanamsa}) ke full-precision sidereal longitudes se map hote hain.",
    customCalculation: "D{division} har 30° sign ko {division} equal parts mein divide karta hai. Source sign index s aur zero-based part p ke liye target sign index (s × {division} + p) mod 12 hai; part ke andar ka fraction preserve hota hai. Source longitude par {ayanamsa} ayanamsa use hota hai.",
    unequalCalculation: "D30 har sign ko unequal, sign-specific parts mein divide karta hai. Planet aur ascendant placements selected ayanamsa ({ayanamsa}) ke full-precision sidereal longitudes se map hote hain.",
    d1BirthTime: "Birth-time sensitivity: D1 Lagna aur house assignments recorded birth time aur location par depend karte hain. Recorded time precision: {accuracy}.",
  },
};

export type DivisionalChartExplanation = {
  title: string;
  chartName: string;
  purpose: string;
  calculation: string;
  limitation: string;
  birthTimeSensitivity: string;
  interpretationStatusLabel: string;
  interpretationStatus: DivisionalChartMetadata["interpretationStatus"];
};

export function getDivisionalChartExplanation(
  metadata: DivisionalChartMetadata,
  language: Language,
  convention: string,
  birthTimeAccuracy: string,
  ayanamsa: string,
  houseSystem: string,
): DivisionalChartExplanation {
  const text = copy[language];
  const division = metadata.division;
  const width = division === 1 || division === 30 ? null : (30 / division).toFixed(4);
  const purpose = traditionalUses[division]?.[language]
    ?? text.customPurpose.replace("{division}", String(division));
  const calculation = division === 1
    ? text.d1Calculation.replace("{ayanamsa}", ayanamsa).replace("{houseSystem}", houseSystem)
    : metadata.conventionKind === "custom"
      ? text.customCalculation
        .replaceAll("{division}", String(division))
        .replace("{ayanamsa}", ayanamsa)
    : (division === 30 ? text.unequalCalculation : text.dXCalculation)
      .replaceAll("{division}", String(division))
      .replace("{width}", width ?? "")
      .replace("{ayanamsa}", ayanamsa);
  return {
    title: text.explanation,
    chartName: metadata.conventionKind === "custom" ? text.customName : metadata.name,
    purpose,
    calculation: `${calculation} ${text.methodLabel}: ${convention}`,
    limitation: text.unreviewed,
    birthTimeSensitivity: division === 1
      ? text.d1BirthTime.replace("{accuracy}", birthTimeAccuracy)
      : division === 30
        ? text.unequalBirthTime.replace("{accuracy}", birthTimeAccuracy)
        : text.birthTime.replace("{width}", width ?? "").replace("{accuracy}", birthTimeAccuracy),
    interpretationStatusLabel: metadata.interpretationStatus === "REVIEW_REQUIRED" ? text.reviewRequired : text.unsupported,
    interpretationStatus: metadata.interpretationStatus,
  };
}
