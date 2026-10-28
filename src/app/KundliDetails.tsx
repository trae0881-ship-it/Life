"use client";

import { getKundliDetails } from "@/presentation/kundli-details";
import { hasTranslation, translate, type Language } from "@/presentation/language";

export default function KundliDetails({ result, language }: { result: unknown; language: Language }) {
  const t = (key: string) => translate(language, key);

  return <section id="kundli-details" className="kundli-details" aria-labelledby="kundli-details-title">
    <h3 id="kundli-details-title">{t("kundliDetails.title")}</h3>
    <dl className="kundli-details-grid">
      {getKundliDetails(result).map((detail) => {
        const balance = detail.id === "dashaBalance" && detail.secondary
          ? detail.secondary.split("|")
          : null;
        const classificationKey = detail.value && ["yoni", "gana", "nadi", "varna"].includes(detail.id)
          ? `kundliDetails.value.${detail.id}.${detail.value}`
          : null;
        const unavailableValue = detail.id === "ishtkaal" || detail.id === "nakshatraPaya"
          ? t("kundliDetails.conventionUnavailable")
          : detail.id === "sunrise"
            ? t("kundliDetails.noEvent")
            : t("kundliDetails.notProvided");
        const value = detail.value
          ? detail.id === "nakshatraPada"
            ? `${t("kundliDetails.pada")} ${detail.value}`
            : classificationKey && hasTranslation(language, classificationKey)
              ? t(classificationKey)
              : detail.value
          : detail.source === "unavailable" ? unavailableValue : t("kundliDetails.notProvided");
        return <div className="kundli-detail" key={detail.id}>
          <dt>{t(`kundliDetails.field.${detail.id}`)} <small>{t(`kundliDetails.source.${detail.source}`)}</small></dt>
          <dd>{detail.id === "dashaBalance" && balance && detail.value
            ? <>{detail.value} · {balance[0]} {t("kundliDetails.years")}<small>{t("kundliDetails.dashaConvention")} · {balance[1]} {t("kundliDetails.dayYear")}</small></>
            : <>{value}{detail.secondary && <small>{detail.secondary}</small>}</>}
          </dd>
        </div>;
      })}
    </dl>
    <p>{t("kundliDetails.methodNote")}</p>
  </section>;
}
