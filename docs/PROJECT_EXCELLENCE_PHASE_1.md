# Project Excellence Initiative — Phase 1

Audit date: 2026-10-19

## Prioritized plan based on current source

1. **Question evidence fidelity (implemented in this stage).** Keep each
   question on its relevant calculated section; expose internal convention,
   provenance description, matched conditions, and any conflicts; do not
   imply source review or predictive validity.
2. **Evidence gaps in deterministic facts.** Continue with Dasha, KP, yoga,
   node, D9, and transit fact coverage. Add missing-input, boundary, and
   positive/negative tests only where the code contract is well-defined. Do
   not add outcome rules without a reviewed source and explicit criteria.
3. **Independent numerical validation.** Keep existing JPL/Horizons fixture
   scope and tolerances explicit; prioritize additional epochs/locations and
   independent houses, time conversion, Dasha, KP, varga, and Panchanga
   fixtures. See `CALCULATION_VALIDATION_MATRIX.md`.
4. **Secure integration verification.** Configure a verified disposable
   PostgreSQL database and normal USER/ADMIN/SUPER_ADMIN accounts before
   testing persistent ownership, role isolation, and audit writes. No live
   database is used as a fallback.
5. **Product decisions before new admin/payment surfaces.** The public
   verification privacy exposure was mitigated in Phase 5: ordinary
   acknowledgements are local-only, and authenticated approval reads are
   reviewer-scoped and omit notes/account metadata. Role and account lifecycle
   policy plus a payment provider/business contract are still required before
   implementing those controls.

## Phase 2: Kundli Details and public footer

Removed the promotional footer tagline and the public-facing `/api/health`
link while retaining the legal links and the health route itself. A regression
test checks the rendered-footer source contract and confirms the route and
internal engine-health fetch remain present.

Added one localized Kundli Details projection shared by the live chart and the
account saved-report view. It surfaces 12 existing Moon sign, entered name,
Lagna, birth Dasha balance, Tithi, Nakshatra/Pada, Yoga, Karana, sunrise,
Rashi Swami and Nakshatra Swami values. Source review added deterministic
Yoni/Gana/Nadi mappings from the calculated Moon Nakshatra and Moon-Rashi
Varna. Their selected Asta Koota conventions, complete tables, and variants
are documented in `CALCULATION_METHODS.md`; all values are localized in the
three existing languages. These are traditional classifications, not claims
about a person's identity, character, health, compatibility, or outcomes.
Ishtkaal and Nakshatra Paya remain explicitly unavailable because their
conventions have not been established. The full source/input/UI/localization/
test/reference status is in `KUNDLI_DETAILS_IMPLEMENTATION_MATRIX.md`.

No schema change or migration was made. The profile editor's `label` remains
distinct from a chart's optional user-entered `fullName`.
The saved-chart list now uses stable newest-first ordering (creation time,
then ID) before the profile shortcut selects its first matching report.
Ownership and persistence remain unit/source-tested only; no database or
authenticated browser verification was performed.

## Stage 1 implementation

The assistant source is
`src/presentation/kundli-assistant.ts`. The authenticated POST path is
`src/app/api/assistant/questions/route.ts`: it resolves the session user,
checks current terms, loads the selected profile and linked saved chart by
that user's ID, and validates that the saved-chart birth input matches the
profile before calling `answerKundliQuestion`.

Two evidence-quality defects were confirmed and fixed:

1. Career questions used a broad `career` category that included both
   `Career` and `Education` interpretations. That could present education
   evidence as support for career growth or government indicators. Career
   questions now use only the Career section; `competitive_exams` uses only
   Education. Missing Career factors now return the existing unavailable
   state rather than unrelated Education evidence.
2. Question evidence reduced interpretations to title/factors, silently
   omitting the convention, rule-provenance description, matched conditions,
   and any recorded conflicts. Evidence now exposes those fields, labels
   convention text as not a source-reviewed outcome rule, and reports
   conflicts without assigning a score or outcome.

Project-selected relationship/career/foreign context is now explicitly
described as selected chart context, not a source-reviewed outcome rule.
Astrological criteria, timing algorithms, chart computations, and user
profile selection were not changed.

Regression tests cover matching career-vs-education evidence, unavailable
Career evidence, matched chart conditions, reported dignity conflict, and
retention of financial evidence isolation. These tests validate deterministic
fixtures only; they do not validate real-world outcomes.

