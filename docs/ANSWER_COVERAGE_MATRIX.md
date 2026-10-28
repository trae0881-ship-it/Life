# LIFE Answer Coverage Matrix v1.0

Audit scope: `assistantQuestionCatalog`, `answerKundliQuestion`,
`interpretChart`, `calculateMarriageTiming`, provenance validation, localized
templates, and current regression tests. “Implemented” means the answer is
deterministic from validated chart facts; it does not mean the interpretation
is scientifically or independently validated.

The implementation status below must not be conflated with the separate
evidence levels. See [`PHASE_D_PRODUCTION_AUDIT.md`](./PHASE_D_PRODUCTION_AUDIT.md)
for all 38 actual answer paths, required facts, unit-test evidence, source
review status, positive/negative case status, and predictive-performance
evaluation. No predictive performance has been evaluated.

Career interpretation and government/job timing questions select Career;
`competitive_exams` selects Education. `career_dasha` selects Career and
Business, `business_start` selects Business, and `financial_timing` selects
Finances, with Dasha context kept separate. Returned interpretation evidence
includes its project convention, provenance description, matched conditions,
and any recorded conflicts. This is transparency of implementation, not
independent or source-reviewed validation. See the
[versioned 38-question evaluation](./PREDICTION_QUALITY_EVALUATION_V1.md)
for separate calculation, test, source-review, and performance statuses.

