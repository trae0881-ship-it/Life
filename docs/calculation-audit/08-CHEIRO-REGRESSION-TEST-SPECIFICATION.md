# Cheiro Revised-Edition Regression Test Specification

## Test scope

Planning only; no test code has been added. Tests will target the isolated
method ID
`cheiro-complete-edition-revised-copyright-1959-printing-unknown-v1` and the
inspected *Complete Edition, Revised* scan only.

The cited edition is copyright-marked 1959 in India; its exact printing year
is unknown. Tests and snapshots must not describe it as the 1927 edition.
Historical outputs below are sourced from pp. 70-72, 86, 90, and 94. The
proposed strict input behavior is LIFE policy, not a Cheiro rule.

## Proposed test file and runner

- New file after approval: `tests/cheiro-revised.test.mjs`.
- New calculation module after approval: `src/calculation/cheiro-revised.ts`.
- Existing command: `npm test` runs `tests/*.test.mjs` using Node's
  `--experimental-strip-types`.
- Focused validation can run
  `node --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test-reporter=tap --test tests/cheiro-revised.test.mjs`,
  then run `npm test` for the complete regression suite.

Do not change existing numerology tests to accommodate Cheiro. New tests
should import `cheiro-revised.ts` directly. A small explicit parity test may
also import the existing `calculateNameName()` to pin existing outputs.

## Historical mapping tests

### Complete p. 70 table

Assert every letter maps to the scanned table:

| Value | Expected letters |
|---:|---|
| 1 | A, I, J, Q, Y |
| 2 | B, K, R |
| 3 | C, G, L, S |
| 4 | D, M, T |
| 5 | E, H, N, X |
| 6 | U, V, W |
| 7 | O, Z |
| 8 | F, P |
| 9 | none |

Acceptance assertions:

- Exactly the 26 ASCII letters A-Z are assigned once.
- No letter maps to 9.
- Every letter's value matches the table above.
- The method ID and edition metadata are present in name results.
- Metadata records copyright year 1959 and unknown printing year; it does not
  claim a 1927 edition or infer an exact printing date.

## Name calculation source vectors

Each word result must retain its submitted word, uppercase lookup form,
raw letter total, single-number root, and letter/value breakdown. The combined
name result must retain the sum of word roots as the compound and a separate
single-number root.

| Input | Expected word outputs | Preserved compound | Auxiliary reduced root | Primary reference |
|---|---|---:|---:|---|
| `John Smith` | John: 18 -> 9; Smith: 17 -> 8 | 17 | 8 | p. 86 |
| `Lloyd George` | Lloyd: 18 -> 9; George: 25 -> 7 | 16 | 7 | pp. 71-72 |
| `David Lloyd George` | David: 16 -> 7; Lloyd: 18 -> 9; George: 25 -> 7 | 23 | 5 | pp. 71-72 |
| `Napoleon Bonaparte` | Napoleon: 41 -> 5; Bonaparte: 35 -> 8 | 13 | 4 | p. 94 |

For Napoleon Bonaparte, assert raw totals 41 and 35 as calculations from
the p. 70 table, but label them in the test as **derived from the mapping**:
the source prints word values 5 and 8 and compound 13, not the raw totals.
The reduced-root column is also an auxiliary digit reduction; p. 94's
compound 13 remains the source result and must not be replaced by root 4.

Additional invariants:

- Compound name number equals the sum of each word's root, not the sum of
  the raw word totals.
- The `nameRoot` is a reduction of the compound number, not a replacement
  for it.
- Word order is retained in the returned array.
- A three-word input is supported because the source explicitly adds David
  to Lloyd George for compound 23.
- No master-number option is accepted or inherited from LIFE's existing
  `keepMasterNumbers` setting.

## Birth Number tests

Test a dedicated `calculateCheiroBirthNumber(dayOfMonth)` function; do not
derive the expected value from `calculateDateNumbers()` or assert that
Cheiro's Birth Number is a full-date number.

| Day input | Expected preserved day | Expected Birth Number | Reference |
|---:|---:|---:|---|
| 8 | 8 | 8 | John Smith, p. 86 |
| 17 | 17 | 8 | Lloyd George, p. 72 |
| 1 | 1 | 1 | p. 90 |
| 10 | 10 | 1 | p. 90 |
| 19 | 19 | 1 | p. 90 |
| 28 | 28 | 1 | p. 90 |

Reject day values `0`, `32`, negative values, decimals, `NaN`, infinities,
and non-number inputs. A valid calendar date is an adapter/UI concern; the
pure Birth Number function consumes only an integer day from 1 through 31.

