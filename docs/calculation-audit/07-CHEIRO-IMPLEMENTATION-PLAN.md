# Cheiro Revised-Edition Implementation Plan

## Status

Planning and code audit only. No calculation, UI, API, database, test, or
report code has been changed. Implementation requires explicit approval.

The source boundary is the scanned *Cheiro's Book of Numbers*, “Complete
Edition, Revised.” Its copyright page says copyright 1959 in India; the
printing year is unknown. This plan does not attribute it to the separate
1927 Google Books record. See the edition evidence and page citations in
[`02-NUMEROLOGY-CALCULATION-AUDIT.md`](./02-NUMEROLOGY-CALCULATION-AUDIT.md)
and
[`04-NUMEROLOGY-SOURCE-TRACEABILITY.md`](./04-NUMEROLOGY-SOURCE-TRACEABILITY.md).

## Existing LIFE architecture audit

| Area | Existing implementation | Implication for Cheiro |
|---|---|---|
| Calculation engines | [`src/calculation/numerology.ts`](../../src/calculation/numerology.ts) exports `NumerologySystem = "chaldean" | "pythagorean"`, the `calculateNameName()` API, the current Chaldean/Pythagorean maps, and `createNumerologyReport()`. The Chaldean map matches the revised scan's p. 70 table. `calculateNameName()` normalizes a full name, sums all mapped letters into one expression compound, then reduces it. | Do not add Cheiro to `NumerologySystem`, route it through `calculateNameName()`, or replace either map. Those APIs serve many other calculations. |
| Public calculation/result types | The calculation module also exports or uses `LoShuMode`, `NumerologyLanguage`, `NumerologyReportSection`, `UnifiedNumerologyProfile`, `NumerologyComparison`, and other existing result shapes. There is no Cheiro-specific method or result type. | Define new Cheiro result types in the isolated module. Do not widen or repurpose existing report/profile types for this method. |
| Shared name normalization | The same module's `normalizeName()` applies NFKD, removes combining marks, uppercases, supports a limited Devanagari transliteration, permits apostrophe/period/hyphen, and converts other non-Latin characters to spaces. | This is existing LIFE policy, not verified Cheiro policy. A Cheiro adapter must not silently reuse it. |
| Reused calculation services | [`src/calculation/numerology-recommendations.ts`](../../src/calculation/numerology-recommendations.ts) and comparison/profile helpers call the existing `calculateNameName()` and accept `NumerologySystem`. | Keep Cheiro out of recommendations, compatibility scoring, and existing profile calculations unless separately source-backed and approved. |
| Report generation | `createNumerologyReport()` returns the existing 30-section report using the selected existing system, DOB calculations, Lo Shu, cycles, and interpretations. [`src/app/AstrologyServiceWorkspace.tsx`](../../src/app/AstrologyServiceWorkspace.tsx) creates it from the Pythagorean/Chaldean selector. | Do not present a Cheiro calculation as the existing 30-section report or reuse unrelated LIFE interpretations. A future Cheiro view should show only source-supported numeric evidence. |
| Save/reopen/print | The workspace saves and loads readings through `/api/astrology-readings`; it opens JSON payloads, prints them, and exports reports. Its history detail renderer currently understands generic `sections`, Tarot `cards`, or a string `interpretation`; a Cheiro word breakdown needs its own renderer. | A future UI integration must display a Cheiro payload explicitly. Reopening must preserve its method identifier and word totals. |
| API/service boundary | [`src/server/astrology-readings.ts`](../../src/server/astrology-readings.ts) allowlists `ank-jyotish` as a saved-reading service. `src/app/api/astrology-readings/route.ts` requires an authenticated user, validates a bounded JSON payload and associates it with that user. GET filters by user and service. DELETE filters by reading ID and user ID. | Keep the service as `ank-jyotish`; distinguish the calculation using a payload `methodId`. If exposed, add payload validation for this method without weakening existing ownership checks. |
| Persistence | [`SavedAstrologyReading`](../../prisma/schema.prisma) stores `userId`, `service`, `title`, a generic `Json` payload, and `createdAt`; it relates to `User` and is indexed by `[userId, service, createdAt]`. | No new table or migration is required for a versioned method marker and numeric result in the existing payload. |
| Test architecture | Existing numerology tests are `.mjs` files importing TypeScript calculation modules, run by the Node test runner through `npm test`. | Add a focused `.mjs` regression file for the new pure module, then run all existing tests after implementation approval. |

## Proposed isolated architecture

### Method identifier and source metadata

Use a distinct, stable method ID:

```text
cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1
```

The display/source metadata should read:

```text
Cheiro's Book of Numbers — Complete Edition, Revised
Copyright-marked 1959 in India; exact printing year unknown
Source pages: 70-72, 86, 90, 94
```

Do not label the method as “1927,” “the 1927 edition,” or a generic,
edition-independent “Cheiro” method.

