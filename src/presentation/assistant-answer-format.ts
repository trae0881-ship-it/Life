import type { Language } from "./language.ts";
import type { MarriageTimingResult } from "./marriage-timing.ts";

export type FormattedMarriageAnswer = {
  explanation: string;
  timing: {
    status: "candidate_window" | "multiple_windows";
    startDate: string;
    endDate: string;
    formattedStart: string;
    formattedEnd: string;
    windows: { startDate: string; endDate: string; formattedStart: string; formattedEnd: string }[];
  } | null;
};

function formatDate(value: string, language: Language): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const locale = language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatMarriageAnswer(language: Language, result: MarriageTimingResult): FormattedMarriageAnswer {
  const startDate = result.earliest_date;
  const endDate = result.latest_date;
  if (startDate === null || endDate === null) {
    const explanation = language === "hi"
      ? `उपलब्ध गणना के आधार पर विवाह का विश्वसनीय समय निर्धारित नहीं किया जा सकता। कारण: ${result.explanation_hi}`
      : language === "hinglish"
        ? `Available calculation ke basis par marriage ka reliable time determine nahi ho sakta. Kaaran: ${result.explanation_hinglish}`
        : `The available calculation cannot determine a reliable marriage period. Reason: ${result.explanation_en}`;
    return { explanation, timing: null };
  }

  const formattedStart = formatDate(startDate, language);
  const formattedEnd = formatDate(endDate, language);
  const status = result.status === "multiple_windows" ? "multiple_windows" : "candidate_window";
  const sourceWindows = result.candidate_windows.length ? result.candidate_windows : [{
    start_date: startDate,
    end_date: endDate,
  }];
  const windows = sourceWindows.slice(0, 3).map((window) => ({
    startDate: window.start_date,
    endDate: window.end_date,
    formattedStart: formatDate(window.start_date, language),
    formattedEnd: formatDate(window.end_date, language),
  }));
  const separateWindows = windows.map((window) => `${window.formattedStart} – ${window.formattedEnd}`).join("; ");
  const explanation = language === "hi"
    ? result.status === "multiple_windows"
      ? `आपकी कुंडली में उपलब्ध पारंपरिक ज्योतिषीय गणना के अनुसार, विवाह की एक से अधिक अलग-अलग संभावित अवधियाँ मिली हैं। शुरुआती अवधियाँ: ${separateWindows}। ${result.candidate_windows.length > 3 ? "अन्य अवधियाँ भी हैं।" : ""} सबसे पहली शुरुआत से सबसे अंतिम समाप्ति तक का दायरा एक लगातार अवधि नहीं है।\n\nकारण: ${result.explanation_hi}`
      : `आपकी कुंडली में उपलब्ध पारंपरिक ज्योतिषीय गणना के अनुसार, विवाह का संभावित समय ${formattedStart} से ${formattedEnd} के बीच हो सकता है।\n\nकारण: ${result.explanation_hi}`
    : language === "hinglish"
      ? result.status === "multiple_windows"
        ? `Aapki kundli mein available traditional jyotish calculation ke anusaar, ek se zyada alag potential marriage periods mile hain. Shuru ke periods: ${separateWindows}. ${result.candidate_windows.length > 3 ? "Aur bhi periods hain." : ""} Sabse pehli start se sabse aakhri end tak ka range continuous period nahi hai.\n\nKaaran: ${result.explanation_hinglish}`
        : `Aapki kundli mein available traditional jyotish calculation ke anusaar, marriage ka potential period ${formattedStart} se ${formattedEnd} ke beech ho sakta hai.\n\nKaaran: ${result.explanation_hinglish}`
      : result.status === "multiple_windows"
        ? `The traditional calculation available in this chart found multiple separate possible marriage periods. Initial periods: ${separateWindows}.${result.candidate_windows.length > 3 ? " Other periods also qualify." : ""} The bounds from ${formattedStart} to ${formattedEnd} are not one continuous period.\n\nReason: ${result.explanation_en}`
        : `According to the traditional astrological calculation available in this chart, a potential marriage period may fall between ${formattedStart} and ${formattedEnd}.\n\nReason: ${result.explanation_en}`;
  return {
    explanation,
    timing: {
      startDate,
      endDate,
      status,
      formattedStart,
      formattedEnd,
      windows,
    },
  };
}