| # | Question ID / user-facing question | Intent | Required facts and rule | Selected-chart/provenance use | Timing | Status | Tests / limitation |
|---:|---|---|---|---|---|---|---|
| 1 | `marriage_timing` — When will I marry? | Marriage timing | KP 2/7/11, 7th-cusp sub-lord, qualifying Dasha intersection | Yes; validated chart required | Conditional separate candidate periods only | PARTIALLY_SUPPORTED | Marriage timing tests; no independent KP event validation |
| 2 | `partner_timing` — When may a partner/marriage period arise? | Marriage timing | Same conditional KP service | Yes | Conditional only | PARTIALLY_SUPPORTED | Formatter and KP tests; not a guarantee |
| 3 | `love_arranged` — Love or arranged marriage? | Relationship interpretation | Calculated relationship factors; no classification rule | Yes | No | PARTIALLY_SUPPORTED | Relationship route tests; no approved classification method |
| 4 | `marriage_dasha` — Which Dasha matters for marriage? | Marriage timing/context | Current Dasha plus conditional KP evidence | Yes | Conditional candidate periods | PARTIALLY_SUPPORTED | Dasha/KP tests; no independent tradition fixture |
| 5 | `marriage_factors` — What marriage factors are in my chart? | Relationship interpretation | Calculated relationship section and placements | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; factors are traditional interpretation |
| 6 | `partner_indicators` — What indicates a partner? | Relationship interpretation | 7th/relationship section where available | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; no dedicated partner rule |
| 7 | `compatibility` — Are we compatible? | Compatibility | Two validated charts required | Only one selected chart currently | No | UNSUPPORTED | Explicit partner-chart limitation; no second-chart input |
| 8 | `marriage_limitations` — What are the limitations? | Limitation disclosure | Birth-time precision, timezone, KP data availability, source-review and timing limitations | Yes | Not applicable | IMPLEMENTED | Dedicated route returns only relevant input/method limitations; does not leak into candidate-window calculation |
| 9 | `government_timing` — When will I get a government job? | Government timing | Career factors only; no approved event rule | Yes | No supported timing | UNSUPPORTED | No fabricated-date tests |
| 10 | `government_indicators` — Government-job indicators? | Career interpretation | Career houses/placements and dignity | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; no government-specific rule |
| 11 | `job_type_comparison` — Government or private job? | Comparison | Explicit comparison rule required | Chart context only | No | UNSUPPORTED | Explicit no-employment-type-rule limitation |
| 12 | `government_dasha` — Which Dasha supports government work? | Career timing/context | Current Dasha plus career factors | Yes | Period context only | PARTIALLY_SUPPORTED | Dasha tests; no government Dasha rule |
| 13 | `career_growth` — How is career growth? | Career interpretation | Career section factors | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; no outcome claim |
| 14 | `job_transit_dasha` — Job timing from transit/Dasha? | Career timing | Validated career transit trigger required | Transit/Dasha context only | No | UNSUPPORTED | No career trigger implemented |
| 15 | `competitive_exams` — Competitive exam prospects? | Education/career | Education section factors | Yes | No | PARTIALLY_SUPPORTED | Career tests; no exam outcome rule |
| 16 | `career_delay` — Why is career delayed? | Career interpretation | Career factors and limitations | Yes | No | PARTIALLY_SUPPORTED | Route/interpretation tests; not causal proof |
| 17 | `new_job_timing` — When can I get a new job? | Career timing | Approved job-event rule required | Yes | No | UNSUPPORTED | No event timing rule |
| 18 | `job_change` — When should I change jobs? | Career interpretation | Career factors; no change trigger | Yes | No | UNSUPPORTED | No job-change timing method |
| 19 | `business_start` — When should I start business? | Business timing | Business houses plus approved event rule | Yes | No | UNSUPPORTED | No business timing rule |
| 20 | `business_job_difference` — Business or job? | Comparison | Explicit comparison rule required | Chart context only | No | UNSUPPORTED | No comparison rule |
| 21 | `partnership_business` — Is partnership business suitable? | Business/partnership | Business/relationship factors | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; no partnership rule |
| 22 | `career_dasha` — Career/business Dasha? | Career timing/context | Current Dasha and career/business sections | Yes | Period context only | PARTIALLY_SUPPORTED | Dasha tests; no event rule |
| 23 | `financial_growth` — How is financial growth? | Finance interpretation | Calculated finance section, houses 2/5/11 and their lords | Yes | No | PARTIALLY_SUPPORTED | Finance-only evidence and no-outcome limitation tested; no wealth or income outcome rule |
| 24 | `income_savings` — Income or savings strength? | Finance comparison | Separate income/savings rules required | Chart context only | No | UNSUPPORTED | Explicit no-separate-rule limitation |
| 25 | `property` — When/should I buy property? | Property | House 4 placements/cusp | Yes | No supported timing | PARTIALLY_SUPPORTED | Property route tests; no purchase timing |
| 26 | `business_career_income` — Business, career, or income? | Finance comparison | Business/career factors | Yes | No | PARTIALLY_SUPPORTED | Comparison route tests; no ranking rule |
| 27 | `financial_timing` — When will finances improve? | Finance timing | Approved financial event rule required | Yes | No | UNSUPPORTED | No financial timing rule |
| 28 | `foreign_timing` — When will I go abroad? | Foreign timing | Houses 3/9/12 plus event rule | Yes | No | UNSUPPORTED | Foreign route tests; no event rule |
| 29 | `foreign_travel_indicators` — Foreign-travel indicators? | Foreign interpretation | Houses 3/9/12 and occupants | Yes | No | PARTIALLY_SUPPORTED | House evidence tests; interpretation only |
| 30 | `foreign_settlement` — Will I settle abroad? | Foreign interpretation | Houses 9/12 plus relocation rule | Yes | No | UNSUPPORTED | No settlement rule |
| 31 | `abroad_job_study` — Abroad job or study? | Foreign/career | Foreign-house facts plus existing career and education factors | Yes | No | PARTIALLY_SUPPORTED | Reports available chart context only; no reviewed abroad-job/study outcome rule |
| 32 | `current_dasha` — What is my current Dasha? | Dasha fact | Mahadasha/Bhukti/Antara interval | Yes | Current period supported | IMPLEMENTED | Dasha hierarchy/boundary tests |
| 33 | `strongest_indicators` — What are strongest indicators? | Interpretation summary | Ranked interpretation report | Yes | No | PARTIALLY_SUPPORTED | Interpretation tests; ranking is rule-derived, not scientific weight |
| 34 | `calculated_yogas` — Which Yogas/Doshas are calculated? | Yoga/Dosha facts | `yogasAndDoshas.present` findings | Yes | No | IMPLEMENTED | Yoga/Dosha tests; no classical independent cross-check |
| 35 | `rahu_ketu` — What about Rahu/Ketu? | Planetary facts | Node placements and interpretation | Yes | No | IMPLEMENTED | Chart/KP tests; traditional interpretation limitation |
| 36 | `navamsa` — What does Navamsa show? | Varga fact | Calculated D9 placements and convention | Yes | No | IMPLEMENTED | Varga boundary tests; no independent D9 fixture |
| 37 | `next_12_months_transits` — What transits are next? | Transit facts | Current instant, selected chart ayanamsa, locally calculated positions and 365.2425-day ingress horizon | Yes | Rolling 12-month transit events from requested instant; not life-event predictions | IMPLEMENTED | Selected-instant regression tests; independent ingress-reference validation remains limited |
| 38 | `required_data` — What birth data was used? | Input/provenance disclosure | Validated input and settings | Yes | Not applicable | IMPLEMENTED | Input/provenance tests |

## Totals

- IMPLEMENTED: **6**
- PARTIALLY_SUPPORTED: **17**
- UNSUPPORTED: **15**

These counts describe implementation evidence, not predictive accuracy.