The proposed exported calculation surface is:

```ts
export const CHEIRO_REVISED_METHOD_ID =
  "cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1";

export function calculateCheiroNameNumber(name: string): CheiroNameResult;
export function calculateCheiroBirthNumber(
  dayOfMonth: number,
): CheiroBirthNumberResult;
```

Name and birth calculations remain separate calls and result types. There is
no Cheiro option in the existing `NumerologySystem` type.

### Proposed files and responsibilities

| Proposed path | Responsibility |
|---|---|
| `src/calculation/cheiro-revised.ts` | New, pure, isolated mapping, strict input validation, per-word calculation, and day-of-month Birth Number function. Define Cheiro-specific types and the method ID here. Do not import `calculateNameName()` or change `NumerologySystem`. |
| `tests/cheiro-revised.test.mjs` | Source-vector tests, mapping invariants, validation errors, output shape, and regression assertions for existing Chaldean/Pythagorean results. |
| `src/app/AstrologyServiceWorkspace.tsx` | Future optional, explicitly selected Cheiro result view and its saved-report rendering. Keep the existing system selector and report path unchanged. |
| `src/server/astrology-readings.ts` | Future optional validation of the Cheiro payload discriminant and shape. Keep `ank-jyotish` service and ownership policy unchanged. |
| `src/app/api/astrology-readings/route.ts` and `src/app/api/astrology-readings/[readingId]/route.ts` | No route/schema redesign is planned. Touch only if payload validation or integration requires it; preserve authentication, same-origin mutation checks, and user-scoped reads/deletes. |

The first implementation slice should be the pure calculation module and its
tests. UI and saved-report integration are a separate step, only after the
calculation slice passes review. Do not change the Prisma schema or migrations.

## Source rules versus LIFE software policy

### Verified historical rules

1. Use the revised scan's p. 70 Chaldean table: 1=A/I/J/Q/Y; 2=B/K/R;
   3=C/G/L/S; 4=D/M/T; 5=E/H/N/X; 6=U/V/W; 7=O/Z; 8=F/P; no letter=9.
2. Calculate each word separately by summing its letter values.
3. Reduce each word total to its single number.
4. Add the word roots to form the combined name compound number. Preserve
   this compound; its single-number reduction may also be reported.
5. The Birth Number is based on the day of the month. Reduce the day while
   retaining the original day value as the compound input. Do not use month,
   year, or the full-date digit sum to calculate this number.

The source does not specify a modern normalization, punctuation, transliteration,
or arbitrary-name segmentation algorithm. These remain software input policy,
not Cheiro rules.

### Proposed LIFE software input policy

Use a strict input contract so no historical transliteration or punctuation
rule is invented:

- Require a non-empty name of at most 100 characters, matching the existing
  name-field length limit.
- Accept ASCII letters A-Z/a-z with exactly one ordinary space between
  explicit words. Case-fold ASCII letters to uppercase for lookup only.
- Do not trim or collapse whitespace. Reject leading/trailing spaces,
  repeated spaces, tabs, or line breaks rather than silently changing
  word boundaries.
- Reject punctuation. Give hyphens/apostrophes that could encode either a
  name character or a word boundary a specific ambiguous-segmentation error.
  Other punctuation, such as a comma, gets an unsupported-punctuation error.
- Reject diacritics, non-ASCII Latin characters, Devanagari, CJK, and mixed
  scripts. Do not call `normalizeName()`, perform NFKD accent removal, or
  transliterate.
- Every explicitly space-separated token is counted as a word. Do not drop
  titles, particles, suffixes, or any token automatically. A concatenated
  unspaced value is treated as one supplied word; never infer where it should
  be split.

Suggested validation error codes are `EMPTY_NAME`, `NAME_TOO_LONG`,
`INVALID_WORD_SPACING`, `AMBIGUOUS_WORD_SEGMENTATION`,
`UNSUPPORTED_PUNCTUATION`, and `UNSUPPORTED_SCRIPT`. Error messages should
tell the user how to provide explicit ASCII word boundaries without claiming
the restriction is historical.

For dates, keep this calculation concept separate:

- `calculateCheiroBirthNumber(dayOfMonth)` accepts an integer from 1 through
  31, returns the original day and its reduced Birth Number, and does not
  accept or calculate a full-date number.
- If a later report UI starts with a DOB string, the adapter may use the
  existing `parseIsoDate()` for LIFE's supported calendar-date validation,
  then pass only its `day` to this function. Do not reuse or rename
  `moolank`, `bhagyank`, or `lifePath` in the Cheiro result.
- Reject non-integers and values outside 1-31.

## Proposed calculation output

Types remain local to `cheiro-revised.ts`; they do not widen existing
numerology types.

