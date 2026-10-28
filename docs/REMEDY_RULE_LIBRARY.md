# Remedy Rule Library v1.0

## Scope and safety

The library is a deterministic classification system for traditional practices.
It is not evidence that a remedy changes health, relationships, employment,
finances, or other outcomes. It must not recommend hazardous rituals, ingestion
of substances, animal harm, coercion, stopping prescribed treatment, costly
fear-based services, or guaranteed outcomes.

The existing eight catalog entries remain general practices. They are not
personalized merely because a chart contains a planet, sign, house, Dasha, yoga,
or dosha. Their traditions and current status are documented in the catalog
audit below.

## Rule lifecycle

Every candidate must use exactly one lifecycle state:

| State | Meaning | Can activate? |
|---|---|---|
| `DRAFT` | Initial proposal; criteria may be incomplete | No |
| `SOURCE_PENDING` | Method or source has not been verified | No |
| `REVIEW_REQUIRED` | Source or safety review remains | No |
| `APPROVED` | Complete criteria, source, safety, and reviewer approval | Yes, subject to all gates |
| `REJECTED` | Explicitly declined | No |
| `RETIRED` | Previously approved but no longer active | No |

Rules are never auto-approved. `isActivatableRemedyRule` requires:

- `APPROVED` lifecycle;
- verified source status;
- source title, author, passage locator, and edition/URL;
- non-empty required inputs and applicable factors;
- reviewer approval and review date;
- completed safety check and safety exclusions;
- deterministic matching against validated chart data.

The evaluator also deterministically sorts rules and suppresses duplicate
recommendations for the same remedy ID. Conflicting interpretations must remain
separate draft rules until a reviewer resolves the conflict; they cannot be
silently combined.

## Rule record

Each rule must record:

- stable rule ID and version;
- remedy ID and tradition/category;
- concerns;
- exact required chart inputs;
- applicable houses, planets, Dasha conditions, or other factors;
- matching and non-matching fixtures;
- source title, author, passage locator, edition or URL;
- source status: `verified`, `pending`, `unavailable`, or `disputed`;
- interpretation notes and known tradition disagreements;
- safety exclusions;
- reviewer, approval status, review date, and safety review;
- applicability confidence, kept separate from effectiveness.

No citation, quotation, correspondence, or traditional rule is added without a
verifiable source and human review.

## Current registry counts

- Draft candidates: **2**
- Source-verified candidates: **0**
- Approved rules: **0**
- Active production rules: **0**

The candidates are in `draftRemedyRules` in
`src/presentation/personalized-remedies.ts`:

- `candidate-planetary-discipline` — `SOURCE_PENDING`
- `candidate-dasha-reflection` — `REVIEW_REQUIRED`

Both intentionally return no match and cannot appear as user recommendations.

## Existing catalog audit

| Remedy | Tradition | Rule status |
|---|---|---|
| Gratitude and daily discipline | Saatvik | General only |
| Seva and transparent charity | Saatvik | General only |
| Simple prayer or mantra reflection | Saatvik | General only |
| Lal Kitab simple charity | Lal Kitab | No verified eligibility rule |
| Lal Kitab discipline | Lal Kitab | No verified eligibility rule |
| Tantra-informed devotional meditation | Tantra Parampara | No verified eligibility rule |
| Focused study session | Practical/Saatvik | Practical alternative |
| Chart-factor reflection | Educational/Saatvik | Not a remedial rule |

## Reviewer activation checklist

Before moving a rule to `APPROVED`, a reviewer must confirm:

- [ ] The rule has a stable ID, version, remedy ID, and tradition.
- [ ] Every required chart fact is supplied by the current engine and provenance-gated.
- [ ] Missing, uncertain, and conflicting inputs have explicit behavior.
- [ ] Matching and non-matching fixtures cover sign/house/Dasha boundaries.
- [ ] Start-inclusive/end-exclusive Dasha semantics are tested where relevant.
- [ ] The source is verifiable and its locator is recorded.
- [ ] Traditional disagreements are documented rather than hidden.
- [ ] Safety exclusions prohibit harmful, coercive, costly, or guaranteed claims.
- [ ] Reviewer identity, approval status, date, and safety check are recorded.
- [ ] Unknown costs remain unknown.
- [ ] English, Hindi, and Hinglish explanations are reviewed.
- [ ] Duplicate and contradictory recommendations have deterministic handling.
- [ ] No production database migration or remedy-history persistence is required
  without a separate approved schema change.

The production registry remains empty until this checklist is completed for at
least one rule.

Source-review worksheets for the current candidates are in
`docs/REMEDY_RULE_SOURCE_REVIEW.md`. They intentionally contain no invented
citations or excerpts. Safe disposable PostgreSQL setup and authenticated
integration-test instructions are in `docs/DISPOSABLE_POSTGRES_TESTING.md`.
