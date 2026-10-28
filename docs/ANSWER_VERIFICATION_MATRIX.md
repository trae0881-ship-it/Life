# LIFE Answer Verification Matrix v1.0

This matrix evaluates software behavior and evidence provenance, not whether
traditional interpretations predict real-world outcomes.

| Answer surface | Question IDs | Required evidence | Software status | Interpretation status | Predictive status |
|---|---|---|---|---|---|
| Marriage candidate windows | `marriage_timing`, `partner_timing`, `marriage_dasha` | Valid chart provenance, KP 2/7/11 evidence, 7th-cusp support, Dasha intersections, timezone-aware formatting | TESTED; separate-window regressions pass | REVIEW REQUIRED; no independently reviewed event rule | NOT EVALUATED |
| Relationship factors | `marriage_factors`, `partner_indicators`, `love_arranged` | Houses/occupants/lords and required planets present in selected chart | TESTED; missing facts fail closed | PENDING in `INTERPRETATION_VALIDATION.md` | NOT EVALUATED |
| Compatibility | `compatibility` | Two independently authenticated/owned validated charts and comparison method | UNSUPPORTED; honest limitation | NOT REVIEWED | NOT EVALUATED |
| Government indicators | `government_indicators`, `government_dasha` | Career rule facts, Dasha context where available | TESTED; no classifier | PENDING; no source passage | NOT EVALUATED |
| Career interpretation | `career_growth`, `career_delay`, `competitive_exams` | Career/education rule sections and available factors | TESTED as limited evidence | REVIEW REQUIRED | NOT EVALUATED |
| Employment/event timing | `government_timing`, `job_transit_dasha`, `new_job_timing`, `job_change` | A documented, reviewed event rule and validated trigger | UNSUPPORTED; no fabricated dates | INACTIVE | NOT EVALUATED |
| Business/comparison | `business_start`, `business_job_difference`, `partnership_business`, `business_career_income` | Business/career sections and explicit comparison rule | LIMITED or UNSUPPORTED by ID | REVIEW REQUIRED | NOT EVALUATED |
| Finance/property | `financial_growth`, `income_savings`, `property`, `financial_timing` | Finance/property chart facts; no outcome inference | LIMITED/UNSUPPORTED by ID | REVIEW REQUIRED | NOT EVALUATED |
| Foreign topics | `foreign_timing`, `foreign_travel_indicators`, `foreign_settlement`, `abroad_job_study` | Houses 3/9/12 where relevant and complete input | Indicators limited; event timing unsupported | REVIEW REQUIRED | NOT EVALUATED |
| Dasha facts | `current_dasha` | Calculated hierarchy and start-inclusive/end-exclusive lookup | SOFTWARE TESTED | Interpretation separate | NOT EVALUATED |
| Yogas/Doshas | `calculated_yogas` | Present rule matches from calculated chart | SOFTWARE TESTED | Classical cross-check unavailable | NOT EVALUATED |
| Nodes/Navamsa/transits | `rahu_ketu`, `navamsa`, `next_12_months_transits` | Calculated selected node/varga/transit data and provenance | SOFTWARE TESTED with limited independent references | Interpretation not independently reviewed | NOT EVALUATED |
| Required data disclosure | `required_data` | Selected chart input/settings/provenance | SOFTWARE TESTED | Not applicable | Not applicable |

## Cross-cutting answer gates

- Selected chart must be authenticated/owned at the API boundary where user
  data is involved; client positions and Dasha values are never trusted.
- Provenance must be calculated, hashed, versioned, and include UTC/time zone.
- Missing or uncertain time/place must not produce a complete personalized
  chart claim.
- Dates must originate from a calculation result and use the selected chart
  time zone.
- English, Hindi, and Hinglish output must preserve the distinction between
  calculated fact and traditional interpretation.
- General remedies must never be presented as personalized, and the active
  personalized registry remains empty.

## Exact evidence needed before “VERIFIED”

| Feature class | Evidence required |
|---|---|
| Calculation verified | Compatible independent reference fixtures, declared conventions, observed deltas within tolerance, and boundary/error tests |
| Interpretation reviewed | Exact source passage, edition/author, reviewer identity/date, disagreement record, approved scope, and safety review |
| Software behavior tested | Passing targeted tests, typecheck, build, ownership/provenance checks, and localized fallback tests |
| Predictive performance evaluated | Preregistered privacy-preserving study, baseline, outcome definition, representative sample, uncertainty, and independent review |

No row may be labelled fully verified by substituting one evidence class for
another.
