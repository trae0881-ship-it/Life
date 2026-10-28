"use client";

import { hasUsableChartProvenance } from "@/presentation/chart-provenance";
import { translate, type Language } from "@/presentation/language";
import { getDivisionalChartExplanation } from "@/presentation/divisional-chart-explanations";
import { rowsForDivision, type DivisionalRow } from "@/presentation/divisional-chart";
import { divisionalChartMetadataById } from "@/calculation/divisional-metadata";
import DivisionalTimeline from "./DivisionalTimeline";
import PlanetaryStatusPanel from "./PlanetaryStatusPanel";

type Chart = {
  input: {
    fullName: string | null;
    birthPlace: string | null;
    birthTimeAccuracy: string;
    localDate: string;
    localTime: string;
    timeZone: string;
    utc: string;
    resolvedOffset: string;
    latitude: number;
    longitude: number;
  };
  settings: {
    ayanamsa: string;
    houseSystem: string;
    node: string;
    ruleSetVersion: string;
  };
  ascendant: { sign: string; longitude: number };
  houses: { house: number; sign: string; cuspLongitude: number }[];
  planets: { name: string; sign: string; house: number; longitude: number; motion: string }[];
  planetaryDignity: { name: string; dignity: string; sign: string }[];
  divisionalCharts: Record<string, DivisionalRow[]>;
  vimshottariDasha?: {
    mahadashas?: {
      lord: string;
      start: string;
      end: string;
      antardashas?: {
        lord: string;
        start: string;
        end: string;
        pratyantardashas?: { lord: string; start: string; end: string }[];
      }[];
    }[];
  };
  provenance: { status: string; engineVersion: string; resultHash: string; limitations: string[] };
};

export const divisionalChartNumbers = Array.from({ length: 60 }, (_, index) => index + 1);
const formatDegrees = (value: number) => `${value.toFixed(4)}°`;
const accuracyTranslationKeys: Readonly<Record<string, string>> = {
  exact: "form.accuracy.exact",
  "within-5-minutes": "form.accuracy.5",
  "within-15-minutes": "form.accuracy.15",
  "within-1-hour": "form.accuracy.hour",
  approximate: "form.accuracy.approximate",
  unspecified: "form.accuracy.unspecified",
};

function BirthDetailsReport({ chart, division, convention, language }: { chart: Chart; division: number; convention: string; language: Language }) {
  const provenanceValid = hasUsableChartProvenance(chart);
  const t = (key: string) => translate(language, key);
  const accuracy = t(accuracyTranslationKeys[chart.input.birthTimeAccuracy] ?? "form.accuracy.unspecified");
  return <div className="divisional-birth-report">
    <div className="card-head">
      <div>
        <div className="section-index">{t("results.birthDetails")}</div>
        <h3>{t("results.birthDetails")} · D{division}</h3>
      </div>
      <span className={`verification-tag${provenanceValid ? " verified" : ""}`} role="status">
        {provenanceValid ? t("results.provenanceVerified") : t("results.provenanceUnavailable")}
      </span>
    </div>
    <dl className="divisional-details">
      <div><dt>{t("results.profile")}</dt><dd>{chart.input.fullName || chart.input.birthPlace || t("results.unknown")}</dd></div>
      <div><dt>{t("results.dateOfBirth")}</dt><dd>{chart.input.localDate}</dd></div>
      <div><dt>{t("results.birthTime")}</dt><dd>{chart.input.localTime} · {accuracy}</dd></div>
      <div><dt>{t("results.birthPlace")}</dt><dd>{chart.input.birthPlace || `${chart.input.latitude}, ${chart.input.longitude}`}</dd></div>
      <div><dt>{t("results.timeZone")}</dt><dd>{chart.input.timeZone} ({chart.input.resolvedOffset})</dd></div>
      <div><dt>{t("results.settings")}</dt><dd>{chart.settings.ayanamsa} · {chart.settings.houseSystem} · {chart.settings.node}</dd></div>
      <div><dt>{t("results.chartConvention")}</dt><dd>{convention}</dd></div>
    </dl>
    <p className="receipt-note">{t("results.vargaNotIndependentlyVerified")}</p>
  </div>;
}