## Question-by-question audit

The full per-question record—including required details and chart inputs,
actual dispatch path, calculation evidence, interpretations and provenance,
exceptions/conflicts, timing limits, positive/negative tests, unsupported
assumptions, responsible conclusions, and next gaps—is maintained in
`PHASE_D_PRODUCTION_AUDIT.md`. The 38 IDs and original implementation status
remain in `ANSWER_COVERAGE_MATRIX.md`; statuses are not predictive-accuracy
claims.

No question has evaluated predictive performance. No outcome interpretation
is currently recorded as source-reviewed. Exact classical source passages
and review decisions have not been supplied for marriage, career, finance,
property, compatibility, foreign settlement, or similar outcome claims.
Candidate marriage windows and Dasha contexts remain conditional traditional
calculations, not event guarantees, probabilities, or scientifically
validated outcomes.

## Independent calculation verification status

| Calculation | Current evidence | Independent reference status / limits |
|---|---|---|
| Tropical longitude/latitude | Internal engine repeatability, range, no-fallback, and asset integrity tests | JPL Horizons DE441 offline fixtures cover 10 bodies at 2000-01-01 and Sun/Moon/Mars at 2024-06-21; declared 0.5 arcsecond longitude/latitude tolerance. Not a broad all-epochs/all-bodies guarantee. |
| Mercury motion | Internal signed-speed and retrograde tests | One 2024-04-15 DE441 adjacent-sample comparison for Mercury longitude and rate; limited to that case. |
| Sidereal positions | Internal tropical-minus-selected-ayanamsa consistency check | No independent sidereal-position fixture. Lahiri/Raman/Krishnamurti comparisons remain convention/software tests. |
| House cusps, Lagna, D1 | Internal deterministic and finite/range checks, using local Swiss house routines | No independent house-cusp fixture; no independent validation of location/time conventions. |
| D2–D60 | Internal mapping and segment-boundary tests; D9/D10 preserve existing mapping | No independent numerical fixture across vargas. Some factors intentionally use labeled custom cyclic conventions. |
| Vimshottari Dasha | Internal sequence, duration, contiguity, and half-open-boundary tests; proportional rule has a documented text reference | No independent chart-output fixture; convention and year-length choices remain implementation inputs. |
| KP | Internal star/sub/sub-sub boundary and significator tests | No independent KP chart fixture; project-defined four-fold significator and Placidus conventions are not independently validated as astrology. |
| Panchanga | Internal angular division and boundary tests | No full independent Panchanga fixture/reference set. |
| Sunrise/sunset/moonrise/moonset and Vara | Internal actual-event/no-event and sunrise-boundary tests | Selected published reference event/day-length checks exist; not a broad refraction/altitude validation. Sea-level/default-refraction and UTC-as-UT1 limitations remain. |
| Transits / ingress | Internal local search, ordering, and sub-second refinement tests; selected-instant question regression | Limited independent ingress comparison; no independent broad transit fixture set. |
| Dignity, aspects, Yogas/Doshas | Internal deterministic rule and matching/non-matching unit cases | No independent classical-text verification for the entire rule set. Project conventions and broad/school-dependent conditions remain disclosed. |

Details, coordinate frames, time scale, ayanamsha, house systems, tolerances,
rounding, boundary conventions, and references are maintained in
`CALCULATION_VALIDATION_MATRIX.md` and `CALCULATION_METHODS.md`. Internal
invariants and repeated runs are not independent reference evidence.

## Super Admin and User Panel controls

Current access and User Panel findings are in `PHASE_D_PRODUCTION_AUDIT.md`
and `VERIFICATION_INVENTORY.md`. Existing protected Super Admin APIs are
server-role-guarded; profile, saved-chart, and question APIs use owner-scoped
data access. These source findings and mocks are not DB integration evidence.

Account activation/deactivation, role assignment, settings, cross-account
report inspection/export, plans, payments, refunds, and OTP operations are
absent or require product decisions. No such API is added here. Before any
role or lifecycle endpoint, require explicit SUPER_ADMIN policy, independent
session-role checks, transactionally enforced last-usable-Super-Admin
protection, audit events without unnecessary personal data, and positive and
negative mocked plus disposable-DB tests.

