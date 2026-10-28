# LIFE Prediction Quality Evaluation v1.0

Evaluation snapshot: 2026-10-19. This is a versioned engineering-evidence
framework, not a claim of predictive validity. Question-specific calculation
dependencies, implemented answer logic, unsupported rules, provenance, and
limitations are detailed in the numbered rows of
[`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md). The current
answer behavior is summarized in
[`ANSWER_COVERAGE_MATRIX.md`](./ANSWER_COVERAGE_MATRIX.md).

## Baseline before Phase 3 changes

- Automated suite: **268 passed, 0 failed**.
- TypeScript check: **passed**.
- Production build: **passed** with a deliberately nonconnecting placeholder
  `DATABASE_URL`; no database connection, migration, or write was performed.
- Authenticated browser and disposable-database verification: **not performed**.
- Predictive performance: **not evaluated for any question**.

## Verification after this Phase 3 change

- Automated suite: **271 passed, 0 failed** (three new tests relative to
  baseline).
- Focused assistant/acceptance tests: **17 passed, 0 failed**.
- TypeScript check: **passed**.
- Production build: **passed** with a deliberately nonconnecting placeholder
  `DATABASE_URL`; it generated Prisma Client locally but did not connect to a
  database.
- Authenticated browser and disposable-database verification: **not performed**.
- Predictive performance and comprehensive independent calculation
  validation: **not evaluated**.

## Status definitions

Implementation, tests, independent calculation validation, interpretation
source review, and predictive performance are separate evidence dimensions.
“Unit tested” means the listed deterministic facts or response path have
internal tests; it does not establish numerical agreement with an independent
implementation or predictive quality. “P/N” means positive and negative
cases for the relevant deterministic behavior, not real-world outcome
classification. “Boundary” and “missing” refer only to the documented code
paths and test fixtures, not exhaustive coverage. No astrological outcome
rule in this inventory is source-reviewed. Tests and calculation fixtures
are enumerated in the per-question audit; missing evidence is not inferred
from a test passing.

For descriptive facts, applicable software metrics are fixed-input output
stability, exact rule/interval boundaries, and numerical residual against a
matching independent fixture where one exists. No predictive metric is
currently applicable: the project has no consented, labeled outcome cohort,
evaluation protocol, or calibration procedure. No accuracy, probability, or
prediction-reliability percentage is reported.

## Question-by-question evaluation

`Calc / unit` describes the present answer/calculation status and test evidence.
`Independent` means a matching external numerical reference for the output,
not merely an internal test or a planetary fixture reused for a different
calculation. `P/N, boundary, missing` describe current deterministic test
coverage; “shared” indicates shared-service coverage rather than a complete
question-specific rule test. `Expected behavior / next action` records what
the application can responsibly return and the evidence needed to go further.

| # | Question ID / category | Required facts and dependencies | Calc / unit evidence | Independent calculation validation | Interpretation source reviewed | Positive / negative, boundary, missing-input tests | Conflicts and responsible answer / metrics / next action |
|---:|---|---|---|---|---|---|---|
| 1 | `marriage_timing` / marriage | Valid chart, KP planets/cusps, 7th cusp sub-lord, Vimshottari intervals, timezone | Conditional KP/Dasha candidate service; arithmetic and boundaries internally tested | No matching independent KP output fixture | No | P/N: candidate and insufficient/conflicting evidence; B: Dasha boundaries; M: shared | Return only a conditional candidate window or no candidate, never a guarantee. Metric: candidate arithmetic vs matching fixture; next: independent KP fixture and reviewed rule. |
| 2 | `partner_timing` / marriage | Same calculation inputs as Q1; no separate partner-meeting calculation | Reuses conditional marriage timing service; shared tests | No | No | P/N: shared with Q1; B: shared Dasha boundaries; M: shared | Candidate marriage periods are not partner-meeting dates. Same Q1 validation work; do not claim performance. |
| 3 | `love_arranged` / marriage | Valid relationship chart facts; no approved classification input or method | Relationship fact path tested, not a validated classifier | No | No | P/N: shared relationship facts only; B: no classifier boundary; M: shared | Return chart context and limitation, not a classification. Next: reviewed rule, exceptions, and dedicated classifier cases. |
| 4 | `marriage_dasha` / marriage | KP facts, current Dasha hierarchy/date, relationship facts | Shared Dasha/KP arithmetic and boundary tests | No | No | P/N: shared candidate cases; B: Dasha boundaries; M: shared | Show period context/candidate only. No source-reviewed Dasha-to-marriage outcome rule; seek independent fixtures and review. |
| 5 | `marriage_factors` / marriage | Houses 2/7/8, lords, Venus/Jupiter, placements and dignity | Relationship interpretation facts and missing-rule path tested | No | No | P/N: shared factor/missing cases; B: no question-specific outcome boundary; M: yes | Describe traditional factors, not outcome. Next: source review and question-specific exceptions/cases. |
| 6 | `partner_indicators` / marriage | Relationship houses/planets; no supported partner-description model | Shared relationship evidence path tested | No | No | P/N: shared factor/missing cases; B: no dedicated boundary; M: shared | Report factors only; do not infer partner traits. Next: reviewed rule and specific negative cases. |
| 7 | `compatibility` / marriage | Two validated charts required; current flow provides one selected chart | Explicit partner-chart limitation tested | No | No | P/N: not applicable; B: one-chart limitation; M: partner chart absent | State unsupported until a second authorized chart and reviewed comparison method exist. No compatibility metric. |
| 8 | `marriage_limitations` / marriage | Birth-time accuracy, timezone, KP availability, chart provenance | Dedicated disclosure branch tested | No | Not an interpretation | P/N: present/missing disclosure; B: not applicable; M: yes | Disclose limitations only. Metric: exact disclosure for input states; keep synchronized with supported methods. |
| 9 | `government_timing` / government | Career facts and Dasha context; no job-event trigger | Career-only evidence and timing limitation tested; Education excluded | No | No | P/N: no outcome pair; B: shared timing/Dasha; M: shared | No job date or probability. Next: reviewed event trigger and labeled, consented outcome evaluation. |
| 10 | `government_indicators` / government | Career houses 6/10/11, lords, occupants, Saturn/Sun/Mercury | Career-factor facts tested; not government-specific | No | No | P/N: generic career factors/missing; B: no outcome boundary; M: shared | Provide context only, not government-employment prospects. Next: government-specific source review and exceptions. |
| 11 | `job_type_comparison` / government | Career and business factors; explicit comparison criteria absent | Shared factor evidence; no classifier | No | No | P/N: no classification pair; B: not applicable; M: shared | Do not rank government/private employment. Next: reviewed criteria and required non-astrological inputs. |
| 12 | `government_dasha` / government | Current/upcoming Dasha plus career chart factors | Dasha intervals and Career-only evidence tested; Education excluded | No | No | P/N: shared Dasha/missing cases; B: Dasha boundaries; M: shared | Period context only; no Dasha-to-government-work rule. Next: reviewed mapping and independent fixture. |
| 13 | `career_growth` / government | Career houses 6/10/11, lords, occupants, planets | Career-factor and missing-rule cases tested | No | No | P/N: generic factor/missing; B: no growth outcome boundary; M: yes | Traditional context only; no career-growth outcome claim. Next: source review and relevant outcomes. |
| 14 | `job_transit_dasha` / government | Career chart facts, Dasha, selected-date transit calculation | Career-only evidence; transit and Dasha components tested separately; Education excluded | No matching job-event reference | No | P/N: no job outcome pair; B: timing path tested; M: shared | No job date/probability; natal transit snapshot is not a trigger. Next: reviewed event rule and independent event data. |
| 15 | `competitive_exams` / government | Education houses 4/5/9, lords, Mercury/Jupiter; no exam context | Education facts and missing-data behavior tested | No | No | P/N: education facts only; B: no exam outcome boundary; M: yes | Education context only; no exam participation/success claim. Next: reviewed rule and contextual inputs. |
| 16 | `career_delay` / government | Career facts and available Dasha context; no causal evidence | Career facts and limitations tested | No | No | P/N: generic factor/missing; B: no causal boundary; M: shared | Do not infer cause. Next: require user context and reviewed non-causal interpretation. |
| 17 | `new_job_timing` / career | Career factors and Dasha intervals; no job-start trigger | Career-only evidence and shared Dasha facts tested; Education excluded | No | No | P/N: no job outcome pair; B: shared Dasha; M: shared | No event date or probability. Next: reviewed job-start trigger and labeled outcomes. |
| 18 | `job_change` / career | Career factors; employment history/context not collected | Career fact path tested | No | No | P/N: no change classifier pair; B: not applicable; M: shared | No recommendation or timing. Next: define context and reviewed change criteria. |
| 19 | `business_start` / business | Business houses 3/7/11, Mercury/Venus, Dasha; no business-start trigger | Business section facts and timing limitation tested; evidence now excludes Career/Finance sections | No | No | P/N: no business outcome pair; B: shared Dasha; M: shared | No start date/probability. Regression verifies business-only evidence. Next: reviewed event trigger and business context/outcomes. |
| 20 | `business_job_difference` / business | Career and business facts; comparison/ranking criteria absent | Shared factor evidence tested | No | No | P/N: no classification pair; B: not applicable; M: shared | Context only; no job-vs-business ranking. Next: reviewed comparison criteria and user context. |
| 21 | `partnership_business` / business | Business and relationship factors; partner/business details absent | Shared fact and limitation behavior tested | No | No | P/N: no suitability outcome pair; B: not applicable; M: shared | No partnership suitability claim. Next: reviewed rule, partner data, and exceptions. |
| 22 | `career_dasha` / business | Dasha hierarchy, career/business factors | Career and Business evidence plus Dasha boundaries tested; Education and Finance excluded | No | No | P/N: shared factors; B: Dasha boundaries; M: shared | Period context only, no career event probability. Next: source-reviewed Dasha mapping and independent fixture. |
| 23 | `financial_growth` / money | Finance houses 2/5/11, lords, Jupiter/Venus | Finance-only factor path and missing-rule behavior tested | No | No | P/N: finance factors/missing; B: no wealth outcome boundary; M: yes | Traditional context only; no wealth/income promise. Next: reviewed rule and suitable labeled financial outcomes. |
| 24 | `income_savings` / money | Separate income and savings measures; neither is supplied | Shared finance factors only; no separate metrics | No | No | P/N: no distinct comparison cases; B: not applicable; M: inputs absent | Do not compare income with savings. Next: define metrics and collect necessary data. |
| 25 | `property` / money | 4th-house cusp/occupants; ownership, financing and asset context absent | House facts and limitation path tested | No | No | P/N: no purchase outcome pair; B: no purchase boundary; M: shared | House context only; no purchase advice/date. Next: reviewed eligibility rule and context. |
| 26 | `business_career_income` / money | Business, career and finance factors; ranking criteria absent | Shared factor calculations tested | No | No | P/N: no ranking pair; B: not applicable; M: shared | Do not rank sources of income. Next: reviewed comparison criteria and outcomes. |
| 27 | `financial_timing` / money | Finance factors and Dasha; no financial-event trigger | Timing limitation path tested; evidence now excludes Career/Business sections | No | No | P/N: no financial outcome pair; B: shared Dasha; M: shared | No financial event date/probability. Regression verifies Finance-only evidence. Next: reviewed trigger and labeled outcomes. |
| 28 | `foreign_timing` / foreign | Houses 3/9/12, placements and Dasha; no travel-event trigger | House/Dasha facts and unsupported timing path tested | No | No | P/N: no travel outcome pair; B: shared Dasha; M: shared | No travel date/probability. Next: reviewed travel trigger and event-labelled validation. |
| 29 | `foreign_travel_indicators` / foreign | Houses 3/9/12 cusps and occupants | House facts and context-only path tested | No | No | P/N: generic house/missing; B: selected house facts; M: yes | Context only, not travel prediction. Next: source review and question-specific boundaries. |
| 30 | `foreign_settlement` / foreign | Houses 9/12 and placements; residence context absent | House facts tested; no settlement rule | No | No | P/N: no settlement outcome pair; B: not applicable; M: shared | No relocation conclusion/date. Next: reviewed method and contextual data. |
| 31 | `abroad_job_study` / foreign | Foreign, career and education facts; study/employment context absent | Component chart facts tested | No | No | P/N: no abroad outcome pair; B: shared fact boundaries; M: shared | Report chart context only. Next: reviewed joint rule, exceptions and context. |
| 32 | `current_dasha` / other | Valid chart Dasha hierarchy and requested instant | Active period sequence and interval boundaries tested | No independent Dasha chart fixture | Not an outcome interpretation | P/N: active/non-active cases; B: start inclusive/end exclusive; M: invalid/missing chart path | Return descriptive current period only. Metric: exact interval agreement against matching independent Dasha fixture; next: create trusted fixture. |
| 33 | `strongest_indicators` / other | `interpretChart` matched factors and internal evidence-strength labels | Matched-factor assembly and missing-rule behavior tested | No | No | P/N: generic multi-factor/missing; B: no calibrated ranking boundary; M: yes | Do not imply calibrated outcome strength. Next: remove ranking implication or review ranking criteria. |
| 34 | `calculated_yogas` / other | Planet placements and defined yoga/dosha rules | Selected yoga/dosha match and non-match rules internally tested | No matching independent yoga fixture | No outcome rule reviewed | P/N: selected yoga/dosha rule cases; B: selected calculation boundaries; M: shared | Report calculated rule matches only, not life outcomes. Next: independent fixture and rule-source review. |
| 35 | `rahu_ketu` / other | Selected true/mean node mode, positions, signs and houses | Node calculation and placement paths internally tested | No question-specific independent node comparison | No | P/N: node-present/missing path; B: chart calculation boundaries; M: yes | Report positions only; no unsupported node interpretation outcome. Next: matching numerical reference. |
| 36 | `navamsa` / other | D9 placements, validated chart input, selected varga convention | D9 mapping and degree-boundary tests | No independent D9 fixture | No | P/N: placement mapping cases, not outcomes; B: mapping boundary tested; M: invalid chart tested | Report D9 placements/convention only. Next: independent D9 reference and school-specific source review. |
| 37 | `next_12_months_transits` / other | Selected instant, supported ayanamsa, local Swiss Ephemeris, configured horizon | Local positions/ingress horizon and selected-instant regressions tested | Limited ingress-reference comparison; no comprehensive planetary fixture | Not an outcome interpretation | P/N: selected-instant/no-natal-snapshot regression; B: horizon/ingress tests; M: invalid input tested | Return astronomical transit facts only, not life events. Metric: ingress timestamp residual where reference matches; next: extend reference coverage/tolerance review. |
| 38 | `required_data` / other | Validated saved-chart inputs and calculation settings | Disclosure and missing-field behavior tested | Not applicable | Not an interpretation | P/N: present/missing fields; B: input validation tests; M: yes | Disclose only data belonging to the selected chart. Metric: disclosure matches validated input; next: continue minimization and selected-profile regression. |

## Evaluation totals and interpretation

- Question IDs inventoried: **38/38**.
- Answer coverage inventory: **6 implemented, 17 partially supported,
  15 unsupported**; these are implementation labels, not reliability grades.
- Question-level independent calculation comparisons: **none comprehensive**.
  Q37 has limited independent ingress comparison only. Existing planetary
  reference fixtures do not validate every downstream astrology result.
- Interpretation rules with source review: **0/38**.
- Predictive performance evaluations: **0/38**.
- Unsupported claims must remain limited or explicitly unsupported; do not
  add event dates, probability estimates, guarantees, or outcome classifications
  without reviewed rules and suitable validation.

## Reference repository isolation

The project documents the following as calculation-convention cross-checks,
not as the intended marketing/reference repository:

- [PyJHora chart rules](https://github.com/naturalstupid/pyjhora/blob/main/src/jhora/horoscope/chart/charts.py)
- [PyJHora compatibility rules](https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/horoscope/match/compatibility.py)
- [Maitreya Nakshatra mapping](https://github.com/martin-pe/maitreya8/blob/master/src/jyotish/Nakshatra.cpp)

No exact marketing repository URL was found in the reviewed project
documentation or supplied in the Phase 3 request. This blocks license,
dependency, security, and feature-fit review of that intended repository; no
substitute repository was guessed, and no external repository code was
integrated.

No runtime or build dependency on a reference repository, remote branch,
website, API, or CDN was added. Core calculation continues to use the locally
installed Swiss Ephemeris binding and checked-in ephemeris data. A regression
test simulates external request failure while running local chart and answer
calculation. No production network/database/payment action was performed.

## Phase 3 change and next stage

This phase narrows `business_start` evidence to Business and
`financial_timing` evidence to Finances, with deterministic regression tests.
It does not add predictive rules. Next, provide the exact intended reference
repository URL for review; separately, prioritize independent calculation
fixtures (starting with the documented gaps in Dasha, KP, D9 and ingress
outputs) before considering any source-reviewed prediction rule.

## Phase 4 calculation validation status

Phase 4 baseline, captured before its changes (2026-10-19):

- Full test suite: **271 passed, 0 failed**.
- Focused calculation suite: Dasha/Panchanga **9 passed**; KP **8 passed**.
  The combined shell invocation reported the first file only, so the full
  baseline is the reliable aggregate; Phase 4's targeted rerun is reported
  below.
- TypeScript and production build were not yet rerun at this baseline point.
- No production database, migration, payment, or authenticated browser
  operation was performed.

### Independent fixture outcomes

No matching fixed numerical comparison was obtained for Vimshottari output,
the complete KP output, D9 output, or sidereal ingress timestamps. The JPL
Horizons DE441 fixtures independently validate selected tropical planet
positions and one Mercury rate sample only; they do not validate Dasha dates,
KP ayanamsa/cusps/lord chains, D9 mapping outputs, or transit event times.
The approximate July 2024 Sun ingress assertion is an internal regression
expectation, not a sourced external timestamp. See the full settings and
blockers in [`CALCULATION_VALIDATION_MATRIX.md`](./CALCULATION_VALIDATION_MATRIX.md).

The documented PyJHora source is AGPL-3.0-or-later. Its current GitHub
`main` commit at review time is `48e57d29b47a3143519910a24866758116467485`;
the commit message identifies v4.9.3 while the same commit's `pyproject.toml`
declares version 5.0. The attempted PyPI JSON endpoints for 4.9.3 and 5.0
returned 404, and PyJHora plus its dependencies are not installed locally.
Its `requirements.txt` pins `pyswisseph==2.10.3.2`, `numpy==2.1.1`,
`pytz==2024.1`, `timezonefinder==6.5.2`, plus PyQt6/pyqtgraph, geocoder,
geopy, Requests and img2pdf. PyJHora also uses Swiss Ephemeris, so any
eventual numerical comparison would need to distinguish independent
astrological logic from a shared ephemeris engine. No dependencies were
installed and no remote code was executed.
Its source therefore remains a convention cross-check only; no executable
reference output was generated, and no code was copied or integrated.

### Phase 4 question-by-question status

“Answer path” preserves the prior coverage labels; it does not grade accuracy.
“Internal tests” distinguishes full deterministic behavior tests from tests of
supporting facts or limitations. Independent validation means a matching
external numerical result for the question's own calculation output, not
merely a valid planetary input fixture. Rule documentation includes explicit
limitations for unsupported answers. Performance refers only to labeled
real-world predictive outcomes.

| # | ID | Answer path | Internal tests | Independent question calculation | Basis documented | Source-reviewed outcome rule | Positive/negative rule test | Predictive performance |
|---:|---|---|---|---|---|---|---|---|
| 1 | `marriage_timing` | PARTIAL | YES | NO | YES | NO | YES, candidate-service cases | NOT EVALUATED |
| 2 | `partner_timing` | PARTIAL | PARTIAL, shared service | NO | YES | NO | PARTIAL, shared candidate service | NOT EVALUATED |
| 3 | `love_arranged` | PARTIAL | PARTIAL, relationship facts | NO | YES | NO | NO | NOT EVALUATED |
| 4 | `marriage_dasha` | PARTIAL | PARTIAL, shared Dasha/KP | NO | YES | NO | PARTIAL, shared candidate service | NOT EVALUATED |
| 5 | `marriage_factors` | PARTIAL | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 6 | `partner_indicators` | PARTIAL | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 7 | `compatibility` | UNSUPPORTED | YES, one-chart limitation | NO | YES | N/A | N/A | NOT EVALUATED |
| 8 | `marriage_limitations` | IMPLEMENTED | YES | NO | YES | N/A | N/A | NOT EVALUATED |
| 9 | `government_timing` | UNSUPPORTED | PARTIAL, facts/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 10 | `government_indicators` | PARTIAL | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 11 | `job_type_comparison` | UNSUPPORTED | PARTIAL, limitation | NO | YES | NO | NO | NOT EVALUATED |
| 12 | `government_dasha` | PARTIAL | PARTIAL, Dasha/facts | NO | YES | NO | NO | NOT EVALUATED |
| 13 | `career_growth` | PARTIAL | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 14 | `job_transit_dasha` | UNSUPPORTED | PARTIAL, components | NO | YES | NO | NO | NOT EVALUATED |
| 15 | `competitive_exams` | PARTIAL | PARTIAL, Education facts | NO | YES | NO | NO | NOT EVALUATED |
| 16 | `career_delay` | PARTIAL | PARTIAL, facts/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 17 | `new_job_timing` | UNSUPPORTED | PARTIAL, facts/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 18 | `job_change` | UNSUPPORTED | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 19 | `business_start` | UNSUPPORTED | PARTIAL, evidence isolation | NO | YES | NO | NO | NOT EVALUATED |
| 20 | `business_job_difference` | UNSUPPORTED | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 21 | `partnership_business` | PARTIAL | PARTIAL, chart facts | NO | YES | NO | NO | NOT EVALUATED |
| 22 | `career_dasha` | PARTIAL | PARTIAL, Dasha/facts | NO | YES | NO | NO | NOT EVALUATED |
| 23 | `financial_growth` | PARTIAL | PARTIAL, finance facts | NO | YES | NO | NO | NOT EVALUATED |
| 24 | `income_savings` | UNSUPPORTED | PARTIAL, limitation | NO | YES | NO | NO | NOT EVALUATED |
| 25 | `property` | PARTIAL | PARTIAL, house facts | NO | YES | NO | NO | NOT EVALUATED |
| 26 | `business_career_income` | PARTIAL | PARTIAL, factors | NO | YES | NO | NO | NOT EVALUATED |
| 27 | `financial_timing` | UNSUPPORTED | PARTIAL, evidence isolation | NO | YES | NO | NO | NOT EVALUATED |
| 28 | `foreign_timing` | UNSUPPORTED | PARTIAL, facts/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 29 | `foreign_travel_indicators` | PARTIAL | PARTIAL, house facts | NO | YES | NO | NO | NOT EVALUATED |
| 30 | `foreign_settlement` | UNSUPPORTED | PARTIAL, facts/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 31 | `abroad_job_study` | PARTIAL | PARTIAL, component facts | NO | YES | NO | NO | NOT EVALUATED |
| 32 | `current_dasha` | IMPLEMENTED | YES, interval and boundary cases | NO | YES | N/A | N/A | NOT EVALUATED |
| 33 | `strongest_indicators` | PARTIAL | PARTIAL, assembly/limitation | NO | YES | NO | NO | NOT EVALUATED |
| 34 | `calculated_yogas` | IMPLEMENTED | YES, selected match/non-match rules | NO | YES | NO | YES, calculation-rule cases | NOT EVALUATED |
| 35 | `rahu_ketu` | IMPLEMENTED | PARTIAL, placements | NO | YES | N/A | N/A | NOT EVALUATED |
| 36 | `navamsa` | IMPLEMENTED | YES, D9 mapping boundaries | NO | YES | N/A | N/A | NOT EVALUATED |
| 37 | `next_12_months_transits` | IMPLEMENTED | PARTIAL, local ingress regression | NO, no sourced event timestamp | YES | N/A | N/A | NOT EVALUATED |
| 38 | `required_data` | IMPLEMENTED | YES, disclosure/missing fields | NO | YES | N/A | N/A | NOT EVALUATED |

The `Answer path` statuses total **6 implemented, 17 partially supported, and
15 unsupported** as in the prior coverage inventory. Every “NO” in independent
calculation is specific to the question's full output; the JPL fixture does
provide limited independent evidence for some tropical planetary inputs. No
predictive outcome rule is source-reviewed and no predictive performance has
been evaluated.

### Confirmed Phase 4 defect and verification

`calculateTransits` previously allowed an invalid `Date` and unsupported
ayanamsa to reach Swiss binding calls, yielding native `TypeError`s; a
non-finite horizon could silently return no ingress, and positive infinity
could make the scan non-terminating. It now rejects invalid instants,
unsupported ayanamsas, and non-positive/non-finite horizons with typed
`InputError` codes before ephemeris access. This changes input error handling
only; no chart convention or numerical output changed.

Added regression coverage in `tests/events.test.mjs`. Phase 4 final
verification: full suite **276 passed, 0 failed**; focused Dasha/Panchanga,
KP, transit/event and divisional-chart tests **38 passed, 0 failed**;
TypeScript check **passed**; production build **passed** with a deliberately
nonconnecting placeholder `DATABASE_URL`. No database connection,
migration, write, or authenticated browser test was performed. These are
software checks, not independent numerical comparisons or prediction
performance measurements.

## Phase 3B — reference and answer-path review (2026-10-21)

The authenticated `POST /api/assistant/questions` path was rechecked against
the 38-question catalog and its evaluation rows. It requires accepted-user
authentication, same-origin mutation, rate-limit allowance, valid question
input, an owned birth profile, and a saved chart belonging to that profile.
Before generating an answer, it validates that the chart matches the
selected profile. Existing routing keeps question-specific categories and
topics distinct, and the selected chart is the evidence source. Detailed
question paths and limitations remain in
[`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md).

