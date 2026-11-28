# Numerology Implementation Readiness

## Decision scope

This is a documentation-only readiness assessment. No calculation engine,
application behavior, database, report, or saved output is changed here.
Statuses apply to the historical procedure within the exact scope stated,
not to a broad tradition or interpretation system.

Status definitions:

- `READY_FOR_IMPLEMENTATION`: the bounded calculation is reproducible from
  the cited source examples and can be implemented without filling historical
  gaps.
- `PARTIALLY_VERIFIED`: evidence exists, but important rules or input cases
  remain unspecified.
- `SOURCE_INCONSISTENCY`: the source contains contradictory or arithmetically
  incompatible evidence that blocks a faithful general implementation.
- `UNRESOLVED`: evidence does not establish a general calculation procedure.
- `BLOCKED`: required primary evidence is inaccessible or otherwise not
  available for verification.

## Status by method

| Method | Status | Reason and safe scope |
|---|---|---|
| Balliett, 1908 (Name and Birth Vibration) | `PARTIALLY_VERIFIED` | The p. 17 mapping, Henry Elder name procedure, and January 17, 1872 birth procedure are clear. However, p. 90's Wanamaker “birth numbers 9, 11” conflicts with the p. 19 pattern, and name/date input normalization is not specified. Do not claim a complete Balliett system. |
| Cheiro, inspected “Complete Edition, Revised” core name calculation | `READY_FOR_IMPLEMENTATION` | The p. 70 mapping and word-root/compound procedure reproduce John Smith, Lloyd George, and Napoleon Bonaparte. Safe scope is the edition-specific table, word-by-word totals/roots, preserved name compound, and day-of-month Birth Number only. Explicitly label the source as the revised scan with 1959 India copyright and unknown exact printing year; do not attribute it to 1927. |
| Sepharial Hebraic | `UNRESOLVED` | The p. 30 value table is verified, but p. 26's printed Napoleone/Buonaparte totals cannot be reconstructed from that table and no complete general name procedure is established. The table alone is not an engine specification. |
| Sepharial Pythagorean, 1911 | `SOURCE_INCONSISTENCY` | The p. 30 table omits W, but the p. 34 William example assigns W=4; p. 34-35 also print combined `312` without a demonstrated arithmetic construction. Do not silently add W or invent the combination rule. |
| Sepharial Phonetic, 1911 | `PARTIALLY_VERIFIED` | The p. 30 sound-value table and examples are available, but pronunciation and transliteration rules are not general. A spelling-based engine would invent missing sound rules. Preserve source vectors only until pronunciation policy is established from primary evidence. |
| Sepharial Tarot Signature, 1911 | `SOURCE_INCONSISTENCY` | The John Milton example establishes the broad positional method, but p. 39 has an ambiguous first operator and p. 40 prints `1712=13`, although digit sum is 11. Do not silently repair the source or generalize an output rule. |
| Sepharial Table of Three, 1911 | `PARTIALLY_VERIFIED` | The two layouts and one dated/time example are documented. General time cutoffs, date normalization, century treatment, and chart-placement behavior are not established by that example. |
| Johari | `BLOCKED` | The 1990 Internet Archive OCR and scan derivatives are marked private/access-restricted. No authorized full text or source-backed calculation was verified. Do not access or bypass restricted derivatives. |
| “Kiro” | `UNRESOLVED` | No exact author, title, edition, or primary source establishes what method this label denotes. Do not equate it with Cheiro. |
| “Adhunik” | `UNRESOLVED` | No authoritative title, author, edition, or primary text establishes a calculation method. |

## Safe implementation boundary

Only the bounded Cheiro core calculation is ready for implementation from the
current evidence, and only as a distinct, edition-labelled method. This does
not include compound-number interpretations, lucky-day recommendations,
compatibility claims, or other predictive assertions. Its matching alphabet
table does not permit replacing or relabelling LIFE's existing Chaldean
engine.

For the remaining methods, the source mapping or worked example may be
retained as documentation/test-vector material, but is not sufficient to
claim a general implementation. In particular:

- Do not merge Balliett into LIFE's generic Pythagorean method.
- Do not merge Cheiro into LIFE's existing Chaldean method.
- Do not combine Sepharial variants or editions.
- Do not convert phonetic spellings to sounds without a verified policy.
- Do not repair a printed source inconsistency by choosing a plausible rule.
- Do not infer Johari, Kiro, or Adhunik rules.

If software input policy is later approved, distinguish it from historical
rules. A conservative adapter may reject unsupported punctuation, accents,
scripts, or ambiguous name segmentation rather than silently strip or
transliterate them. That adapter behavior must be documented as LIFE policy,
not attributed to the author.

## Recommended order after approval

1. Implement only the bounded, versioned Cheiro revised-edition core and
   create regression fixtures from John Smith, Lloyd George, and Napoleon
   Bonaparte. Preserve the edition citation with the method identifier.
2. Resolve and approve a restricted Balliett scope. Keep p. 90 as a known
   non-matching source case; do not alter the p. 19 procedure to fit it.
3. Keep Sepharial Pythagorean and Tarot blocked from general use until the
   source inconsistencies are explicitly resolved or the implementation is
   limited to separately labelled, verbatim examples.
4. Seek additional primary evidence for the general Sepharial Hebraic,
   Phonetic, and Table of Three procedures. For Phonetic, evidence must define
   the pronunciation/transliteration input rather than assume it.
5. Keep Johari, Kiro, and Adhunik unsupported until their exact, accessible,
   authenticated primary sources and intended variants are identified.

## Existing LIFE behavior to preserve

This readiness document does not authorize changes to:

- Existing Pythagorean or Chaldean engines.
- Lo Shu calculations or DOB-only versus Indian Extended distinctions.
- Kua calculations.
- Saved reports, dashboard, database schema, or pending migrations.
- Any existing calculation output or interpretation.

Implementation would require separate approval, isolated method identifiers,
source-derived test vectors, and regression tests proving existing outputs
remain unchanged.
