"use client";

import { buildHouseAnalysis, listParashariAspects, planetsFromMoon, signHouseFromReference } from "@/calculation/house-analysis";
import { translate, type Language } from "@/presentation/language";
import KundliChart from "./KundliChart";

type Planet = { name: string; sign: string; house: number; longitude: number; motion: string };
type Chart = {
  input: { fullName: string | null; birthPlace: string | null };
  ascendant: { sign: string };
  houses: { house: number; sign: string; cuspLongitude: number }[];
  planets: Planet[];
  settings: { houseSystem: string };
  planetaryAspects: { convention: string; details: { name: string; house: number; aspectsHouses: number[]; aspectsPlanets: string[] }[] };
  provenance: { status: string };
};

const fmt = (longitude: number) => `${longitude.toFixed(4)}°`;

export default function HouseAnalysisSections({ chart, language }: { chart: Chart; language: Language }) {
  const t = (key: string) => translate(language, key);
  const moon = chart.planets.find((planet) => planet.name === "Moon");
  const moonPlacements = planetsFromMoon(chart.planets, moon?.sign);
  const houseAnalysis = buildHouseAnalysis(chart.houses, chart.planets, chart.settings.houseSystem);
  const aspects = listParashariAspects(chart.planetaryAspects, chart.planets, chart.ascendant.sign);
  const moonChart = moonPlacements ? { ...chart, planets: moonPlacements } : null;

  return <>
    <section className="card positions-card house-analysis-card" id="chandra-kundli">
      <div className="card-head"><div><div className="section-index">{t("house.moonChart")}</div><h2>{t("house.moonChart")}</h2></div><span className="table-count">{t("house.reference")}: {moon?.sign ?? t("overview.unavailable")}</span></div>
      <p className="result-guide">{t("house.moonDescription")}</p>
      {moonChart ? <KundliChart chart={moonChart} language={language} referenceSign={moon!.sign} chartTitle={t("house.moonChartLabel")} /> : <p className="empty-result" role="status">{t("house.moonUnavailable")}</p>}
      <div className="table-scroll"><table><caption className="sr-only">{t("house.moonTable")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("results.vargaSign")}</th><th>{t("house.moonHouse")}</th></tr></thead><tbody>{moonPlacements?.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td>{planet.house}</td></tr>)}</tbody></table></div>
      <p className="term-note">{t("house.profileContext")}: {chart.input.fullName || chart.input.birthPlace || t("results.profile")} · {t("house.calculationStatus")}: {chart.provenance.status}</p>
    </section>

    <section className="card positions-card house-analysis-card" id="bhava-chalit">
      <div className="card-head"><div><div className="section-index">{t("house.bhavaChalit")}</div><h2>{t("house.bhavaChalit")}</h2></div><span className="table-count">{chart.settings.houseSystem}</span></div>
      <p className="result-guide">{t("house.chalitDescription")}</p>
      {houseAnalysis ? <>
        <div className="bhava-house-grid">{houseAnalysis.houses.map((house) => <article className="bhava-house-card" key={house.house}><small>{t("results.house")} {house.house}</small><b>{house.sign}</b><span>{t("house.cusp")}: {fmt(house.cuspLongitude)}</span><span>{t("house.midpoint")}: {fmt(house.intervalMidpointLongitude)}</span><p>{house.planets.length ? house.planets.join(" · ") : t("house.noPlanets")}</p></article>)}</div>
        <div className="table-scroll"><table><caption className="sr-only">{t("house.chalitTable")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("results.vargaSign")}</th><th>{t("house.signHouse")}</th><th>{t("house.bhavaHouse")}</th><th>{t("house.cusp")}</th></tr></thead><tbody>{chart.planets.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td>{signHouseFromReference(planet.sign, chart.ascendant.sign) ?? "—"}</td><td>{planet.house}</td><td>{fmt(houseAnalysis.houses[planet.house - 1].cuspLongitude)}</td></tr>)}</tbody></table></div>
      </> : <p className="empty-result" role="status">{t("house.chalitUnavailable")}</p>}
      <p className="term-note">{t("house.midpointLimitation")} · {t("house.profileContext")}: {chart.input.fullName || chart.input.birthPlace || t("results.profile")} · {t("house.calculationStatus")}: {chart.provenance.status}</p>
    </section>

    <section className="card positions-card house-analysis-card" id="bhava-madhya-drishti">
      <div className="card-head"><div><div className="section-index">{t("house.midpointDrishti")}</div><h2>{t("house.midpointDrishti")}</h2></div><span className="table-count">{t("house.calculationStatus")}: {chart.provenance.status}</span></div>
      <p className="result-guide">{t("house.midpointDescription")}</p>
      {houseAnalysis && <div className="table-scroll"><table><caption className="sr-only">{t("house.midpointDrishti")}</caption><thead><tr><th>{t("results.house")}</th><th>{t("house.cusp")}</th><th>{t("house.midpoint")}</th><th>{t("house.occupants")}</th></tr></thead><tbody>{houseAnalysis.houses.map((house) => <tr key={house.house}><td>{house.house} · {house.sign}</td><td>{fmt(house.cuspLongitude)}</td><td>{fmt(house.intervalMidpointLongitude)}</td><td>{house.planets.join(" · ") || "—"}</td></tr>)}</tbody></table></div>}
      <h3>{t("house.parashariDrishti")}</h3>
      <p className="term-note">{chart.planetaryAspects.convention}</p>
      {aspects ? <div className="table-scroll"><table><caption className="sr-only">{t("house.parashariDrishti")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("house.sourceHouse")}</th><th>{t("house.targetHouse")}</th><th>{t("house.aspectType")}</th><th>{t("house.targetPlanets")}</th></tr></thead><tbody>{aspects.map((aspect, index) => <tr key={`${aspect.planet}-${aspect.targetHouse}-${index}`}><td>{aspect.planet}</td><td>{aspect.sourceHouse}</td><td>{aspect.targetHouse}</td><td>{t("house.aspectOffset")} {aspect.aspectOffset} {t("house.fromSource")}</td><td>{aspect.targetPlanets.join(" · ") || "—"}</td></tr>)}</tbody></table></div> : <p className="empty-result" role="status">{t("house.aspectsUnavailable")}</p>}
      <p className="term-note">{t("house.aspectLimit")} · {t("house.profileContext")}: {chart.input.fullName || chart.input.birthPlace || t("results.profile")}</p>
    </section>
  </>;
}
