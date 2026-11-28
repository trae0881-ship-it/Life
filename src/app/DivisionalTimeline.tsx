"use client";

import { useEffect, useMemo, useState } from "react";
import { ageOnDate, buildTimeline, daysInMonth, timelineAgeMarkers, timelineDate, timelineRange, weekdayIndex, type TimelineView } from "@/calculation/life-timeline";
import { analyzeTimelinePeriod, type DashaTimelineData } from "@/calculation/period-analysis";
import type { DivisionalChartMetadata } from "@/calculation/divisional-metadata";
import { translate, type Language } from "@/presentation/language";

type TimelineChart = {
  input: {
    fullName: string | null;
    birthPlace: string | null;
    localDate: string;
    localTime: string;
    timeZone: string;
    utc: string;
    latitude: number;
    longitude: number;
  };
  provenance: { status: string; engineVersion: string; resultHash: string; limitations: string[] };
  houses: { house: number; sign: string }[];
  planets: { name: string; sign: string; house: number; motion: string }[];
  planetaryDignity: { name: string; dignity: string; sign: string }[];
  vimshottariDasha?: DashaTimelineData;
};

function todayInTimeZone(timeZone: string): string {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function DivisionalTimeline({ chart, dasha, metadata, chartName, language }: {
  chart: TimelineChart;
  dasha?: DashaTimelineData;
  metadata: DivisionalChartMetadata;
  chartName: string;
  language: Language;
}) {
  const t = (key: string) => translate(language, key);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<TimelineView>("yearly");
  const [selectedDate, setSelectedDate] = useState(chart.input.localDate);
  const range = useMemo(() => timelineRange(chart.input.localDate), [chart.input.localDate]);
  useEffect(() => {
    setSelectedDate(chart.input.localDate);
  }, [chart.input.localDate]);
  const selectedDateInRange = selectedDate >= range.start && selectedDate <= range.end;
  const periods = useMemo(
    () => open && selectedDateInRange ? buildTimeline(chart.input.localDate, view, selectedDate) : [],
    [chart.input.localDate, open, selectedDate, selectedDateInRange, view],
  );
  const analyses = useMemo(
    () => periods.map((period) => analyzeTimelinePeriod(period, chart.input.timeZone, dasha)),
    [chart.input.timeZone, dasha, periods],
  );
  const dashaAvailable = Boolean(dasha?.mahadashas?.length);
  const today = todayInTimeZone(chart.input.timeZone);
  const currentAge = today >= chart.input.localDate
    ? ageOnDate(chart.input.localDate, today)
    : null;
  const selectedAge = selectedDateInRange
    ? ageOnDate(chart.input.localDate, selectedDate)
    : null;
  const selectedParts = selectedDate.split("-").map(Number);
  const selectedYear = selectedParts[0];
  const selectedMonth = selectedParts[1] - 1;
  const selectedDay = selectedParts[2];
  const monthDays = daysInMonth(selectedYear, selectedMonth);
  const firstWeekday = weekdayIndex(timelineDate(selectedYear, selectedMonth, 1));
  const formatDashaInstant = (instant: string) => new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : language === "hinglish" ? "en-IN" : "en", {
    dateStyle: "medium",
    timeZone: chart.input.timeZone,
  }).format(new Date(instant));
  const years = Array.from({ length: Number(range.end.slice(0, 4)) - Number(range.start.slice(0, 4)) + 1 }, (_, index) => Number(range.start.slice(0, 4)) + index);
  const ageMarkers = timelineAgeMarkers(chart.input.localDate);
  const months = Array.from({ length: 12 }, (_, index) => index);
  const weekdays = Array.from({ length: 7 }, (_, index) => index);
  const setDateSafely = (year: number, month: number, day: number) => {
    const nextDay = Math.min(day, daysInMonth(year, month));
    const attempted = timelineDate(year, month, nextDay);
    setSelectedDate(attempted < range.start ? range.start : attempted > range.end ? range.end : attempted);
  };
  const shiftMonth = (delta: number) => setDateSafely(selectedYear, selectedMonth + delta, selectedDay);
  const monthIsAvailable = (year: number, month: number) => {
    const start = timelineDate(year, month, 1);
    const end = timelineDate(year, month, daysInMonth(year, month));
    return end >= range.start && start <= range.end;
  };

  return <section className="divisional-timeline" id={`timeline-${metadata.id}`} aria-labelledby={`timeline-title-${metadata.id}`} data-chart-id={metadata.id}>
    <div className="timeline-visible-summary">
      <div>
        <h3 id={`timeline-title-${metadata.id}`}>{t("timeline.title")}</h3>
        <span>{chartName}</span>
      </div>
      <div className="timeline-summary">
        <span>{t("timeline.range")}: {range.start} → {range.end}</span>
        <span>{t("timeline.selectedAge")}: {selectedAge ?? t("timeline.ageUnavailable")}</span>
      </div>
    </div>
    <div className="timeline-year-rail" role="group" aria-label={t("timeline.yearly")}>
      {ageMarkers.map(({ age, date }) => <button
        type="button"
        key={age}
        aria-label={`${t("timeline.age")} ${age}: ${date}`}
        aria-pressed={selectedAge === age}
        title={`${t("timeline.age")} ${age} · ${date}`}
        onClick={() => setSelectedDate(date)}
      >{age}</button>)}
    </div>
    <details className="timeline-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{t("timeline.openDetails")}</summary>
      {open && <div className="divisional-timeline-body">
      <div className="timeline-summary">
        <span>{t("timeline.currentAge")}: {currentAge ?? t("timeline.ageUnavailable")}</span>
        <span>{t("timeline.selectedAge")}: {selectedAge ?? t("timeline.ageUnavailable")}</span>
      </div>
      <div className="timeline-controls">
        <label>{t("timeline.year")} <select value={selectedYear} onChange={(event) => setDateSafely(Number(event.target.value), selectedMonth, selectedDay)}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select></label>
        <label>{t("timeline.month")} <select value={selectedMonth} onChange={(event) => setDateSafely(selectedYear, Number(event.target.value), selectedDay)}>
          {months.map((month) => <option key={month} value={month} disabled={!monthIsAvailable(selectedYear, month)}>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { month: "long" }).format(new Date(Date.UTC(2020, month, 1)))}</option>)}
        </select></label>
        <label>{t("timeline.day")} <select value={selectedDay} onChange={(event) => setDateSafely(selectedYear, selectedMonth, Number(event.target.value))}>
          {Array.from({ length: monthDays }, (_, index) => index + 1).map((day) => {
            const date = timelineDate(selectedYear, selectedMonth, day);
            return <option key={day} value={day} disabled={date < range.start || date > range.end}>{day}</option>;
          })}
        </select></label>
        <label>{t("timeline.view")} <select value={view} onChange={(event) => setView(event.target.value as TimelineView)}>
          <option value="yearly">{t("timeline.yearly")}</option>
          <option value="monthly">{t("timeline.monthly")}</option>
          <option value="daily">{t("timeline.daily")}</option>
        </select></label>
        <label>{t("timeline.date")} <input type="date" value={selectedDate} min={range.start} max={range.end} onChange={(event) => {
          const next = event.target.value;
          if (next >= range.start && next <= range.end) setSelectedDate(next);
        }} /></label>
      </div>
      <div className="timeline-month-grid" aria-label={t("timeline.month")}>
        {months.map((month) => {
          const monthStart = timelineDate(selectedYear, month, 1);
          const monthEnd = timelineDate(selectedYear, month, daysInMonth(selectedYear, month));
          const available = monthEnd >= range.start && monthStart <= range.end;
          return <button type="button" key={month} className={month === selectedMonth ? "selected" : ""} disabled={!available} aria-pressed={month === selectedMonth} onClick={() => setDateSafely(selectedYear, month, selectedMonth === month ? selectedDay : 1)}>
            <span>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { month: "short" }).format(new Date(Date.UTC(2020, month, 1)))}</span>
            <small>{daysInMonth(selectedYear, month)} {t("timeline.days")}</small>
          </button>;
        })}
      </div>
      <div className="timeline-day-navigation">
        <button type="button" onClick={() => shiftMonth(-1)}>{t("timeline.previous")}</button>
        <strong>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { month: "long", year: "numeric" }).format(new Date(Date.UTC(selectedYear, selectedMonth, 1)))}</strong>
        <button type="button" onClick={() => shiftMonth(1)}>{t("timeline.next")}</button>
      </div>
      <div className="timeline-calendar" aria-label={t("timeline.day")}>
        {weekdays.map((weekday) => <span className="timeline-weekday" key={weekday}>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { weekday: "short" }).format(new Date(Date.UTC(2020, 5, 7 + weekday)))}</span>)}
        {Array.from({ length: firstWeekday }, (_, index) => <span className="timeline-day-empty" key={`empty-${index}`} />)}
        {Array.from({ length: monthDays }, (_, index) => {
          const day = index + 1;
          const date = timelineDate(selectedYear, selectedMonth, day);
          const available = date >= range.start && date <= range.end;
          return <button type="button" key={date} className={date === selectedDate ? "selected" : ""} disabled={!available} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}>{day}</button>;
        })}
      </div>
      <div className="timeline-day-detail">
        <strong>{new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${selectedDate}T00:00:00Z`))}</strong>
        <span>{t("timeline.selectedAge")}: {selectedAge ?? t("timeline.ageUnavailable")} · {metadata.id} {metadata.name}</span>
      </div>
      {!selectedDateInRange && <p role="alert" className="timeline-analysis-note">{t("timeline.dateOutOfRange")}</p>}
      <div className="timeline-period-list" aria-label={t("timeline.periodAnalysis")}>
        {periods.map((period, index) => {
          const analysis = analyses[index];
          return <article className="timeline-period-card" key={`${metadata.id}-${period.start}-${period.end}`}>
            <div className="timeline-period-heading">
              <div>
                <strong>{view === "yearly" ? `${t("timeline.age")} ${period.label}` : period.label}</strong>
                <span>{period.start} → {period.end}</span>
              </div>
            </div>
            <p>{t("timeline.age")}: {period.age}{period.ageAtEnd !== period.age ? `–${period.ageAtEnd}` : ""}</p>
            <div className="timeline-dasha-periods">
              <strong>{t("timeline.dashaPeriods")}</strong>
              {analysis.dashaEvidence.length
                ? <ul>{analysis.dashaEvidence.map((item) => <li key={`${item.level}-${item.lord}-${item.start}`}>
                  <span>{t(`timeline.dashaLevel.${item.level.toLocaleLowerCase()}`)}: {item.lord}</span>
                  <span>{formatDashaInstant(item.start)} → {formatDashaInstant(item.end)}</span>
                </li>)}</ul>
                : <p>{t(dashaAvailable ? "timeline.noDashaPeriods" : "timeline.dashaUnavailable")}</p>}
            </div>
          </article>;
        })}
      </div>
    </div>}
    </details>
  </section>;
}
