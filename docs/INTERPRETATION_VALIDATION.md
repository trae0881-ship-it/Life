# Interpretation Validation v1.0

## Scope and review status

This worksheet covers the first two rule surfaces selected for independent
review:

- `relationships-2-7-8` — used by `marriage_factors` and
  `partner_indicators`.
- `career-6-10-11` — used by `government_indicators` and `career_growth`.

**Independent reviewer decision: PENDING.** No rule is source-verified,
approved, or promoted to `IMPLEMENTED` by this document.

## Calculation validation versus interpretation validation

Calculation validation checks numerical outputs such as planetary positions,
house cusps, and boundary behavior against a reliable reference fixture.
Interpretation validation checks whether a documented tradition actually
supports the stated house/planet meaning. A passing calculation fixture cannot
verify the interpretation, and an interpretation source cannot replace a
numerical calculation test.

The repository documents these as a **Parashari-style Rashi house-topic
heuristic**, with the relationship rule explicitly labelled a traditional
house-topic heuristic and the career rule labelled a Parashari house-topic
rule. This describes the software convention; it is not a claim that the
selected factors are universally accepted across Jyotisha traditions.

## Rule worksheet: relationships-2-7-8

| Field | Record |
|---|---|
| Intended meaning | Partnership and continuity are considered through the 7th house, with family/resources (2nd) and shared commitments (8th) as context. |
| Exact implementation | Selected house cusps/signs and their lords for houses 2, 7, 8; placements of Venus and Jupiter; available occupants and reported dignity. |
| Tradition/convention | Parashari-style Rashi house topics as recorded in `src/interpretation/catalog.ts`; the catalog calls this a traditional heuristic. |
| Source reference | No primary text, edition, author, passage, or independently verified secondary source is recorded in the repository. |
| Source status | **UNAVAILABLE / REVIEW REQUIRED**. Bibliographic verification and direct passage verification have not been completed. |
| Required facts | Valid calculated chart, ascendant or house cusps, houses 2/7/8, Venus, Jupiter, and usable provenance. |
| Supports | Reporting which chart facts matched the software rule and explaining that they are traditional relationship-context factors. |
| Cannot establish | Love-versus-arranged classification, a factual partner profile, compatibility with another person, relationship outcome, or event timing. |

## Rule worksheet: career-6-10-11

| Field | Record |
|---|---|
| Intended meaning | Work conditions, vocation, and gains are considered together through houses 6, 10, and 11. |
| Exact implementation | Selected house cusps/signs and their lords for houses 6, 10, 11; placements of Saturn, Sun, and Mercury; available occupants and reported dignity. |
| Tradition/convention | Parashari-style Rashi house topics as recorded in `src/interpretation/catalog.ts`; this is a broad traditional career-context rule, not a government-service rule. |
| Source reference | No primary text, edition, author, passage, or independently verified secondary source is recorded in the repository. |
| Source status | **UNAVAILABLE / REVIEW REQUIRED**. Bibliographic verification and direct passage verification have not been completed. |
| Required facts | Valid calculated chart, ascendant or house cusps, houses 6/10/11, Saturn, Sun, Mercury, and usable provenance. |
| Supports | Reporting which chart facts matched the software rule and explaining that they are traditional career-context factors. |
| Cannot establish | Government versus private employment, job selection, career growth, salary, success, timing, or any guaranteed outcome. |

## Fixture plan

The following fixtures are required for an independent reviewer. They are
specifications, not invented reference results:

| Fixture | Relationship rule | Career rule | Required assertion |
|---|---|---|---|
| Positive complete chart | All required houses and Venus/Jupiter present | All required houses and Saturn/Sun/Mercury present | Rule emits only the calculated factors and the stated limitation. |
| Negative/non-match chart | Required input exists but a selected rule condition is absent or the section has no matching interpretation | Same | No absent planet, house, outcome, or timing claim is invented. |
| Boundary chart | House cusp/sign transition and dignity boundary are represented | House cusp/sign transition and dignity boundary are represented | The engine reports the selected calculation convention consistently at the boundary. |
| Missing-input chart | Missing house cusp or Venus/Jupiter | Missing house cusp or Saturn/Sun/Mercury | Section becomes unavailable or reports missing evidence; it does not fall back to a generic personalized claim. |

The existing deterministic fixture in `tests/kundli-predictions.test.mjs`
provides a positive software-behavior fixture. It is not an independent
interpretation reference. The calculation engine's JPL fixtures validate
selected astronomical positions only; they do not validate these astrological
meanings.

## Reviewer checklist and outstanding evidence

1. Identify an exact edition and author for the claimed tradition.
2. Verify the bibliography independently.
3. Verify the actual passage that assigns the relevant house topics or
   planetary significations; a book listing, snippet, or secondary summary is
   insufficient.
4. Record the permitted excerpt or precise passage locator.
5. Record disagreements between Parashari, KP, Lal Kitab, and other traditions.
6. Review the positive, negative, boundary, and missing-input fixtures.
7. Confirm that the rule is descriptive and does not support outcome,
   probability, or event-timing claims.
8. Record reviewer identity, decision, approval status, and review date.

Until all eight steps are complete, the source status remains pending and the
question statuses remain `PARTIALLY_SUPPORTED`.
