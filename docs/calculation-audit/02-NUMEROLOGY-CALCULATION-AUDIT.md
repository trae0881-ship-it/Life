# Numerology Calculation Audit

## Executed DOB numerology values

Synthetic DOB: `1997-04-27`, reference instant `2026-11-26 13:11 Asia/Kolkata`.

| Output | Formula/steps | Actual result | Source |
|---|---|---|---|
| Birth number / Moolank | reduce birth day `27` repeatedly: `2+7=9` | `9` | `calculateDateNumbers()` in `src/calculation/numerology.ts` |
| Life Path / Bhagyank | concatenate `27 04 1997`, sum digits: `2+7+0+4+1+9+9+7=39`, reduce `3+9=12`, `1+2=3` | compound `39`, reduced `3` | `calculateDateNumbers()` |
| Attitude number | reduce `month + day = 4 + 27 = 31 -> 3+1=4` | `4` | `calculateDateNumbers()` |
| Personal Year | reduce birth month + birth day + year: `4+27+2026`; 2026 digit sum 10, etc. Engine returned `5` | `5` | `getPersonalCycles()` |
| Personal Month | reduce personal year + calendar month: `5+11=16 -> 7` | `7` | `getPersonalCycles()` |
| Personal Day | reduce personal month + calendar day: `7+26=33 -> 6` | `6` | `getPersonalCycles()` |

## Lo Shu grid

DOB-only digits remove zero: `27,04,1997` -> `2,7,4,1,9,9,7`. Frequencies are `{1:1,2:1,3:0,4:1,5:0,6:0,7:2,8:0,9:2}`.

- Present: `1,2,4,7,9`
- Missing: `3,5,6,8`
- Repeated: `7x2, 9x2`
- Layout: `4-9-2 / 3-5-7 / 8-1-6`
- Mind plane is complete.
- Indian extended adds Moolank `9` and Bhagyank `3`, producing present `1,2,3,4,7,9`, missing `5,6,8`, and 9 repeated three times.

## Name numerology

`calculateNameName()` implements separate:

- Pythagorean letter values `A=1, B=2, ..., I=9, J=1...`
- Chaldean mappings from the `CHALDEAN` table.
- Expression compound/reduced, Soul Urge from vowels, and Personality from consonants.
- Devanagari transliteration is approximate and constrained. Unsupported letters are reported.

No name was supplied in the synthetic profile, so name calculations are **INPUT REQUIRED**.

## Mobile numerology

`analyzeMobileNumber()` validates country code and national-number shape, removes punctuation, concatenates code + digits, sums digits, reduces to a root, and reports frequencies/patterns. Country validation is syntactic only, not ITU country or carrier validation.

Mobile number, country code, and availability are **INPUT REQUIRED**.

## Compatibility and recommendations

The marriage score formula in `calculateMarriageCompatibility()` is:

`3 for matching Moolank + 4 for matching Bhagyank + 3 for matching name root + complementary Lo Shu cross-count`, capped at `10`.

The implementation has no scientific probability, relationship outcome, or guarantee. Career/business values are hard-coded category root sets and not predictive evidence.