Phase 5 mitigates the public verification checklist's free-text acknowledgement
exposure: labels/notes are local-only, and authenticated approval reads are
reviewer-scoped with notes/account metadata omitted. No production reads or
writes were performed.

### Proposed permission policy for future modules

This is a proposal, not an implemented authorization policy. Existing routes
must remain unchanged until product/security review approves the scope.

| Feature | Current state | Proposed authorized actor | Proposed minimum controls / decision |
|---|---|---|---|
| Account lifecycle (activate/deactivate) | Missing | SUPER_ADMIN only | Require explicit reason, step-up authentication if supported, prevent deactivation of the last usable Super Admin, revoke sessions on deactivation, transactional state+audit, reversible/reactivation path, and no silent bulk operation. Decide whether account suspension is a product feature. |
| Role assignment / privilege changes | Missing | SUPER_ADMIN only; separate from ADMIN | Never accept actor/target role from client as authority; re-read actor role in transaction; prevent last usable Super Admin demotion; audit before/after role names and target opaque ID; consider dual approval for assigning SUPER_ADMIN. Define role policy before implementation. |
| Platform settings | Missing | SUPER_ADMIN only | Allowlist typed settings, validate server-side, audit old/new non-secret values; secrets managed outside this table through deployment secret management. Product must define setting catalog and impact. |
| Audit logs | Read-only Super Admin viewer exists | SUPER_ADMIN read-only | Append-only, minimal fields, bounded filters, no secret/payload display, defined retention and failure semantics. Decide whether to audit denied attempts without retaining sensitive request data. |
| Cross-account reports | Missing | SUPER_ADMIN only only if operationally necessary | Default deny; case/reason-bound access, minimum selected fields, transactional access audit, no export until purpose/retention are approved. Prefer aggregate view where sufficient. |
| Plans | Missing | Product decision; restricted operator roles after decision | Define plan IDs, prices, currency, taxes, entitlement mapping, versioning, effective dates, and whether admins can modify plans. No client-selected price authority. |
| Payment records | Missing | SUPER_ADMIN read-only for support; payment service owns state transition | Minimize to provider reference, amount/currency, timestamps, and status; redact credentials and payment instruments. Webhook verification and reconciliation are service-side, not an admin action. |
| Offline payment approval | Missing | Explicitly authorized finance/reviewer role; product decision | Two-person review if required; pending/approved/rejected state, proof retention limits, evidence checks, immutable decision audit, no activation before recorded approval. Do not infer authority from `DEVELOPER` or `ADMIN`. |
| Refunds | Missing | Provider decision plus explicitly authorized finance role | Provider-supported idempotent request; separate `refund_pending` from completed states; audit actor/reason/provider reference; no direct database status edit or fabricated success. |
| OTP operations | Missing | No role may read raw OTP; restricted service/support actions only after product/security decision | Store hashes only, short expiry, rate limits, one-time use, no admin reveal/reset-by-read endpoint, audit only metadata. Define recovery and lockout policy. |

## Provider-neutral payment preparation

No provider, plan, price, currency, payment, subscription, refund, or OTP
system exists in the inspected schema/routes. This is a design outline only;
it does not prescribe a provider or authorize a migration/write.

Before implementation, product/security owners must select a provider and
regions/currencies, define server-owned plan/prices/taxes, payment capture
policy, subscription entitlements and expiry, offline-proof policy, refund
eligibility, support/retention requirements, and administrative approval
roles.

Provider-neutral invariants for a later design:

1. Create a pending payment intent from a server-selected plan and price;
   never trust client-submitted price, entitlement, or paid status.
2. Verify a provider callback/webhook using the provider's documented
   signature over the raw request bytes, timestamp/replay window, and
   constant-time secret comparison. Do not log secrets or raw payment
   credentials.
3. Persist each provider event ID under a unique constraint; verify event
   identity and payment amount/currency/merchant/reference against the
   server-created intent; apply a verified event and its subscription
   transition transactionally and idempotently.
4. Keep payment and subscription state machines separate. Example payment
   states: `pending`, `authorized`, `captured`, `failed`, `cancelled`,
   `refund_pending`, `partially_refunded`, `refunded`; example subscription
   states: `inactive`, `active`, `past_due`, `cancelled`, `expired`. Exact
   states and transitions require product/provider decisions.
5. Activate entitlement only after independently verified provider evidence
   or an explicit authorized manual approval. Offline proof must remain
   `pending_review` until an authorized reviewer records an approval/rejection
   event; never mark it paid from an upload or client claim.
