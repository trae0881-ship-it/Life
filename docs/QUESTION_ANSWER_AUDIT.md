# LIFE Question and Data-Provenance Audit

Audit date: 2026-10-19  
Scope: current 38-question registry and response routing, calculations, Dasha/timeline evidence, account/report APIs, remedy activation, legal routes and tests.

## Current source-code findings

The 2026-10-19 Project Excellence Phase 1 source review found that broad
career question dispatch included Education evidence alongside Career
evidence, and answer evidence omitted rule provenance/matched
conditions/conflicts. The handler now keeps `competitive_exams` on Education,
career questions on Career, and discloses the existing convention and
conflicting factors without implying a source-reviewed prediction. Regression
coverage is in `tests/kundli-predictions.test.mjs`; no interpretation rule or
calculation criterion was added.

For the Phase D permission matrix, payment/subscription audit, and the
question-by-question evidence levels (including the explicit source-review,
matching/non-matching, and predictive-performance distinctions), see
[`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md). No predictive
performance has been evaluated, and no outcome interpretation is marked
source-reviewed.

1. `assistantQuestionCatalog` contains 38 IDs. The assistant is deterministic code, not a prediction model. Tests prove each ID routes and has localized output; that is routing coverage, not proof that every question has a relevant rule. See the current per-ID feasibility table below and [`ANSWER_COVERAGE_MATRIX.md`](./ANSWER_COVERAGE_MATRIX.md).
   The dashboard assistant previously showed only 17 of those suggestions because of a stale UI allowlist. That filter is removed; all 38 catalog entries now reach the existing question handler. Visibility does not upgrade any limited or unsupported astrological rule to a validated prediction.
2. The server requires an authenticated user, current terms acceptance, an owned profile, and a saved chart owned by that user and linked to that profile. It checks that chart birth date, time, timezone, and coordinates match the selected profile. Saved-chart writes calculate from birth inputs rather than accepting client planetary positions.
3. Direct code review found and this phase fixes three answer-specific defects: `next_12_months_transits` was using the birth-time transit snapshot as a future window; `marriage_limitations` was routed into marriage candidate timing; and `financial_growth` fell through to the generic Business answer, mixing unrelated factors. New tests cover each behavior.
4. Event-timing answers no longer attach the natal transit snapshot as if it were selected-period evidence. The marriage candidate service does not use or show birth-time ingress data as a marriage transit filter. Its conditional Dasha windows remain traditional candidates, not independently validated event predictions.
5. The timeline uses birthday-based ranges and actual Dasha overlaps, but has no active reviewed directional period rules. D1–D60 directional classifications remain Not evaluated. There are no date-specific future transits in those timeline answers.
6. `approvedRemedyRules` is empty; the requested `docs/PERSONALIZED_REMEDIES.md` path does not exist. The actual maintained artifacts are [`REMEDY_RULE_LIBRARY.md`](./REMEDY_RULE_LIBRARY.md) and [`REMEDY_RULE_SOURCE_REVIEW.md`](./REMEDY_RULE_SOURCE_REVIEW.md); candidate rules remain inactive. General optional catalog practices are not personalized prescriptions.
7. Account-scoped profile, saved-chart, and question-history APIs use owner predicates. Saved-chart detail now validates the complete dashboard result structure on the server and the client before hydration; unsupported or malformed snapshots receive an explicit `UNSUPPORTED_SAVED_CHART` response and are not loaded. A real calculated-chart fixture is accepted and partial/malformed shapes are rejected in regression tests. Database persistence and cross-account browser behavior remain unverified because there is no disposable PostgreSQL test database configured.
8. Terms, Privacy Policy, and Disclaimer routes exist in three languages. There was no dedicated Refund Policy route; this phase adds one that states only the currently verifiable fact that LIFE has no in-app payment integration or refund workflow. No eligibility window or refund promise is invented.
9. [`DISPOSABLE_POSTGRES_TESTING.md`](./DISPOSABLE_POSTGRES_TESTING.md) requires an isolated `_test`/`-test` database and the guarded test runner. No production database or record was accessed.
10. Current unit/source/browser/database evidence and the unverified dependencies for each of the 38 assistant question IDs are tracked in [`VERIFICATION_INVENTORY.md`](./VERIFICATION_INVENTORY.md). Catalog routing coverage does not demonstrate meaningful per-question evidence or prediction validity.
11. No new astrological calculation or interpretation rule was added in this pass. Existing calculations are disclosed as calculated facts; relationship/career/finance/foreign outcome interpretation remains gated on reviewed source rules and matching/non-matching tests. The inventory separates those evidence levels and lists a concrete next test or dependency for every catalog ID.

## Exact implementation plan

1. Correct answer dispatch using existing calculated inputs only: evaluate current-date transits locally for the rolling 12-month transit question; separate limitation disclosure from event timing; narrow finance and foreign-topic evidence to the requested question.
2. Add regression tests for selected-instant transit results, prevention of natal transit leakage, limitation-only answers, finance evidence isolation, and all three supported locales.
3. Add the missing Refund Policy route using the existing legal document renderer and state the actual no-payment status without inventing eligibility or a contact process.
4. Update the 38-question evidence matrix and this audit with current code behavior, test evidence, exact blocked dependencies, and whether work can proceed using existing code.
5. Run the full test suite, TypeScript check, and production build. Run database integration only if a disposable test URL is configured; do not use production or staging.

## Per-question implementation feasibility

“Existing code” below means available calculated facts or deterministic chart fields. It does not mean a reviewed interpretation or prediction rule exists. Each ID's current software support classification remains in [`ANSWER_COVERAGE_MATRIX.md`](./ANSWER_COVERAGE_MATRIX.md).

| # | Question ID | What the current code can provide | Exact remaining dependency / can existing code close it? |
|---:|---|---|---|
| 1 | `marriage_timing` | Conditional KP 2/7/11, 7th-cusp sub-lord, and Dasha intersection windows | Existing calculation provides only candidate periods. Independent KP reference validation and human source review are required before strengthening interpretation. |
| 2 | `partner_timing` | Same conditional KP/Dasha candidate periods as marriage timing | Same validation and review gate; no partner-meeting date rule exists. |
| 3 | `love_arranged` | Relationship factors and selected chart placements | Existing facts can be reported; a love/arranged classifier requires reviewed source, criteria, and negative cases. |
| 4 | `marriage_dasha` | Actual Dasha intervals plus conditional KP candidate periods | Existing code can provide facts; mapping Dasha lords to marriage outcomes requires reviewed rules and independent KP/Dasha validation. |
| 5 | `marriage_factors` | Houses 2/7/8, lords, occupants, Venus/Jupiter, and reported dignity where available | Existing code supplies facts; meaning beyond factor disclosure requires exact source passages and human review. |
| 6 | `partner_indicators` | Existing relationship factors, including 7th-house context | A dedicated partner-description rule is absent and cannot be derived from calculations alone; source review required. |
| 7 | `compatibility` | Only the selected user's chart | Requires a second authenticated/owned profile plus a reviewed comparison method; not closable from current single-chart input. |
| 8 | `marriage_limitations` | Birth-time precision, timezone, and whether KP fields exist | Dedicated limitation-only response is implemented in this phase; independent interpretation validation remains outstanding. |
| 9 | `government_timing` | Career chart factors and calculated Dasha intervals | No government-employment event rule or trigger exists; requires source/reviewer-defined rule and outcome validation. |
| 10 | `government_indicators` | Houses 6/10/11, lords, occupants and selected career factors | Existing code reports context only; government-specific interpretation needs source review. |
| 11 | `job_type_comparison` | Broad career/business chart context | No government/private comparison rule or occupational data exists; requires reviewed method and explicit criteria. |
| 12 | `government_dasha` | Current/upcoming Dasha intervals and natal placements | Existing code supplies timing facts; Dasha-to-government-work meaning requires reviewed rules, not new arithmetic. |
| 13 | `career_growth` | Broad houses 6/10/11 context and placements | Existing code reports context only; no reviewed growth or outcome interpretation exists. |
| 14 | `job_transit_dasha` | Local transit calculation and Dasha intervals are available separately | No reviewed career trigger connects them to a job event; rule review is required before any timing answer. |
| 15 | `competitive_exams` | Existing education-section factors and planetary facts | Exam participation/outcome rules and educational outcome evidence are missing; source review required. |
| 16 | `career_delay` | Broad career factors and limitations | No causal rule establishes why a delay occurs; existing code cannot infer causation. |
| 17 | `new_job_timing` | Dasha facts and chart context | No approved job-event trigger exists; source/reviewer-defined rule and independent validation required. |
| 18 | `job_change` | Career context and Dasha facts | No reviewed change trigger or user employment history input exists; cannot time a change with current code. |
| 19 | `business_start` | Business houses, lords and chart factors | No approved business-start event rule or user-specific business context exists. |
| 20 | `business_job_difference` | Separate broad career and business factors | No comparison criteria or outcome evidence exists; scoring/ranking would be invented. |
| 21 | `partnership_business` | Business and relationship factors | No reviewed partnership-suitability or partner-comparison method exists. |
| 22 | `career_dasha` | Dasha hierarchy and career/business chart factors | Existing facts can be assembled; their relation to career/business outcomes requires reviewed rules. |
| 23 | `financial_growth` | Houses 2/5/11 and finance factors; finance-only response is implemented in this phase | Existing code supplies symbolic factors only; wealth/income outcomes require reviewed rules and cannot be claimed from chart factors alone. |
| 24 | `income_savings` | Combined finance factors from houses 2/5/11 | Separate income/savings measures require definitions and non-astrological financial inputs; current chart code cannot calculate them. |
| 25 | `property` | House 4 cusp and occupants | Property ownership or purchase timing needs an approved rule and likely real-world property/financial facts; current code only reports chart facts. |
| 26 | `business_career_income` | Broad career, business, and finance facts | No validated comparison or ranking rule exists. |
| 27 | `financial_timing` | Finance factors and Dasha intervals | No reviewed financial-event trigger exists; no dates should be returned. |
| 28 | `foreign_timing` | Houses 3/9/12 and current chart/Dasha context | No travel-event timing rule or trip context exists; source review and event validation required. |
| 29 | `foreign_travel_indicators` | Calculated houses 3/9/12 and available occupants | Existing facts can be reported; travel meaning requires source review and is not an event prediction. |
| 30 | `foreign_settlement` | Houses 9/12 and related placements | Relocation/settlement rule and real-world residence context are absent. |
| 31 | `abroad_job_study` | Foreign-house facts plus existing career/education factors | Evidence can be combined without a conclusion; a reviewed job/study-abroad rule and external life-context inputs are still missing. |
| 32 | `current_dasha` | Current Mahadasha, Antardasha and Pratyantardasha intervals | Existing code and boundary tests support the calculated facts; independent Dasha reference validation remains open. |
| 33 | `strongest_indicators` | Multi-factor interpretation matches | No reviewed ranking criterion exists. Existing counts are not a strength score and cannot establish strongest outcomes. |
| 34 | `calculated_yogas` | Local Yoga/Dosha rule matches and literal rule conditions | Existing deterministic rules are testable; independent classical/source verification is missing. |
| 35 | `rahu_ketu` | Calculated node placements and selected node mode | Facts are available; outcome meanings need source-reviewed interpretation. |
| 36 | `navamsa` | Calculated D9 placements and declared mapping convention | Existing implementation can report placements; independent D9 reference fixtures and convention review are missing. |
| 37 | `next_12_months_transits` | Current positions and sign ingress from the requested instant, calculated locally | Correct selected-instant calculation is implemented in this phase; independent ingress-reference validation remains limited and no life-event prediction is supported. |
| 38 | `required_data` | Birth input, timezone, coordinates, and selected calculation settings | Existing code discloses chart inputs/settings; no further calculation is needed, but public output must remain limited to user-relevant fields. |

## Prior 38-question inventory

The following inventory records the earlier 2026-10-17 review. Its “before
Phase 11” test labels are historical; current support statuses and limitations
are maintained in [`ANSWER_COVERAGE_MATRIX.md`](./ANSWER_COVERAGE_MATRIX.md),
and current source-code feasibility is audited above.

| # | Question ID | Category | Required evidence | Implementation surface | Date support | Languages | Test status before Phase 11 |
|---:|---|---|---|---|---|---|---|
| 1 | `marriage_timing` | Marriage | KP 2/7/11, 7th cusp sub-lord, qualifying Dasha intersection | `kundli-assistant.ts`, `marriage-timing.ts`, `assistant-answer-format.ts` | Assistant delegates to the KP service; localized date range only when it returns a candidate window | EN/HI/Hinglish | Covered |
| 2 | `partner_timing` | Marriage | Same as marriage timing; partner chart is not required for a single-chart indication | `kundli-assistant.ts`, `marriage-timing.ts`, `assistant-answer-format.ts` | Same supported-window gate; otherwise localized insufficient-evidence answer | EN/HI/Hinglish | Covered |
| 3 | `love_arranged` | Marriage | Relationship indicators, 5th/7th context; no deterministic classification rule | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 4 | `marriage_dasha` | Marriage | Current and future Vimshottari hierarchy plus supported KP evidence | `kundli-assistant.ts`, `marriage-timing.ts`, `assistant-answer-format.ts` | Period context plus a date window only when all implemented KP/Dasha conditions qualify | EN/HI/Hinglish | Covered |
| 5 | `marriage_factors` | Marriage | 2nd/7th/8th house and calculated placements | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 6 | `partner_indicators` | Marriage | 7th house, lord and relationship factors | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 7 | `compatibility` | Marriage | Two charts or partner data; current application has one chart | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 8 | `marriage_limitations` | Marriage | Provenance, birth-time accuracy, unsupported rules | `kundli-assistant.ts` | Not applicable | EN/HI/Hinglish | Limited |
| 9 | `government_timing` | Government | Career houses plus a documented government-service rule | `kundli-assistant.ts`, `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 10 | `government_indicators` | Government | 6th/10th/11th houses, lords and dignity | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 11 | `job_type_comparison` | Government | Explicit comparison rule for government/private work | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 12 | `government_dasha` | Government | Dasha lord context tied to career evidence | `kundli-assistant.ts` | Period context only | EN/HI/Hinglish | Limited |
| 13 | `career_growth` | Government | Career rule output and gains evidence | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 14 | `job_transit_dasha` | Government | Validated career transit trigger plus Dasha | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 15 | `competitive_exams` | Government | Education/competition rule and Dasha context | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 16 | `career_delay` | Government | Saturn/6th/10th/11th conflict rule | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 17 | `new_job_timing` | Career | Career event rule and qualifying period | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 18 | `job_change` | Career | Career-change rule and transit/Dasha trigger | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 19 | `business_start` | Business | 3rd/7th/11th business rule and qualifying period | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 20 | `business_job_difference` | Business | Explicit business-versus-employment comparison rule | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 21 | `partnership_business` | Business | 7th/11th and partnership risk/support rule | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 22 | `career_dasha` | Business | Dasha context linked to career/business evidence | `kundli-assistant.ts` | Period context only | EN/HI/Hinglish | Limited |
| 23 | `financial_growth` | Money | 2nd/5th/11th financial rule | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 24 | `income_savings` | Money | Separate income and savings evidence; current rule is combined | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 25 | `property` | Money | 4th house, lord, occupants and property rule | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 26 | `business_career_income` | Money | Business, career and gains evidence | `interpretation/rules.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 27 | `financial_timing` | Money | Financial event rule plus Dasha/transit trigger | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 28 | `foreign_timing` | Foreign | 3rd/9th/12th evidence plus event rule | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 29 | `foreign_travel_indicators` | Foreign | 3rd/9th/12th house placements | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 30 | `foreign_settlement` | Foreign | 12th/9th and relocation rule | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 31 | `abroad_job_study` | Foreign | Career/education plus foreign-house evidence | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 32 | `current_dasha` | Other | Current Mahadasha/Bhukti/Antara intervals | `kundli-assistant.ts` | Current period supported | EN/HI/Hinglish | Covered |
| 33 | `strongest_indicators` | Other | Ranked calculated interpretation factors | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Limited |
| 34 | `calculated_yogas` | Other | Present calculated Yoga/Dosha findings | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Covered |
| 35 | `rahu_ketu` | Other | Actual node placements and configured node mode | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Covered |
| 36 | `navamsa` | Other | Actual D9 placements and convention | `kundli-assistant.ts` | Not implemented | EN/HI/Hinglish | Covered |
| 37 | `next_12_months_transits` | Other | Actual transit snapshot/ingress data | `kundli-assistant.ts` | Transit dates are calculated facts, not event predictions | EN/HI/Hinglish | Covered |
| 38 | `required_data` | Other | Actual input/settings/provenance fields | `kundli-assistant.ts` | Not applicable | EN/HI/Hinglish | Covered |

## Data-provenance requirements for the implementation

Every personalized answer must be derived from a validated chart object containing:

- chart result hash;
- calculation engine/rule-set version;
- calculation timestamp or input UTC;
- selected calculation settings;
- the currently selected chart identity in the client;
- server-side ownership when the source is a saved chart.

The public answer may use calculated factors and uncertainty disclosures, but must not expose internal source IDs, rule IDs, URLs, scoring weights or raw engine records.

## Audit conclusion

All 38 IDs have a software route, but only chart facts and a small set of
conditional calculations are currently supportable. The three identified
response-routing defects were corrected without enabling unreviewed event
rules. No classification or event outcome was added. The saved-report
schema-validation and disposable-PostgreSQL integration gaps remain open.

The plan for any additional astrological rule remains gated on verified
bibliography and exact passage review, explicit positive and negative criteria,
matching/boundary tests, independent calculation evidence where applicable,
and safety review. A rule without those materials stays inactive.
