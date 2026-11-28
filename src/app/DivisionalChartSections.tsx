"use client";

import { hasUsableChartProvenance } from "@/presentation/chart-provenance";
import { translate, type Language } from "@/presentation/language";
import { rowsForDivision, type DivisionalRow } from "@/presentation/divisional-chart";
import { divisionalChartMetadataById } from "@/calculation/divisional-metadata";
import DivisionalTimeline from "./DivisionalTimeline";

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

export default function DivisionalChartSections({ chart, language }: { chart: Chart | null; language: Language }) {
  const t = (key: string) => translate(language, key);
  if (!chart || !hasUsableChartProvenance(chart)) {
    return <section className="card divisional-empty" id="divisional-charts" role="status">
      <h2>{t("app.divisionalCharts")}</h2>
      <p>{t("results.chartUnavailable")}</p>
    </section>;
  }

  return <div className="divisional-sections" id="divisional-charts">
    <nav className="divisional-navigation" aria-label={t("results.divisionalNavigation")}>
      {divisionalChartNumbers.map((division) => <a href={`#division-D${division}`} key={division}>D{division}</a>)}
    </nav>
    {divisionalChartNumbers.map((division) => {
      const metadata = divisionalChartMetadataById[`D${division}`];
      const rows = rowsForDivision(chart, division);
      const chartName = metadata.conventionKind === "custom" ? `D${division}` : metadata.name;
      return <section className="card divisional-section" id={`division-D${division}`} aria-labelledby={`division-title-D${division}`} key={`${chart.provenance.resultHash}-D${division}`}>
        <div className="card-head">
          <div>
            <div className="section-index">{t("app.divisionalCharts")}</div>
            <h2 id={`division-title-D${division}`}>{division === 1 ? t("app.d1Rashi") : `D${division} · ${chartName}`}</h2>
          </div>
          <span className="table-count">D{division}</span>
        </div>
        {rows.length ? <div className="table-scroll"><table>
          <caption className="sr-only">D{division} planetary placements</caption>
          <thead><tr><th>{t("results.body")}</th><th>{t("results.sign")}</th>{division === 1 && <th>{t("results.house")}</th>}</tr></thead>
          <tbody>{rows.map((row) => <tr key={`${division}-${row.name}`}><td>{row.name}</td><td>{row.sign}</td>{division === 1 && <td>{row.house ?? "—"}</td>}</tr>)}</tbody>
        </table></div> : <p className="receipt-note" role="status">{t("results.chartUnavailable")}</p>}
        {division === 1 && <DivisionalTimeline
          chart={chart}
          dasha={chart.vimshottariDasha}
          metadata={metadata}
          chartName={chartName}
          language={language}
        />}
      </section>;
    })}
  </div>;
}
