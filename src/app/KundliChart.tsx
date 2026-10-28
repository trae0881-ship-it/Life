"use client";

import { useState } from "react";
import { buildRashiLayout } from "@/presentation/kundli-layout";
import { translate, type Language } from "@/presentation/language";
import { resultCopy } from "@/presentation/result-copy";

type Planet = { name: string; sign: string; house: number; motion: string };
type Chart = {
  ascendant: { sign: string };
  planets: Planet[];
  settings: { houseSystem: string };
};

const shortNames: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa",
  Uranus: "Ur", Neptune: "Ne", Pluto: "Pl", "Mean node": "Rm", "True node": "Rt",
  "Mean Ketu": "Km", "True Ketu": "Kt", Rahu: "Ra", Ketu: "Ke",
};
const northCenters = [
  [200, 61], [102, 105], [61, 200], [102, 295], [200, 339], [298, 295],
  [339, 200], [298, 105], [200, 145], [145, 200], [200, 255], [255, 200],
] as const;
const southSignSlots: (string | null)[] = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Pisces", null, null, "Leo",
  "Aquarius", null, null, "Virgo",
  "Capricorn", "Sagittarius", "Scorpio", "Libra",
];

export default function KundliChart({ chart, language, referenceSign, chartTitle }: { chart: Chart; language: Language; referenceSign?: string; chartTitle?: string }) {
  const [layout, setLayout] = useState<"north" | "south">("north");
  const t = (key: string) => translate(language, key);
  const r = (key: Parameters<typeof resultCopy>[1]) => resultCopy(language, key);
  const orientationSign = referenceSign ?? chart.ascendant.sign;
  const rashiPlacements = buildRashiLayout(chart.planets, orientationSign);
  const signsByHouse = rashiPlacements.slice().sort((a, b) => a.house - b.house);
  const placementBySign = new Map<string, (typeof rashiPlacements)[number]>(rashiPlacements.map((placement) => [placement.sign, placement]));

  return <div className="kundli-panel">
    <div className="kundli-controls" role="group" aria-label={t("chart.layout")}>
      <button type="button" aria-pressed={layout === "north"} onClick={() => setLayout("north")}>{t("chart.north")}</button>
      <button type="button" aria-pressed={layout === "south"} onClick={() => setLayout("south")}>{t("chart.south")}</button>
    </div>
    <div className="kundli-wrap">
      {layout === "north" ? <svg viewBox="0 0 400 400" className="kundli" role="img" aria-label={`${t("chart.northAria")}, ${orientationSign} ${chartTitle ?? t("chart.rising")}`}>
        <rect x="5" y="5" width="390" height="390" fill="#fbf8f1" stroke="#cbbd9f" strokeWidth="1.5" />
        <path d="M5 5L395 395M395 5L5 395M200 5L395 200L200 395L5 200Z M5 5L200 200L395 5M5 395L200 200L395 395" fill="none" stroke="#cbbd9f" strokeWidth="1.5" />
        {signsByHouse.map(({ sign, house, planets: occupants, isLagna }, index) => {
          const [x, y] = northCenters[index];
          return <g key={house} aria-label={`${sign}, ${r("results.house")} ${house}${occupants.length ? `, ${occupants.map((planet) => planet.name).join(", ")}` : `, ${t("chart.empty")}`}`}>
            <text x={x} y={y - 19} textAnchor="middle" className="chart-sign">{sign.slice(0, 3).toUpperCase()}</text>
            <text x={x} y={y} textAnchor="middle" className="chart-house">{occupants.map((planet) => `${shortNames[planet.name] ?? planet.name.slice(0, 2)}${planet.motion === "Retrograde" ? "℞" : ""}`).join(" · ") || "—"}</text>
            <text x={x} y={y + 17} textAnchor="middle" className="chart-num">{house}{isLagna ? ` · ${referenceSign ? t("house.reference") : "L"}` : ""}</text>
          </g>;
        })}
        <text x="200" y="194" textAnchor="middle" className="chart-center">LIFE</text>
        <text x="200" y="211" textAnchor="middle" className="chart-center-small">{chartTitle ?? "D1 RĀŚI"}</text>
      </svg> : <div className="south-kundli" role="img" aria-label={`${t("chart.southAria")}, ${orientationSign} ${referenceSign ? t("house.reference") : t("chart.rising")}`}>
        {southSignSlots.map((sign, index) => {
          if (!sign) return <div aria-hidden="true" className="south-cell south-empty" key={`empty-${index}`} />;
          const placement = placementBySign.get(sign)!;
          const { planets: occupants, house, isLagna } = placement;
          const referenceLabel = referenceSign ? t("house.reference") : "Lagna";
          const ariaLabel = `${sign}, ${r("results.house")} ${house}${isLagna ? `, ${referenceLabel}` : ""}${occupants.length ? `, ${occupants.map((planet) => planet.name).join(", ")}` : `, ${t("chart.empty")}`}`;
          return <div className={`south-cell${isLagna ? " lagna-cell" : ""}`} key={sign} aria-label={ariaLabel}>
            <small>{sign}</small><b>H{house}{isLagna ? ` · ${referenceSign ? t("house.reference") : "L"}` : ""}</b>
            <span>{occupants.map((planet) => `${shortNames[planet.name] ?? planet.name.slice(0, 2)}${planet.motion === "Retrograde" ? "℞" : ""}`).join(" · ") || "—"}</span>
          </div>;
        })}
        <div className="south-center"><b>{orientationSign} {referenceSign ? t("house.reference") : t("chart.rising")}</b><span>{chartTitle ?? "D1 RĀŚI"}</span><small>{t("chart.south")} · {t("chart.fixedLayout")}</small></div>
      </div>}
    </div>
    <div className="chart-legend" aria-label={t("chart.planetLegend")}>
      <span><i className="legend-dot lagna" /> {referenceSign ? t("house.referenceLegend") : t("chart.lagnaLegend")}</span>
      <span><i className="legend-dot planet" /> {t("chart.planetLegend")}</span>
      <span>℞ {t("chart.retrogradeLegend")}</span>
      {referenceSign ? <span>{t("chart.moonHouseLegend")}</span> : <span>{chart.settings.houseSystem} {t("chart.cuspsSeparate")}</span>}
    </div>
    <div className="kundli-planet-legend">{chart.planets.map((planet) => <span key={planet.name}><b>{shortNames[planet.name] ?? planet.name.slice(0, 2)}</b> {planet.name}{planet.motion === "Retrograde" ? " ℞" : ""}</span>)}</div>
    <p className="receipt-note">{referenceSign ? t("chart.moonSamePlacements") : t("chart.samePlacements")}</p>
    <p className="term-note">{referenceSign ? t("chart.moonReferenceGuide") : r("results.houseSystemGuide")}</p>
  </div>;
}
