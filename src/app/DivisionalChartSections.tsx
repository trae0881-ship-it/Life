"use client";

import { hasUsableChartProvenance } from "@/presentation/chart-provenance";
import { translate, type Language } from "@/presentation/language";
import { rowsForDivision, type DivisionalRow } from "@/presentation/divisional-chart";
import { divisionalChartMetadataById } from "@/calculation/divisional-metadata";
import DivisionalTimeline from "./DivisionalTimeline";
import KundliSectionQuestions from "./KundliSectionQuestions";

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

export default function DivisionalChartSections({ chart, language, savedChartId = null }: { chart: Chart | null; language: Language; savedChartId?: string | null }) {
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
      const chartName = division === 1 || metadata.conventionKind === "named" ? metadata.name : `D${division}`;
      const purpose = /review|attribution|source|selected mapping|variant/i.test(metadata.purpose)
        ? `${chartName} offers an additional view of planetary placements; traditional interpretations can vary.`
        : metadata.purpose;
      const limitation = /review|attribution|source|selected mapping|variant|custom convention/i.test(metadata.cannotEstablish)
        ? "This view describes placements and cannot guarantee life events or outcomes."
        : metadata.cannotEstablish;
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
        {rows.length > 0 && <div className="divisional-chart-guide">
          <div><h3>{t("divisional.guide.what")}</h3><p>{purpose}</p></div>
          <div><h3>{t("divisional.guide.read")}</h3><p>{t(division === 1 ? "divisional.guide.readD1" : "divisional.guide.readVarga")}</p></div>
          <div><h3>{t("divisional.guide.analysis")}</h3><ul>{rows.map((row) => <li key={`${division}-analysis-${row.name}`}>{row.name}: {row.sign}{row.house ? ` · ${t("results.house")} ${row.house}` : ""}</li>)}</ul></div>
          <div><h3>{t("divisional.guide.positive")}</h3><p>{t("divisional.guide.positiveText")} {purpose}</p></div>
          <div><h3>{t("divisional.guide.challenges")}</h3><p>{t("divisional.guide.challengeText")} {purpose}</p></div>
          <div><h3>{t("divisional.guide.guidance")}</h3><p>{t("divisional.guide.guidanceText")} {purpose}</p></div>
          <div><h3>{t("divisional.guide.limits")}</h3><p>{limitation}</p></div>
        </div>}
        {division === 1 && <DivisionalTimeline
          chart={chart}
          dasha={chart.vimshottariDasha}
          metadata={metadata}
          chartName={chartName}
          language={language}
        />}
        {rows.length > 0 && <KundliSectionQuestions savedChartId={savedChartId} sectionKey={`D${division}`} sectionLabel={division === 1 ? t("app.d1Rashi") : `${chartName} D${division}`} language={language} />}
      </section>;
    })}
  </div>;
}