## Strict LIFE input-validation tests

The source does not define modern punctuation, whitespace, transliteration,
or script normalization. Expected outcomes below test an explicit LIFE
boundary: ASCII letters separated by exactly one ordinary space, case-folded
to uppercase for lookup. Invalid text must be rejected, never silently
deleted or transliterated.

| Input | Expected result | Reason |
|---|---|---|
| empty string | Reject with `EMPTY_NAME` | No name words |
| spaces only | Reject with `INVALID_WORD_SPACING` | No name words; do not silently trim |
| more than 100 characters | Reject with `NAME_TOO_LONG` | Match current UI name-field limit |
| `John Smith` | Accept as two explicit words | Valid ASCII words and one space |
| `john smith` | Accept with identical numeric result to `John Smith` | ASCII case-folding is LIFE policy |
| `John, Smith` | Reject with `UNSUPPORTED_PUNCTUATION` | Comma handling is not source-defined |
| `Jean-Luc Picard` | Reject with `AMBIGUOUS_WORD_SEGMENTATION` | Hyphen may be part of a name or a boundary |
| `O'Connor` | Reject with `AMBIGUOUS_WORD_SEGMENTATION` | Apostrophe convention is not source-defined |
| `John  Smith` | Reject with `INVALID_WORD_SPACING` | Do not collapse whitespace silently |
| ` John Smith` or `John Smith ` | Reject with `INVALID_WORD_SPACING` | Do not trim silently |
| `李雷` | Reject with `UNSUPPORTED_SCRIPT` | Do not apply a transliteration |
| `John 李` | Reject with `UNSUPPORTED_SCRIPT` | Reject mixed-script input |
| `José` | Reject with `UNSUPPORTED_SCRIPT` | Do not remove diacritics using NFKD |
| `John.Smith` | Reject with `UNSUPPORTED_PUNCTUATION` | Period is not a verified Cheiro separator |
| `JohnSmith` | Accept as one supplied word; do not infer a split | No explicit boundary was provided |

The exact error type/shape should be stable enough for UI mapping, for example
a typed `code` field plus a human-readable message. Do not catch a validation
error and return a success-shaped empty calculation.

## Existing-engine non-regression tests

Add a parity assertion or preserve an existing equivalent regression:

- `calculateNameName("Ada Lovelace", "chaldean")` remains compound 39,
  reduced 3.
- `calculateNameName("Ada Lovelace", "pythagorean")` remains compound 36,
  reduced 9.
- Existing Chaldean/Pythagorean maps, `NumerologySystem`, `createNumerologyReport`,
  recommendations, Lo Shu, DOB-only/Indian Extended distinctions, and saved
  report payloads retain their current results.

This is a non-regression guard, not a request to edit the existing engine to
make it resemble Cheiro. Do not add the Cheiro ID to `NumerologySystem`.

## Report and persistence tests (only if separately approved)

If a later approved UI/API phase saves Cheiro results:

- The payload includes the exact method ID, version, edition/copyright
  metadata, word results, name compound/root, day-of-month Birth Number, and
  DOB as appropriate.
- Save and reopen preserve all raw word totals and roots; the history detail
  view renders the Cheiro breakdown instead of assuming generic `sections`.
- The existing `ank-jyotish` service and `SavedAstrologyReading` relation are
  used; no Prisma schema or migration is added.
- Existing authenticated, user-scoped GET/DELETE behavior and same-origin
  mutation requirements remain in effect.
- A payload tagged with an unknown Cheiro method ID/version is rejected by
  future validation rather than treated as the current method.

These are future integration tests and are not required for the initial
calculation-only implementation slice.

## Acceptance criteria

The future implementation is acceptable only if:

1. All mapping, source-vector, Birth Number, and validation tests above pass.
2. The source outputs preserve word raw totals, word roots, name compound,
   final root, and day-of-month Birth Number separately.
3. The revised edition is identified as copyright-marked 1959 with unknown
   printing year and is never attributed to the 1927 record.
4. Unsupported text is rejected by the Cheiro validator and is not passed
   through LIFE's existing `normalizeName()`.
5. Existing numerology tests pass without changing their expected outputs.
6. No existing calculation API, method union, database schema, or migration
   is changed to make Cheiro appear to be Pythagorean or generic Chaldean.
7. If report integration is included, saved results round-trip with the
   method ID and detailed word breakdown intact.

No tests were run for this planning deliverable because no code was changed.
