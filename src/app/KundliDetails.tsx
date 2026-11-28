"use client";

import { getKundliDetails } from "@/presentation/kundli-details";
import { hasTranslation, translate, type Language } from "@/presentation/language";
import KundliSectionQuestions from "./KundliSectionQuestions";

export default function KundliDetails({ result, language, savedChartId = null }: { result: unknown; language: Language; savedChartId?: string | null }) {
  const t = (key: string) => translate(language, key);
  const details = getKundliDetails(result).filter((detail) =>
    !["naam", "ishtkaal", "sunrise", "nakshatraPaya"].includes(detail.id),
  );

  return <section id="kundli-details" className="kundli-details" aria-labelledby="kundli-details-title">
    <h3 id="kundli-details-title">{t("kundliDetails.title")}</h3>
    <dl className="kundli-details-grid">
      {details.map((detail) => {
        const classificationKey = detail.value && ["yoni", "gana", "nadi", "varna"].includes(detail.id)
          ? `kundliDetails.value.${detail.id}.${detail.value}`
          : null;
        const value = detail.value
          ? detail.id === "nakshatraPada"
            ? `${t("kundliDetails.pada")} ${detail.value}`
            : classificationKey && hasTranslation(language, classificationKey)
              ? t(classificationKey)
              : detail.value
          : t("kundliDetails.notProvided");
        return <div className="kundli-detail" key={detail.id}>
          <dt>{t(`kundliDetails.field.${detail.id}`)}</dt>
          <dd>{detail.id === "dashaBalance" && detail.secondary && detail.value
            ? <>{detail.value} · {detail.secondary} {t("kundliDetails.years")}</>
            : <>{value}{detail.secondary && <small>{detail.secondary}</small>}</>}
          </dd>
        </div>;
      })}
    </dl>
    <KundliSectionQuestions savedChartId={savedChartId} sectionKey="nakshatra" sectionLabel={t("kundliDetails.title")} language={language} />
  </section>;
}