6. Trigger refunds only through a provider-supported, verified flow. Record
   the provider refund reference and reconcile asynchronous final states;
   a refund request is not a completed refund.
7. Audit privileged plan/payment decisions with actor, action, object
   reference, outcome, and timestamp only as needed. Exclude card data,
   gateway secrets, OTP values, raw proof documents, tokens, and unnecessary
   personal data. Define retention, access controls, failure semantics, and
   review requirements before schema design.
8. Test signature failures, replay/duplicate events, mismatched amount or
   currency, out-of-order events, transactional failure, unauthorized manual
   approval, and redaction with deterministic provider mocks. Never call a
   live payment, refund, or production subscription mutation in tests.

## Verification boundaries and next stage

No live database was accessed. No migration, payment, production role change,
or production write is proposed. The current authenticated browser state does
not supply a normal test account/session; authenticated browser checks remain
blocked. Disposable PostgreSQL integration remains blocked until a dedicated
test database is configured and verified.

## Proposed next phase: deterministic coverage for all 38 questions

The current question catalog and actual answer paths are already recorded in
`PHASE_D_PRODUCTION_AUDIT.md` and `ANSWER_COVERAGE_MATRIX.md`. The work should
be staged by question group; no batch raises a question's predictive-evidence
level merely by adding software tests.

| Batch | Question IDs | Deterministic scope |
|---|---|---|
| 1. Factual baselines | `current_dasha` (32), `calculated_yogas` (34), `rahu_ketu` (35), `navamsa` (36), `next_12_months_transits` (37), `required_data` (38), `marriage_limitations` (8) | Assert exact server-side source facts, selected-profile/chart association, boundaries, missing-data behavior, provenance, and no natal-transit leakage into future events. Do not add outcomes. |
| 2. Career/education | `government_timing` (9), `government_indicators` (10), `job_type_comparison` (11), `government_dasha` (12), `career_growth` (13), `job_transit_dasha` (14), `competitive_exams` (15), `career_delay` (16), `new_job_timing` (17), `job_change` (18) | Verify Career/Education separation, relevant positive and negative chart factors, missing inputs, and honest no-rule limitations for unsupported employment/timing claims. |
| 3. Business/finance/property | `business_start` (19), `business_job_difference` (20), `partnership_business` (21), `career_dasha` (22), `financial_growth` (23), `income_savings` (24), `property` (25), `business_career_income` (26), `financial_timing` (27) | Verify category isolation, chart-fact provenance, selected date/Dasha boundaries where applicable, and limitations instead of rankings, purchase dates, or wealth claims. |
| 4. Foreign travel/relocation | `foreign_timing` (28), `foreign_travel_indicators` (29), `foreign_settlement` (30), `abroad_job_study` (31) | Verify only the requested houses/facts are used; absence of a reviewed event rule must remain an explicit limitation, not a date or promise. |
| 5. Relationships | `marriage_timing` (1), `partner_timing` (2), `love_arranged` (3), `marriage_dasha` (4), `marriage_factors` (5), `partner_indicators` (6), `compatibility` (7) | Verify selected user/profile/chart ownership, KP/Dasha facts and their boundaries, missing second-chart behavior, and separation of calculated candidates from unsupported relationship outcomes. |
| 6. Cross-cutting answer contract | All 38 IDs | For each ID, keep a stable fixture with positive, negative, missing-input, and relevant boundary cases; assert localization, deterministic response shape, evidence provenance, no cross-topic evidence, and explicit limitations. Record calculation-tested, source-reviewed, case-tested, and predictive-evaluation statuses separately. |

Execution order: first freeze the current catalog IDs and answer-path
inventory; then finish batch 1 and run focused tests; continue one group at a
time, updating the coverage matrix in the same change as each test batch.
Add deterministic logic only for chart facts whose input and convention
already exist. Any interpretation change requires an identified source,
conditions, exceptions, conflicts, a review record, and positive/negative
tests before implementation. If those prerequisites are absent, improve the
localized limitation response and leave the predictive rule unsupported.
Do not generate accuracy percentages, probabilities, event dates, or
guarantees. Run the full suite/typecheck/build after all batches; authenticated
browser and PostgreSQL checks still require a normal authorized account and
a positively verified disposable test database.