The PyJHora 4.8.7 birth-chart output comparison matches LIFE for three fixed
inputs. PyJHora uses Swiss Ephemeris 2.10.03; LIFE's `@swisseph/node` 1.4.0
binding does not expose its embedded Swiss version. Both use the Swiss
Ephemeris implementation family and the same local ephemeris data. This is
therefore a pipeline/convention cross-check, not independent numerical
evidence for sidereal positions or a basis to change any question's
independent-calculation status. No interpretation rule met a new source-review
standard, so the 38 answer-path statuses and rule tests remain unchanged.
Predictive performance remains **NOT EVALUATED** for every question; no
outcome cohort, calibration, or performance claim was introduced.

## Phase 5 — question engine and application readiness review (2026-10-21)

The answer-generation path and all 38 catalog IDs were checked against the
per-question matrix above and `PHASE_D_PRODUCTION_AUDIT.md`. This phase did not
add an astrological interpretation or event-prediction rule: the documented
source-review and independent calculation gaps remain, so the existing
question-by-question implementation, test, source-review, independent
validation, and performance statuses are unchanged. Existing positive,
negative, boundary, and missing-input evidence remains limited to the
specific deterministic facts and shared services identified in those rows; it
does not establish predictive performance.

The source review reconfirmed that authenticated question submission requires
an owned selected profile and saved chart whose birth inputs match. Database
cross-account execution and authenticated browser behavior remain unverified.
No user question records or production data were read or changed.