export default function DivisionalChartSections({ chart, language }: { chart: Chart | null; language: Language }) {
  const t = (key: string) => translate(language, key);
  if (!chart || !hasUsableChartProvenance(chart)) {
    return <section className="card divisional-empty" id="divisional-charts" role="status">
      <h2>{t("app.divisionalCharts")}</h2>
      <p>{t("results.vargaUnavailable")}</p>
    </section>;
  }
  return <div className="divisional-sections" id="divisional-charts">
    <nav className="divisional-navigation" aria-label={t("results.divisionalNavigation")}>
      {divisionalChartNumbers.map((division) => <a href={`#division-D${division}`} key={division}>D{division}</a>)}
    </nav>
    <p className="result-guide divisional-timeline-limit">{t("timeline.noRule")}</p>
    <p className="result-guide divisional-timeline-limit">{t(chart.vimshottariDasha?.mahadashas?.length ? "timeline.dashaSource" : "timeline.dashaUnavailable")}</p>
    {divisionalChartNumbers.map((division) => {
      const metadata = divisionalChartMetadataById[`D${division}`];
      const rows = rowsForDivision(chart, division);
      const convention = rows[0]?.convention ?? "No divisional calculation available";
      const explanation = getDivisionalChartExplanation(
        metadata,
        language,
        convention,
        t(accuracyTranslationKeys[chart.input.birthTimeAccuracy] ?? "form.accuracy.unspecified"),
        chart.settings.ayanamsa,
        chart.settings.houseSystem,
      );
      return <section className="card divisional-section" id={`division-D${division}`} aria-labelledby={`division-title-D${division}`} key={`${chart.provenance.resultHash}-D${division}`}>
        <div className="card-head">
          <div>
            <div className="section-index">{t("app.divisionalCharts")}</div>
            <h2 id={`division-title-D${division}`}>D{division} · {division === 1 ? t("app.d1Rashi") : explanation.chartName}</h2>
          </div>
          <span className="table-count">D{division}</span>
        </div>
        <section className="divisional-explanation" aria-labelledby={`division-explanation-D${division}`}>
          <h3 id={`division-explanation-D${division}`}>{explanation.title}</h3>
          <p>{explanation.purpose}</p>
          <p><strong>{t("results.chartFactsFirst")} </strong>{explanation.calculation}</p>
          <p>{explanation.limitation}</p>
          <p><strong>{explanation.interpretationStatusLabel}</strong></p>
          <p>{explanation.birthTimeSensitivity}</p>
        </section>
        {rows.length ? <div className="table-scroll"><table>
          <caption className="sr-only">D{division} calculated placements</caption>
          <thead><tr><th>{t("results.body")}</th><th>{t("results.vargaSign")}</th><th>{t("results.position")}</th><th>{t("results.part")}</th><th>{t("results.house")}</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={`${division}-${row.name}`}><td>{row.name}</td><td>{row.sign}</td><td className="mono">{formatDegrees(row.degreesInSign)}</td><td>{row.segment}</td><td>{division === 1 ? row.house ?? "—" : "—"}</td></tr>)}</tbody>
        </table></div> : <p className="receipt-note" role="status">{t("results.vargaUnavailable")}</p>}
        <p className="term-note">{convention}</p>
        {metadata.conventionKind === "custom" && <p className="custom-convention-note">{t("results.customConvention")}</p>}
        <PlanetaryStatusPanel
          natalPlanets={chart.planets}
          divisionalPlanets={rows.filter((row) => row.name !== "Lagna").map((row) => ({ name: row.name, longitude: row.longitude, sign: row.sign, degreesInSign: row.degreesInSign }))}
          language={language}
          title={`${t("status.title")} · D${division}`}
          calculationStatus={chart.provenance.status}
        />
        <BirthDetailsReport chart={chart} division={division} convention={convention} language={language} />
        <DivisionalTimeline chart={chart} dasha={chart.vimshottariDasha} metadata={metadata} convention={convention} purpose={explanation.purpose} chartName={explanation.chartName} language={language} />
      </section>;
    })}
  </div>;
}
