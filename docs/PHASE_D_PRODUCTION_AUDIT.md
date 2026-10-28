# LIFE Phase D: Permissions, Payments, and Prediction Evidence Audit

Audit date: 2026-10-19

## Scope and safety

This is a source-code and schema audit. No live database was queried, no
credentials or user records were read, and no role, payment, subscription, or
production data was changed. No migration, payment action, or production write
is proposed in this phase. Database-backed authorization, audit persistence,
and authenticated browser behavior remain unverified.

“Implemented” below describes code presence and server-side enforcement, not
production verification. User account verification is distinct from the
engineering verification checklist and its reviewer approvals.

## Super Admin permissions matrix

| Capability | USER | DEVELOPER | ADMIN | SUPER_ADMIN | Implementation and evidence |
|---|---|---|---|---|---|
| User dashboard | Own authenticated dashboard | Own authenticated dashboard | Own authenticated dashboard | Own authenticated dashboard | Implemented with server-validated sessions; persisted flows are not DB/browser verified. `src/app/dashboard/page.tsx`, `src/server/auth.ts` |
| Administration overview | No | No | Aggregate account/profile/chart counts | Separate aggregate overview of accounts/profiles/charts/questions | Implemented for ADMIN and SUPER_ADMIN in `/admin`; SUPER_ADMIN also has its own `/super-admin` and guarded API. Query results not DB-verified. `src/app/admin/page.tsx`, `src/app/api/super-admin/overview/route.ts` |
| User search and inspection | Own profile/chart/history only | No administrative inspection | Bounded recent-user listing (maximum 200) | Paginated search/filter, stable sorting, minimal user/profile summary | Implemented read-only. Each Super Admin request requires server-derived SUPER_ADMIN role; response fields explicitly projected. Mocked tests only; no DB integration. `src/app/api/admin/users/route.ts`, `src/app/api/super-admin/users/route.ts`, `src/server/super-admin-users-handler.ts` |
| Account verification | No administrative capability | No | Missing | Missing | The `VerificationApproval` model is for technical checklist reviews, not end-user account verification. No account verification or account status field/API exists. `prisma/schema.prisma`, `src/app/api/verification/approvals/route.ts` |
| Account activation/deactivation | Missing | Missing | Missing | Missing | No account status field, activation API, or deactivation API exists in the reviewed schema/routes. |
| Role assignment / privilege changes | Missing | Missing | Missing | Missing | No role mutation endpoint exists. Roles are read from the database-backed session. Last-Super-Admin protection is therefore not applicable to current routes; it will be mandatory before adding role/deactivation controls. `src/server/auth-core.ts`, `src/app/api/**` |
| Audit Logs | No | No | No | Read-only list of recorded Super Admin user-list reads | Implemented with independent SUPER_ADMIN API authorization and selected fields. Current schema records actor, action, page, result count, timestamp; it does not record failed attempts or success/failure status. Migration is unapplied and persistence is unverified. `src/app/api/super-admin/audit-logs/route.ts`, `src/server/super-admin-audit-handler.ts`, `prisma/schema.prisma` |
| Subscription and plan management | Missing | Missing | Missing | Missing | No subscription/plan models or APIs found. |
| Payment transaction inspection | Missing | Missing | Missing | Missing | No payment transaction models or APIs found. |
| Offline payment approval/rejection | Missing | Missing | Missing | Missing | No offline-payment proof or approval workflow found. Technical verification approvals are unrelated. |
| Refunds | Missing | Missing | Missing | Missing | No refund provider integration, refund state, or refund API found. The legal refund page is informational only. |
| OTP management | Missing | Missing | Missing | Missing | No OTP model, route, or service found. |
| App settings | Missing | Missing | Missing | Missing | Super Admin navigation has a clearly inactive placeholder; no settings API/model is present. |
| Reports and exports | Own saved charts/reports | No admin report inspection | No admin report inspection | Inactive placeholder; no report inspection/export API | User-owned report reopening exists. No cross-user admin report view, export, or bulk download exists. `src/app/api/saved-charts/route.ts`, `src/app/super-admin/SuperAdminDashboard.tsx` |
| Technical verification checklist | Public checklist; ordinary acknowledgement is browser-local only | Read/create/delete own authenticated reviewer approval | Read/create/delete own authenticated reviewer approval | Read/create/delete own authenticated reviewer approval | Ordinary acknowledgements do not persist on the server. Authenticated approval reads are scoped to the signed-in reviewer and return no account metadata or notes. Database behavior is not verified. `src/app/api/verification/route.ts`, `src/app/api/verification/approvals/route.ts` |

