# 80-Year Timeline and Period Analysis Validation

## Calendar behavior

The timeline range starts on the recorded birth date and ends at the 80th
calendar birthday. The yearly overview is split on actual birth anniversaries,
not January 1. Monthly view shows the selected calendar year's months and
clips the first and last periods to the timeline range. Daily view shows only
the selected month's dates. Periods are generated on demand.

Age is calculated from birthday boundaries using the same leap-day convention
as the range: a February 29 birthday falls on February 28 in non-leap years
and returns to February 29 in leap years. Monthly and daily calendar periods
may contain a birthday; their displayed age gives the age at the beginning and
at the end of the interval when it changes.

## Period evidence and classification

The chart-embedded timeline receives the selected chart result's calculated
Vimshottari hierarchy. For each visible interval, it compares the interval's
IANA-timezone local-midnight boundaries with the engine's start-inclusive,
end-exclusive Dasha timestamps, then displays only overlapping Mahadasha,
Antardasha, and Pratyantardasha records. Missing or incomplete Dasha coverage
is explicitly identified. Birth-chart transit snapshots are not treated as
selected-period transits.

For each visible overlapping Dasha period, the timeline also derives whether it
is past/current/upcoming at render time and the user's age across that Dasha
interval. D1 additionally shows the period lord's calculated natal sign/house,
selected-house cusp-sign lordships, reported dignity, retrograde motion, and
same-sign natal planets where present. This is individualized chart context,
not an outcome prediction. D2-D60 show the shared natal Dasha dates but do not
reuse D1 interpretation as varga interpretation. No reviewed rule supports
favorable/challenging event themes or selected-period transit evidence, so
those conclusions remain explicitly unavailable.

The central classification aggregator supports favorable, challenging, mixed,
neutral, and not-evaluated outcomes from explicit rule evidence. It uses no
scores or weights, requires complete inputs and approved evidence for each
applicable rule, de-duplicates repeated evidence keys, and retains conflicts.
However, the repository currently has **no reviewed and approved period-timing
rules**. Dasha, natal dignity, yoga, transit facts, interpretation prose, and
assistant question topics are not by themselves a validated mapping from a
period to a directional classification. Therefore, no displayed period is
classified favorable, challenging, mixed, or neutral; all remain
**Not evaluated** with the blocker explained. This is intentional and is not
an accuracy or prediction claim.

No selected-period transit events or hourly timing are generated. The
standalone `/life-timeline` page accepts only a birth date, so it has no chart,
Dasha, timezone, or transit evidence and clearly states that limitation.
Divisional timelines show their own D-chart metadata but do not reuse D1
interpretations as D-chart timing rules. The available Dasha periods are
natal Vimshottari calculations and are not different for each varga.

## Automated and browser validation

Automated test, typecheck, and build results for the latest change are recorded
in `docs/TESTING.md`. The new Dasha-context cases verify date-boundary status,
leap-day age, resolved natal facts, missing-placement behavior, and profile
isolation; readiness and saved-report metadata have separate deterministic
tests. No disposable PostgreSQL database was configured, so saved-report
persistence and linked-record behavior have not been integration-tested.

`tests/life-timeline.test.mjs` covers actual birthday-year boundaries,
leap-day ages, selected-year months, selected-month dates, and the 80th
birthday. `tests/period-analysis.test.mjs` covers all five generic aggregation
outcomes, conflicts, duplicate evidence, incomplete inputs, unapproved rules,
Dasha overlap and profile-specific Dasha inputs, and localized timeline
labels. These tests validate the software behavior; they do not validate an
astrological period-direction rule.

Production browser QA used a calculated profile (`2000-02-29`, `12:00`,
`Asia/Kolkata`, New Delhi coordinates). All **60** chart sections and embedded
timelines remained present at 320×640, 360×800, 375×812, 390×844, 430×932, and
1280×900, with no page-level horizontal overflow. Opening D1 rendered 80
birth-anniversary intervals and actual overlapping Dasha levels. Selecting
2024-02-29 showed 12 months and 29 daily periods; the 80th birthday was
selectable and displayed age 80. Opening D9 retained its independent selected
date. Changing the selected year to the year before the current birth-date
anniversary clamped selection to the birth date, and month options beyond the
80th birthday were disabled. English, Hindi, and Hinglish text was checked,
and the final interaction flow produced no browser page errors or failed
requests.

Classification result: **none evaluated directionally**. Every production
period remains Not evaluated because the approved period-timing rule registry
is empty. Year/month/day Dasha interval facts are shown only where Dasha data
and local date boundaries are complete. The standalone date-only route has no
chart or Dasha input, but now accepts a birth date passed from the dashboard.
The results do not establish predictive accuracy.
