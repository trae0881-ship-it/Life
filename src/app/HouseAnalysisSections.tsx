"use client";

import { buildHouseAnalysis, listParashariAspects, planetsFromMoon, signHouseFromReference } from "@/calculation/house-analysis";
import { translate, type Language } from "@/presentation/language";
import KundliChart from "./KundliChart";
import KundliSectionQuestions from "./KundliSectionQuestions";

type Planet = { name: string; sign: string; house: number; longitude: number; motion: string };
type Chart = {
  input: { fullName: string | null; birthPlace: string | null };
  ascendant: { sign: string };
  houses: { house: number; sign: string; cuspLongitude: number }[];
  planets: Planet[];
  settings: { houseSystem: string };
  planetaryAspects: { convention: string; details: { name: string; house: number; aspectsHouses: number[]; aspectsPlanets: string[] }[] };
};

export default function HouseAnalysisSections({ chart, language, savedChartId }: { chart: Chart; language: Language; savedChartId: string | null }) {
  const t = (key: string) => translate(language, key);
  const moon = chart.planets.find((planet) => planet.name === "Moon");
  const moonPlacements = planetsFromMoon(chart.planets, moon?.sign);
  const houseAnalysis = buildHouseAnalysis(chart.houses, chart.planets, chart.settings.houseSystem);
  const aspects = listParashariAspects(chart.planetaryAspects, chart.planets, chart.ascendant.sign);
  const moonChart = moonPlacements ? { ...chart, planets: moonPlacements } : null;

  return <>
    <section className="card positions-card house-analysis-card" id="chandra-kundli">
      <div className="card-head"><div><div className="section-index">{t("house.moonChart")}</div><h2>{t("house.moonChart")}</h2></div><span className="table-count">{t("house.reference")}: {moon?.sign ?? t("overview.unavailable")}</span></div>
      {moonChart ? <KundliChart chart={moonChart} language={language} referenceSign={moon!.sign} chartTitle={t("house.moonChartLabel")} /> : <p className="empty-result" role="status">{t("house.moonUnavailable")}</p>}
      <div className="table-scroll"><table><caption className="sr-only">{t("house.moonTable")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("results.sign")}</th><th>{t("house.moonHouse")}</th></tr></thead><tbody>{moonPlacements?.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td>{planet.house}</td></tr>)}</tbody></table></div>
      {moonPlacements && <KundliSectionQuestions savedChartId={savedChartId} sectionKey="chandra-kundli" sectionLabel={t("house.moonChart")} language={language} />}
    </section>

    <section className="card positions-card house-analysis-card" id="bhava-chalit">
      <div className="card-head"><div><div className="section-index">{t("house.bhavaChalit")}</div><h2>{t("house.bhavaChalit")}</h2></div></div>
      {houseAnalysis ? <>
        <div className="bhava-house-grid">{houseAnalysis.houses.map((house) => <article className="bhava-house-card" key={house.house}><small>{t("results.house")} {house.house}</small><b>{house.sign}</b><p>{house.planets.length ? house.planets.join(" · ") : "—"}</p></article>)}</div>
        <div className="table-scroll"><table><caption className="sr-only">{t("house.chalitTable")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("results.sign")}</th><th>{t("house.signHouse")}</th><th>{t("house.bhavaHouse")}</th></tr></thead><tbody>{chart.planets.map((planet) => <tr key={planet.name}><td>{planet.name}</td><td>{planet.sign}</td><td>{signHouseFromReference(planet.sign, chart.ascendant.sign) ?? "—"}</td><td>{planet.house}</td></tr>)}</tbody></table></div>
      </> : <p className="empty-result" role="status">{t("house.chalitUnavailable")}</p>}
      {houseAnalysis && <KundliSectionQuestions savedChartId={savedChartId} sectionKey="bhava-chalit" sectionLabel={t("house.bhavaChalit")} language={language} />}
    </section>

    <section className="card positions-card house-analysis-card" id="planetary-aspects">
      <div className="card-head"><div><div className="section-index">{t("house.parashariDrishti")}</div><h2>{t("house.parashariDrishti")}</h2></div></div>
      {aspects ? <div className="table-scroll"><table><caption className="sr-only">{t("house.parashariDrishti")}</caption><thead><tr><th>{t("results.body")}</th><th>{t("house.sourceHouse")}</th><th>{t("house.targetHouse")}</th><th>{t("house.targetPlanets")}</th></tr></thead><tbody>{aspects.map((aspect) => <tr key={`${aspect.planet}-${aspect.targetHouse}`}><td>{aspect.planet}</td><td>{aspect.sourceHouse}</td><td>{aspect.targetHouse}</td><td>{aspect.targetPlanets.join(" · ") || "—"}</td></tr>)}</tbody></table></div> : <p className="empty-result" role="status">{t("house.aspectsUnavailable")}</p>}
      {aspects && <KundliSectionQuestions savedChartId={savedChartId} sectionKey="planetary-aspects" sectionLabel={t("house.parashariDrishti")} language={language} />}
    </section>
  </>;
}