### Authorization and audit findings

- Super Admin page access and each `/api/super-admin/*` endpoint independently
  require a server-validated session and exact `SUPER_ADMIN` role. Request role
  headers/body fields are not used for authorization.
- `/admin` and `/api/admin/users` intentionally permit `ADMIN` and
  `SUPER_ADMIN`; they are separate from Super Admin-only APIs.
- No endpoint changes roles, activation state, plans, subscriptions, or
  payments. There is currently no route through which an operator can remove
  the last Super Admin.
- User inspection is audited transactionally: a failed audit insert fails the
  listing request. Audit-log reads themselves are not recorded, preventing
  recursive read events. Failed authorization and invalid-filter attempts are
  not represented in the current event schema.
- Account inspection responses explicitly include only account ID, email,
  role, creation date, and profile count. Audit responses explicitly include
  event ID, actor ID, action, requested page, result count, and timestamp.
  No birth details, password hashes, session tokens, search string, or
  connection data are intentionally selected.
- The audit migration
  `prisma/migrations/20261019170000_super_admin_access_audit/migration.sql`
  has not been applied. No migration is proposed by this audit.
- The previously identified verification privacy exposure is mitigated in
  source: ordinary acknowledgements are browser-local and the public endpoint
  no longer reads or writes their free-text labels/notes; authenticated
  approval reads are scoped to the current reviewer and omit notes and account
  metadata. Existing ordinary-acknowledgement rows, if any, are left untouched
  and are no longer returned or modified. Unit/source-contract tests cover the
  response policy. Public verification responses also omit process stdout,
  stderr, and host/runtime metadata. Database and authenticated browser
  behavior remain unverified.

## Payments and subscriptions

The reviewed Prisma schema contains user/session/profile/chart/question,
technical-verification, and Super Admin access-audit models. It contains no
payment, transaction, subscription, plan, invoice, offline proof, refund, or
OTP model. The reviewed `src/app/api` route tree and `src/server` services
contain no payment gateway, webhook, signature verifier, price resolver,
subscription activator, offline-payment reviewer, refund service, or OTP
handler. Repository text matches for payment-related terms are limited to
informational UI/legal references; they are not a payment implementation.

| Required payment property | Finding |
|---|---|
| Server-side payment verification / webhook signature | Not implemented; no gateway/webhook exists. |
| Duplicate-webhook idempotency | Not applicable to current code; no webhook exists. |
| Server-side price/plan validation | Not implemented; no plan or checkout flow exists. |
| Subscription activation only after verified payment/manual approval | Not implemented; no subscription state exists. |
| Offline proof approval/rejection | Not implemented. |
| Refund execution and verified provider flow | Not implemented. |
| Separate payment and subscription states | Not implemented; neither state exists. |
| Manual-change/payment audit events | Not implemented; current audit event types cover user-list reads only. |
| Safe payment errors / credential minimization | No payment surface exists to verify. |

No payment mocks were added because there is no payment contract or code path
to test. Adding a gateway or subscription system would require explicit
provider, plan, currency, authorization, and failure-state requirements; no
real payment or production subscription change is proposed.

Payment is **not implemented and is not a deployment dependency**. The
`/refund-policy` route is informational legal copy only. Do not set paid status
or entitlements from client redirects or legal text. When payment is
prioritized, the provider-neutral flow should be: server-owned versioned
plan/price → authenticated server-created provider order → provider checkout
→ verified server signature/order/capture evidence or webhook → idempotent
transaction state transition and audit → entitlement derived from verified
subscription state. Provider secrets stay server-side. Refund state and
execution must follow a separately approved policy; do not add schema,
dependencies, prices, or entitlements before the required decisions are
settled.