```ts
type CheiroWordResult = {
  inputWord: string;
  normalizedWord: string;
  rawTotal: number;
  root: number;
  letterBreakdown: Array<{ letter: string; value: number }>;
};

type CheiroNameResult = {
  methodId: "cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1";
  methodVersion: 1;
  sourceEdition: "Complete Edition, Revised";
  copyrightYear: 1959;
  printingYear: null;
  words: CheiroWordResult[];
  compoundNameNumber: number;
  // Auxiliary digit reduction; never substitutes for the preserved compound.
  nameRoot: number;
};

type CheiroBirthNumberResult = {
  concept: "cheiro-birth-number";
  dayOfMonth: number;
  birthNumber: number;
};
```

The compound name number is the sum of word roots, not the sum of all raw
letter totals. Keep raw word totals and word roots independently. The final
`nameRoot` is an auxiliary digit reduction: p. 86 explicitly reduces 17 to 8,
but other examples preserve and interpret compound 16 or 13. Never replace
those compounds with the derived root or imply that Cheiro's compound
interpretation is the same as the root. Do not use the existing
`keepMasterNumbers` option; the cited procedure reduces each word to a single
number and preserves the compound of those roots.

## Source-vector calculations

The p. 70 mapping and p. 71-72, 86, 94 examples establish these fixtures:

| Name | Word totals and roots | Combined compound | Final root |
|---|---|---:|---:|
| John Smith | John 18 -> 9; Smith 17 -> 8 | 17 | 8 |
| Lloyd George | Lloyd 18 -> 9; George 25 -> 7 | 16 | 7 |
| David Lloyd George | David 16 -> 7; Lloyd 18 -> 9; George 25 -> 7 | 23 | 5 |
| Napoleon Bonaparte | Napoleon 41 -> 5; Bonaparte 35 -> 8 | 13 | 4 |

For Napoleon and Bonaparte, the scan gives the word numbers 5 and 8 and
compound 13; raw totals 41 and 35 are independently summed from the verified
p. 70 table, not printed raw totals. The combined root 4 is also a software
digit reduction, not the source's p. 94 compound interpretation. Preserve
these distinctions in comments and test names.

Birth Number fixtures are separate from name results:

| Day of month | Preserved day input | Birth Number |
|---:|---:|---:|
| 8 | 8 | 8 |
| 17 | 17 | 8 |
| 1 | 1 | 1 |
| 10 | 10 | 1 |
| 19 | 19 | 1 |
| 28 | 28 | 1 |

The 8 January John Smith case is on p. 86; Lloyd George's January 17 birth
number is discussed on p. 72; the day reductions 1/10/19/28 are on p. 90.
No full date is needed for these fixtures.

## Integration boundary

If report integration is approved after the core calculation:

1. Keep `NumerologySystem` as `"chaldean" | "pythagorean"` and retain the
   existing report-generating call path for both values.
2. Add a separate method selection/branch for the Cheiro method ID. Do not
   map it to `"chaldean"` even though the letter table is the same.
3. Render only source-backed word totals, roots, compound name number, and
   day-based Birth Number. Do not reuse the existing 30-section report,
   recommendations, compatibility results, or interpretations as Cheiro
   content.
4. If saved, store `methodId`, `methodVersion`, source metadata, calculation
   results, and the submitted DOB in the existing `SavedAstrologyReading`
   JSON payload under service `ank-jyotish`. Do not add a Prisma model or
   migration for this method.
5. Add a Cheiro-specific history-detail renderer so opening a saved result
   displays its word breakdown. Keep existing open, delete, print, and export
   behavior for other reports unchanged.
6. Preserve current user ownership and route controls. Add server validation
   for the method ID/payload if the new payload is accepted by the API; do not
   create an unvalidated alternate save path.
7. Do not compare Cheiro compounds to current Chaldean compounds as equivalent.
   Any comparison must identify method IDs and mark the calculation
   procedures as different.

## Acceptance criteria for a future implementation

- New method ID and source metadata identify only the inspected revised scan;
  no attribution to the 1927 record.
- New calculation code is isolated from `calculateNameName()` and does not
  modify the existing Chaldean/Pythagorean mappings or outputs.
- Word raw totals, word roots, compound name number, and final root are all
  preserved in the typed result.
- Birth Number is calculated from day-of-month only, in a separate result
  type and API; it is not substituted for full-date Bhagyank.
- All source vectors in this plan pass exactly.
- Strict input errors are explicit, and no unsupported punctuation, script,
  or ambiguous segmentation is silently stripped or transliterated.
- Existing Pythagorean and Chaldean regression fixtures and the full existing
  test suite pass unchanged.
- Any future saved report retains method ID/version and can be reopened
  without losing its word breakdown.
- No database schema/migration, dashboard, auth, admin, or existing
  calculation behavior changes are included in this method.

## Approval gate

This plan does not authorize implementation. Wait for explicit approval
before creating the calculation module, tests, UI integration, or API
validation changes.
