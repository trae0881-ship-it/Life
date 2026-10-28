"use client";

import { analyzePlanetaryStatuses, type PlanetaryStatusInput } from "@/calculation/planetary-status";
import { translate, type Language } from "@/presentation/language";

const hindiNames: Record<string, string> = {
  Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि",
  Uranus: "अरुण", Neptune: "वरुण", Pluto: "यम", "Mean node": "राहु", "True node": "राहु", "Mean Ketu": "केतु", "True Ketu": "केतु",
};

const statusLabel: Record<string, string> = {
  Exalted: "उच्च / Exalted",
  Debilitated: "नीच / Debilitated",
  Combust: "अस्त / Combust",
  Retrograde: "वक्री / Retrograde",
  Vargottama: "वर्गोत्तम / Vargottama",
};

function degrees(value: number | null) {
  return value === null ? "—" : `${value.toFixed(4)}°`;
}

export default function PlanetaryStatusPanel({ natalPlanets, divisionalPlanets, language, title = "Planetary status", calculationStatus }: {
  natalPlanets: PlanetaryStatusInput[];
  divisionalPlanets: PlanetaryStatusInput[];
  language: Language;
  title?: string;
  calculationStatus?: string;
}) {
  const statuses = analyzePlanetaryStatuses(natalPlanets, divisionalPlanets);
  const t = (key: string) => translate(language, key);
  return <section className="planetary-status-panel" aria-label={title}>
    <div className="planetary-status-heading"><h3>{title}</h3><span>{t("status.calculatedNotice")} · {calculationStatus ?? t("status.notAvailable")}</span></div>
    <div className="planetary-status-table table-scroll">
      <table><caption className="sr-only">{title}</caption><thead><tr><th>{t("results.body")}</th><th>{t("status.natalSign")}</th><th>{t("status.divisionalSign")}</th><th>{t("status.conditions")}</th></tr></thead>
        <tbody>{statuses.map((status) => {
          const conditions = [
            status.dignity === "Exalted" ? statusLabel.Exalted : status.dignity === "Debilitated" ? statusLabel.Debilitated : null,
            status.combust === true ? statusLabel.Combust : null,
            status.retrograde === true ? statusLabel.Retrograde : null,
            status.vargottama === true ? statusLabel.Vargottama : null,
          ].filter(Boolean);
          return <tr key={status.name}><td><b>{status.name}</b><small>{hindiNames[status.name] ?? "—"}</small></td><td>{status.natalSign ?? "—"}<small>{degrees(status.natalDegrees)}</small></td><td>{status.divisionalSign ?? "—"}<small>{degrees(status.divisionalDegrees)}</small></td><td>{conditions.length ? <div className="planetary-status-badges">{conditions.map((condition) => <span key={condition}>{condition}</span>)}</div> : <span className="status-neutral">{status.available ? t("status.noCondition") : t("status.notAvailable")}</span>}<details><summary>{t("status.explanation")}</summary><p>{status.dignity ? `${status.dignity}; ` : ""}{status.combust === null ? t("status.combustUnavailable") : status.combust ? t("status.combustApplied") : t("status.notCombust")} {status.retrograde === null ? t("status.motionUnavailable") : status.retrograde ? t("status.retrogradeApplied") : t("status.directApplied")} {status.vargottama === null ? t("status.vargottamaUnavailable") : status.vargottama ? t("status.vargottamaApplied") : t("status.vargottamaNotApplied")}</p>{status.limitation && <p>{t("status.inputUnavailable")}</p>}</details></td></tr>;
        })}</tbody>
      </table>
    </div>
    <div className="planetary-status-cards">{statuses.map((status) => <details key={`card-${status.name}`}><summary>{status.name} · {hindiNames[status.name] ?? "—"}</summary><p>{status.natalSign ?? "—"} {degrees(status.natalDegrees)} → {status.divisionalSign ?? "—"} {degrees(status.divisionalDegrees)}</p></details>)}</div>
  </section>;
}