Exact decisions required before implementation:

1. Provider(s), merchant account/region, payment methods, and sandbox-to-live
   promotion process.
2. Server-owned plan IDs, prices, currency, taxes, effective dates, and
   versioning.
3. Entitlements per plan, activation/expiry, renewal/cancellation, grace
   periods, and delayed, reversed, or partially refunded payment handling.
4. Refund eligibility, approval roles, partial-refund support, and customer
   communication/retention policy.
5. Webhook endpoint configuration, signature verification mode, event
   retention, retry/reordering policy, and reconciliation schedule.
6. Support/admin permissions, transaction-field minimization, audit retention,
   and sandbox test-account ownership.

### Phase 5 official provider documentation check

Official documentation was reviewed for integration constraints, not used to
create a payment implementation:

- [Razorpay Standard Checkout integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
  describe server-created orders and tying checkout to the server-issued
  `order_id`.
- [Razorpay webhook validation and testing](https://razorpay.com/docs/webhooks/validate-test/)
  requires signature verification over the raw request body and describes
  unique event-ID handling for duplicate deliveries.
- [PayPal Standard Checkout integration](https://developer.paypal.com/docs/checkout/standard/integrate/)
  describes server-side order creation/capture and request identifiers.
- [PayPal webhook signature verification API](https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post)
  is the official verification endpoint reference.

No sandbox account or credentials were available, and no sandbox call,
checkout, webhook, or refund was performed. Provider documentation does not
resolve LIFE's missing plan/pricing/entitlement, currency, tax, refund, or
administrative authorization policy; implementation remains blocked on those
decisions.

## User Panel status and security limits

Source inspection finds authenticated routes and owner-scoped filters for
profiles, saved charts, and question history. Profile PATCH writes only
submitted fields after validating the merged record. Assistant submission
validates the selected profile/chart belong to the authenticated user and
match birth inputs; question-history idempotency is scoped by user. These are
code-level findings backed by unit/mock/source tests, not proof of database
isolation or persistence.

Remaining verification gaps:

- Cross-account access must still be exercised with two isolated test accounts
  against a disposable PostgreSQL database.
- Create/edit/reload profile, optional null fields, saved-chart reopen, question
  history, and logout need authenticated integration/browser coverage.
- Role/session enforcement, audit persistence, and the migration remain
  unverified against a database.
- No authenticated browser session was available. Do not infer rendered
  behavior, layout width compliance, or keyboard behavior from source tests.
- No payment, activation, role-change, or subscription controls are present.
- The previously identified verification acknowledgement and approval-metadata
  exposure is mitigated as described above; database/browser behavior remains
  unverified.
- `GET /api/health` is the Railway readiness probe and requires both a valid
  local calculation engine and a connected PostgreSQL database. The public
  chart UI reads the separate `engineReady` signal so a database outage is not
  misreported as an ephemeris-engine failure.

## Prediction evidence levels

The assistant dispatch path is
`assistantQuestionCatalog` → `answerKundliQuestion` →
`interpretChart` and question-specific calculation services. For catalogued
questions, output is built from local chart calculations and static
localized explanation strings; no external AI or prediction service is used.
Tests establish deterministic behavior for fixtures, not predictive accuracy.

Evidence labels in the table:

- **Calculation** reports implementation/unit-test evidence for the named
  deterministic input facts or project convention. It is not an independent
  numerical validation unless explicitly stated.
- **Source review** means source-verified astrological interpretation, not
  merely a source name in code. No predictive interpretation in this inventory
  meets that bar. Technical references for astronomy/timekeeping do not validate
  astrological outcomes.
- **Cases** distinguishes tests of fact/rule logic from outcome prediction
  cases. A generic chart fixture or missing-data test is not a matching and
  non-matching prediction pair.
- **Performance** means evaluation against real outcome labels with an
  appropriate protocol. None of the 38 has such an evaluation.

| # / question | Required inputs, calculation dependency, and actual answer path | Calculation evidence | Interpretation source review; conditions/conflicts | Matching / non-matching cases | Timing / probability and performance | Exact unresolved gap |
|---|---|---|---|---|---|---|
| 1 `marriage_timing` | Validated chart with KP planets/cusps, 7th-cusp sub-lord, Vimshottari intervals, IANA timezone → `mode=timing` → `calculateMarriageTiming` | KP and Dasha rule arithmetic unit-tested; no independent KP output fixture | No classical outcome rule source-reviewed; candidate condition is all MD/AD/PD lords signify 2/7/11 plus 7th sub-lord condition; contradictions are not a probability | Candidate and conflicting/insufficient fixtures tested in `marriage-timing.test.mjs`; not real outcomes | Candidate periods only; no calibrated timing/probability/performance evaluation | Independent KP cross-check, human rule review, event-labelled validation |
| 2 `partner_timing` | Same KP/Dasha/timezone inputs → same marriage candidate service | Shared calculation tests; no question-specific separate fixture | No partner-meeting rule or source review; same candidate condition as Q1 | Shared service positive/negative fixtures only | No partner/date probability or performance | Partner-meeting meaning is not calculated; Q1 validation gaps remain |
| 3 `love_arranged` | Validated relationship chart facts → `mode=relationship` | Relationship house/planet facts have unit fixtures | No classifier source reviewed; birth-time uncertainty and contradictory factors do not yield an outcome classification | Shared relationship-factor/missing-data tests, not classifier P/N cases | No timing/probability/performance evaluation | Source-approved definitions and separately testable classifier required |
| 4 `marriage_dasha` | KP, Dasha hierarchy/current date and relationship facts → timing branch plus Dasha context | Dasha boundaries and KP candidate arithmetic unit-tested | No source-reviewed Dasha-to-marriage outcome mapping; conflicts are shown as facts, not weighted | Shared Q1 candidate and Dasha tests; no outcome pair | Period facts/candidate windows only; no performance evaluation | Independent Dasha/KP reference and reviewed mapping |
| 5 `marriage_factors` | Relationship houses 2/7/8, lords, Venus/Jupiter, placements/dignity → relationship branch | House/planet facts and missing-rule behavior unit-tested | Internal traditional heuristic only; no source review; dignity conflicts may be listed but no outcome inference | Shared positive fixture and missing-data case; not specific outcome cases | No event timing or probability; no performance | Exact source passages/reviewer and question-specific boundaries |
| 6 `partner_indicators` | Same relationship facts → relationship branch | Shared relationship facts unit-tested | No source-reviewed partner-indicator rule or description; conflicting facts are not resolved into traits | Shared positive/missing-data only; no dedicated P/N rule | No timing/probability/performance | Dedicated rule and reviewer evidence required |
| 7 `compatibility` | Current input supplies only one chart → relationship branch returns partner-chart limitation | Limitation path is code-tested; second-chart calculation unavailable | No compatibility rule/source review; no pairwise conflict method | Limitation test; no compatibility positive/negative chart pair | No timing/probability/performance | Second owned chart input and reviewed comparison method |
| 8 `marriage_limitations` | Birth-time precision, timezone, KP availability → dedicated limitations response | Input-presence/missing-KP branches tested | This is a disclosure, not an astrological interpretation; no outcome rule | Present/missing input path tests; not prediction cases | No timing/probability/performance claim | Keep disclosure aligned with evolving methods and inputs |
| 9 `government_timing` | Career houses/planets and Dasha intervals → timing branch | Chart facts/Dasha intervals unit-tested; timing answer excludes Education evidence | No government employment event rule/source review; no causal or conflicting-factor resolution | Career-only evidence regression; generic timing/missing-data fixtures; no outcome P/N | No event date, probability, or performance | Reviewed government-work trigger and outcome dataset |
| 10 `government_indicators` | Career houses 6/10/11, lords, occupants, Saturn/Sun/Mercury → career branch | Career house facts unit-tested | Traditional internal house-topic heuristic, not government-specific; no source review; dignity conflicts disclosed | Generic career-factor and missing-input tests; no government outcome pair | No timing/probability/performance | Reviewed government-specific meaning and tests |
| 11 `job_type_comparison` | Career/business factors → comparison branch | Shared chart facts unit-tested | No government/private classifier, source, criteria, or conflict policy | Generic comparison evidence only; no paired classifier cases | No ranking, timing, probability, or performance | Define reviewed comparison criteria and required real-world inputs |
| 12 `government_dasha` | Current/upcoming Dasha plus career chart factors → timing branch | Dasha periods and Career-only factors unit-tested; Education evidence excluded | No source-reviewed Dasha-to-government-work mapping; factors are not ranked outcomes | Career-only evidence regression; shared Dasha and missing-data tests; no outcome pair | Period context only; no probability/performance | Reviewed mapping, exception rules, independent validation |
| 13 `career_growth` | Career houses 6/10/11, lords, occupants, planets → career branch | Career-factor and missing-rule cases unit-tested | Internal house-topic heuristic only; no growth/outcome source review; conflicts may be listed | Generic positive/missing-factor fixture; no growth outcome P/N | No timing/probability/performance | Source-reviewed growth rule and real outcomes |
| 14 `job_transit_dasha` | Career facts, Dasha, and locally calculated transit service are available separately → career-timing branch | Transit and Dasha arithmetic unit-tested separately; Education evidence excluded | No reviewed rule joins transit/Dasha to a job event; no conflict logic | Career-only evidence regression; timing branch tested not to reuse natal transit snapshot; no job-event cases | No job dates or probabilities; no performance | Define and validate a career-event trigger before combining calculations |
| 15 `competitive_exams` | Education houses 4/5/9, lords, Mercury/Jupiter → career-mode Education section | Education chart facts and missing-data behavior unit-tested | No exam participation/success rule source-reviewed; no real exam context | Generic education facts; no outcome P/N | No exam date/probability/performance | Reviewed rule plus appropriate exam outcome data |
| 16 `career_delay` | Career factors and available Dasha context → career branch | Career factors unit-tested | No causal delay rule; no source review; chart factors cannot establish cause | Generic factors/missing-rule tests, not causal examples | No timing/probability/performance | Do not infer cause absent reviewed method and contextual data |
| 17 `new_job_timing` | Career factors and Dasha intervals → timing branch | Career-only facts/Dasha unit-tested; Education evidence excluded | No job-start trigger or source review; conflicting indicators not outcome-weighted | Career-only evidence regression; no outcome P/N | No event date/probability/performance | Reviewed job-event rule and labeled historical outcomes |
| 18 `job_change` | Career factors and Dasha; no employment-history input → career branch | Chart fact tests only | No change trigger/source review; user context absent | Generic career evidence only | No timing/probability/performance | Define change method and contextual input; validate externally |
| 19 `business_start` | Business houses 3/7/11, Mercury/Venus, Dasha → timing branch | Business-section facts and Dasha unit-tested; timing answer now excludes Career and Finances sections | No business-start rule/source review or business-context conflict handling | Business-only evidence regression; no outcome P/N | No start date/probability/performance | Reviewed trigger, context inputs, outcome validation |
| 20 `business_job_difference` | Career and business sections → comparison branch | Both factor sets internally tested | No comparison/ranking rule or source review; no tie/conflict policy | Shared factors only, no classification P/N | No ranking/timing/probability/performance | Reviewed comparison rules and real-world inputs |
| 21 `partnership_business` | Business and career factors → comparison branch | Business/relationship house facts unit-tested | No partnership suitability source/rule; no partner/business context | Generic factor fixtures only | No timing/probability/performance | Reviewed partnership rule, negative conditions, partner data |
| 22 `career_dasha` | Career/business factors plus actual Dasha hierarchy → career-timing branch | Career and Business facts plus Dasha boundaries tested; Education and Finance evidence excluded | No Dasha-to-career/business outcome rule/source review; conflicts not converted to score | Career/Business-only evidence regression; no outcome P/N | Period facts only, no event probability/performance | Reviewed mapping and independent validation |
| 23 `financial_growth` | Finance houses 2/5/11, lords, Jupiter/Venus → finance-only branch | Finance factor rule internally tested | No wealth/income outcome rule/source review; no financial context or risk factors | Finance evidence and missing-rule behavior tested; no wealth outcome pair | No financial timing/probability/performance | Reviewed rule and appropriate financial outcome validation |
| 24 `income_savings` | Finance factors → comparison branch; income and savings are not independently measured | Shared finance factors unit-tested | No income-vs-savings definition, rule, source review, or conflict resolution | No separate metric P/N cases | No timing/probability/performance | Define independent metrics and collect necessary non-astrological data |
| 25 `property` | 4th-house cusp and occupants → property branch | House cusp/occupant facts unit-tested | No ownership/purchase rule/source review; no asset/financing context | Generic house evidence only, no property outcome pair | No purchase timing/probability/performance | Reviewed eligibility rule and relevant property context |
| 26 `business_career_income` | Business, career, finance factors → comparison branch | Factor calculations unit-tested | No comparative ranking/source review; conflicts have no approved weighting | Generic factors only; no ranking P/N | No timing/probability/performance | Reviewed comparison criteria and outcome validation |
| 27 `financial_timing` | Finance factors plus Dasha → career-timing branch | Finance-section facts and Dasha arithmetic unit-tested; timing answer now excludes Career and Business sections | No financial event trigger/source review or conflict rule | Finance-only evidence regression; no outcome P/N | No dates/probability/performance | Reviewed trigger and labeled outcome data |
| 28 `foreign_timing` | Houses 3/9/12, placements and Dasha → foreign branch | House/planet/Dasha facts unit-tested | No travel-event rule/source review, trip context, or conflict handling | Generic house facts only; no travel outcome P/N | No event date/probability/performance | Reviewed travel trigger and event-labelled validation |
| 29 `foreign_travel_indicators` | Houses 3/9/12 cusps and occupants → foreign branch | House/occupant facts unit-tested | Internal context-only rule, not source-reviewed prediction; no indication aggregation/conflict resolution | Generic positive/missing house fixtures; not travel outcome pairs | No timing/probability/performance | Source-reviewed interpretation and specific boundary tests |
| 30 `foreign_settlement` | Houses 9/12 and placements → foreign branch | House facts unit-tested | No settlement/relocation rule/source review; residence context absent | Generic factors only; no outcome P/N | No timing/probability/performance | Reviewed relocation method and relevant life-context data |
| 31 `abroad_job_study` | Foreign, career, education facts → foreign branch | Component chart facts unit-tested | No abroad job/study rule/source review; no education/employment context | Generic evidence only; no outcome P/N | No timing/probability/performance | Reviewed joint rule, exceptions, contextual input and outcomes |
| 32 `current_dasha` | Valid chart's Vimshottari intervals and requested instant → Dasha branch | Dasha hierarchy, interval sequence, boundary arithmetic unit-tested; no independent reference chart | Descriptive period fact, not source-reviewed outcome interpretation; period end is exclusive | Active period and boundary/non-active cases tested | Current period only; no probability/performance evaluation | Independent Dasha numerical fixture and user-visible convention review |
| 33 `strongest_indicators` | `interpretChart` matched factors and internal `evidenceStrength` → strongest branch | Matched factor assembly tested | No source-reviewed strength ranking; “multiple factors” is not outcome strength; dignity conflicts do not become calibrated weights | Positive multi-factor and missing-rule behavior tested generically; no strongest-outcome pair | No ranking validity, timing, probability, or performance evaluation | Remove/rename ranking implication or get reviewed ranking criteria |
| 34 `calculated_yogas` | Calculated yoga/dosha catalog and literal conditions → yogas branch | Yoga/dosha matching and non-matching fixtures exist; internal convention only | No independent classical text/source verification; exceptions are limited to coded rule conditions | Positive and negative rule fixtures in `yogas.test.mjs`; not life-outcome prediction cases | No outcome timing/probability/performance | Source/reviewer verification and independent chart reference cases |
| 35 `rahu_ketu` | Selected true/mean node placements, signs, houses, longitudes → nodes branch | Node placement/calculation tests exist; no interpretation outcome is produced | Placement is a calculated fact; no source-reviewed outcome meaning | Present/missing node evidence paths; no predictive P/N pair | No timing/probability/performance | Independent node references for numeric validation; interpretation remains unsupported |
| 36 `navamsa` | D9 placements, chart inputs, selected convention → varga branch | D9 internal boundary/mapping tests exist; no independent D9 fixture | Descriptive placement only; tradition-specific interpretation not source-reviewed | Mapping boundary tests; not an interpretation P/N case | No timing/probability/performance | Independent D9 reference fixture and reviewed school-specific interpretation |
| 37 `next_12_months_transits` | Selected instant, supported ayanamsa, local Swiss Ephemeris → long-transits branch | Locally calculated positions/ingress horizon and selected-instant regression tested; independent ingress reference limited | Astronomical transit facts, not life-event interpretation; no conflict/outcome rule | Selected-instant and no-natal-snapshot regression; no event-prediction cases | Ingress timing is astronomical only; no predictive performance evaluation | Independent ingress numerical reference/tolerance review |
| 38 `required_data` | Saved chart's validated birth inputs and calculation settings → required-data branch | Disclosure and missing input behavior tested | Input/provenance disclosure only, no interpretation | Present/missing fields; not prediction cases | Not applicable; no performance claim | Continue minimization and ensure disclosed inputs belong to selected chart |

### Prediction evidence summary

- **Calculation verified:** Internal tests exist for selected calculation
  surfaces (including KP candidate arithmetic, Dasha boundaries, yoga matches,
  varga boundaries, and selected-instant transits). This is not equivalent to
  independent numerical accuracy across every output or question.
- **Interpretation source-reviewed:** No outcome interpretation among these
  38 is recorded as source-reviewed. Project heuristics and technical
  astronomy/timekeeping references do not count as classical outcome-rule
  review.
- **Matching/non-matching cases tested:** Explicit deterministic rule
  positive/negative tests exist for parts of marriage candidate logic and
  yoga/dosha calculations. Most question tests validate evidence assembly or
  limitations, not paired interpretive outcomes.
- **Predictive performance evaluated:** None. There is no labeled outcome
  dataset, calibration procedure, or measured predictive accuracy.
- **Unresolved assumptions:** Astrological conventions differ; only the
  selected implementation conventions are computed. No question should be
  represented as a guaranteed outcome, scientific prediction, or calibrated
  probability.

The Phase 3 evidence-routing regression narrowed government/job timing
questions to Career, `career_dasha` to Career and Business, `business_start`
to Business, and `financial_timing` to Finances while retaining their Dasha
context. This excludes unrelated Education, Finance, or Career sections from
being presented as question-specific evidence; it does not add or validate an
event-prediction rule. See
[`PREDICTION_QUALITY_EVALUATION_V1.md`](./PREDICTION_QUALITY_EVALUATION_V1.md)
for the versioned 38-question evaluation.

## Proposed next work (no operations approved)

1. Configure an explicitly disposable PostgreSQL test database and verify its
   identity using the repository's guarded test runner before database tests or
   migration application.
2. Run authenticated browser tests with normal USER, ADMIN, and SUPER_ADMIN
   test accounts; do not bypass login.
3. Specify account lifecycle and role-management policy before implementing
   activation/deactivation or role changes. Include last-Super-Admin
   protection and audit schema/events in that design.
4. Specify a payment provider, plans/currency, webhook trust model,
   idempotency, manual-review and refund policy before implementing payments.
   Until then, do not accept or claim payment or subscription support.
5. Require independent source review and documented positive/negative
   criteria before enabling any predictive interpretation; evaluate
   performance only with appropriate consented, de-identified outcome data
   and a documented evaluation protocol.
