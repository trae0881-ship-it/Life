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

export default function PlanetaryStatusPanel({ natalPlanets, divisionalPlanets, language, title = "Planetary status" }: {
  natalPlanets: PlanetaryStatusInput[];
  divisionalPlanets: PlanetaryStatusInput[];
  language: Language;
  title?: string;
}) {
  const statuses = analyzePlanetaryStatuses(natalPlanets, divisionalPlanets);
  const t = (key: string) => translate(language, key);
  return <section className="planetary-status-panel" aria-label={title}>
    <div className="planetary-status-heading"><h3>{title}</h3></div>
    <div className="planetary-status-table table-scroll">
      <table><caption className="sr-only">{title}</caption><thead><tr><th>{t("results.body")}</th><th>{t("status.natalSign")}</th><th>{t("status.divisionalSign")}</th><th>{t("status.conditions")}</th></tr></thead>
        <tbody>{statuses.map((status) => {
          const conditions = [
            status.dignity === "Exalted" ? statusLabel.Exalted : status.dignity === "Debilitated" ? statusLabel.Debilitated : null,
            status.combust === true ? statusLabel.Combust : null,
            status.retrograde === true ? statusLabel.Retrograde : null,
            status.vargottama === true ? statusLabel.Vargottama : null,
          ].filter(Boolean);
          return <tr key={status.name}><td><b>{status.name}</b><small>{hindiNames[status.name] ?? "—"}</small></td><td>{status.natalSign ?? "—"}</td><td>{status.divisionalSign ?? "—"}</td><td>{conditions.length ? <div className="planetary-status-badges">{conditions.map((condition) => <span key={condition}>{condition}</span>)}</div> : <span className="status-neutral">{status.available ? t("status.noCondition") : "—"}</span>}</td></tr>;
        })}</tbody>
      </table>
    </div>
    <div className="planetary-status-cards">{statuses.map((status) => {
      const conditions = [
        status.dignity === "Exalted" ? statusLabel.Exalted : status.dignity === "Debilitated" ? statusLabel.Debilitated : null,
        status.combust === true ? statusLabel.Combust : null,
        status.retrograde === true ? statusLabel.Retrograde : null,
        status.vargottama === true ? statusLabel.Vargottama : null,
      ].filter(Boolean);
      return <details key={`card-${status.name}`}><summary>{status.name} · {hindiNames[status.name] ?? "—"} · {status.natalSign ?? "—"} → {status.divisionalSign ?? "—"}</summary><p>{conditions.join(" · ") || (status.available ? t("status.noCondition") : "—")}</p></details>;
    })}</div>
  </section>;
}
