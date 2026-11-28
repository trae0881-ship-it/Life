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

## Follow-up audit: requested systems and Lo Shu rendering

The active `/ank-jyotish` workspace imports `createNumerologyReport()` from
`src/calculation/numerology.ts`. Its name engine currently implements only:

- Pythagorean: A-I map to 1-9, repeating cyclically through Z.
- Chaldean: the explicit eight-group table in `CHALDEAN`; the value 9 is not
  assigned to letters.

The separate `src/calculation/ank-jyotish.ts` contains a Pythagorean-only
legacy name reducer and has no Lo Shu engine. Searches of application source,
tests, and calculation-audit documents found no Kiro, Sepharial, or Adhunik
mapping, implementation, or system-specific fixture. The existing
`NUMEROLOGY_SOURCES` entries are broad tradition descriptions with empty URLs,
not independently verifiable bibliographic references. These three requested
systems must remain unimplemented until their intended variants and sources
are established; equating Kiro with Cheiro or Sepharial with the current
Chaldean table would be an unsupported assumption.

The current Lo Shu code does not reproduce a dynamic-layout defect:
`GRID_LAYOUT` is the fixed `4-9-2 / 3-5-7 / 8-1-6` constant, DOB-only
frequencies count only non-zero digits, and the active UI renders that
constant rather than sorting by DOB. Therefore, the reported incorrect-grid
cause is not established by this source audit. The follow-up change exposes
original DOB digits separately from Indian-extended derived entries so the
display cannot mislabel the combined frequency input as DOB-only.

The existing saved numerology reports use the generic owner-scoped
`SavedAstrologyReading` JSON payload. The current numerology workspace has
save, reopen, delete, local report comparison, print, and JSON export
operations; it has no report rename, section-linked numerology question
history, or Super Admin numerology-report monitoring route.

## Compatibility and recommendations

The marriage score formula in `calculateMarriageCompatibility()` is:

`3 for matching Moolank + 4 for matching Bhagyank + 3 for matching name root + complementary Lo Shu cross-count`, capped at `10`.

The implementation has no scientific probability, relationship outcome, or guarantee. Career/business values are hard-coded category root sets and not predictive evidence.

## Primary-source review and method comparison

Printed page numbers below refer to the named book editions, not PDF page indexes.
The Balliett and specified Sepharial OCR files were fetched in full and locally
inspected. For Sepharial, the supplied 1920 OCR and the separately downloaded
1911 University of Illinois scan were kept distinct: the 1911 scan's title page
states 1911, and its embedded text was extracted and checked against the scan
images. The 1920 copy is used only for an edition comparison, not as a substitute
for the requested 1911 source.

| Method/source | Evidence inspected | Verified result and comparison with LIFE | Status |
|---|---|---|---|
| Current Pythagorean mode / Balliett | `PYTHAGOREAN` in `src/calculation/numerology.ts`; Balliett, *The Philosophy of Numbers* (1908 first edition), pp. 17–19 and 90 | The letter map is the same cyclic 1–9 sequence. Balliett's name-total procedure and birth examples are not identical to LIFE's compound-number and full-date outputs; see the worked evidence below. | Existing mapping retained; do not label the complete Balliett method as implemented. |
| Current Chaldean mode / Cheiro | Cheiro, *Cheiro's Book of Numbers*, “Complete Edition, Revised” scan, pp. 70–72, 86, 90, 94 | The scanned edition's letter groups exactly match LIFE's `CHALDEAN` table, including no letter assigned to 9. Cheiro's name selection, compound-number handling, birth-number convention, and interpretations are not thereby implemented. The scan is copyright-marked 1959 and its exact printing year is not identified; it does not establish identity with the 1927 Google Books record. | Mapping attribution verified for this revised edition only; keep claims about the broader Cheiro method edition-specific. |
| Sepharial | *The Kabala of Numbers*, 1911 scan, pp. 25–30, 34–44, 139–141; separately compared with the supplied 1920 OCR/scan | The 1911 source gives distinct Hebraic, Pythagorean, and phonetic systems, plus different name and birth procedures. Its Pythagorean table is not LIFE's Pythagorean table. The 1920 scan's printed table differs from the 1911 table. | Multiple source variants verified; no single generic “Sepharial” mode is justified. |
| Balliett, author-specific | *The Philosophy of Numbers*, 1908 first edition, pp. 17–19 and 90; corresponding page images checked | The cyclic alphabet, Henry Elder worked name/date, and John Wanamaker example are visible in the scan. The latter's stated birth-number result is not derivable from its printed inputs by the earlier example's rule. | Enough evidence to specify only the demonstrated rules; retain the unresolved birth example as unresolved. |
| Johari, author-specific | Harish Johari, *Numerology: with Tantra, Ayurveda, and Astrology* (1990); Internet Archive item metadata and access flags checked | The full-text derivative exists in metadata but is marked private/access-restricted. No authorized full text, rule, mapping, or worked example was inspected. The official publisher page fetch was blocked (HTTP 403); a Google Books API query was rate-limited (HTTP 429). | UNVERIFIED. Do not infer a Johari method or use an access-restricted copy. |
| “Kiro” | No unambiguous author, title, edition, or primary text identified | Equating the name with Cheiro is still unsupported. | UNRESOLVED; do not add or rename a mode. |
| “Adhunik” | No authoritative title, author, edition, or primary text identified | No mapping or calculation rule verified. | UNVERIFIED; do not guess a modern or regional mapping. |

### Balliett: source rules and worked examples

The printed table on p. 17 places A–I under 1–9, J–R under 1–9, and S–Z
under 1–8. Equivalently: 1 = A/J/S, 2 = B/K/T, 3 = C/L/U, 4 = D/M/V,
5 = E/N/W, 6 = F/O/X, 7 = G/P/Y, 8 = H/Q/Z, and 9 = I/R.

- **Henry Elder (pp. 18–19):** Henry's letters total 34, reduced to 7;
  Elder's total 26, reduced to 8. Balliett then adds the two name roots,
  7 + 8 = 15 -> 6. This is the printed “name vibration.”
- **Birth (p. 19):** For January 17, 1872, Balliett uses month 1, day 17
  reduced to 8, and year digits 1 + 8 + 7 + 2 = 18 -> 9; the components
  add to 18 -> 9. This is the printed “birth vibration.”
- **John Wanamaker (p. 90):** The scan says born July 11, 1838; John = 2,
  Wanamaker = 6, full name = 8. It then lists July = 7, day = 11, year
  digit = 2, and “birth numbers 9, 11.” The page does not show how those
  inputs produce both outputs, and the result differs from the one-number
  procedure on p. 19. Do not infer a missing formula or harmonize the examples.

The current Pythagorean letter map reproduces Balliett's letter values.
`calculateNameName()` sums all letters before reducing: for Henry Elder that
compound is 60 -> 6, whereas Balliett explicitly adds the reduced word values
to get 15 -> 6. The root agrees, but the compound and procedure differ.
For January 17, 1872, LIFE's full-date digit sum is 27 -> 9, versus Balliett's
stated component total 18 -> 9. Again the root agrees but the compound rule
does not. LIFE's vowel/consonant name outputs and personal cycles are not
established by these Balliett examples.

### Sepharial: mappings, examples, and date procedures

The 1911 scan's printed p. 30 tables transcribe as follows. `Hi` and `Hu`
are retained exactly as read from the scan; their intended transliteration is
not explained.

| Value | Hebraic | Pythagorean | Phonetic |
|---|---|---|---|
| 1 | A, I, Y, Q, J | A, K, T | A, E, Y, or long I |
| 2 | B, C, K, R | B, L, U | B, K, R, PP, hard G, short O, Q, X |
| 3 | G, L, S | C, M, X | J, soft G, Sh, L |
| 4 | D, M, T | D, N, Y | D, T, M |
| 5 | E, N | E, O, Z | N |
| 6 | U, V, W, X | F, P, J | U, OO, V, W, S |
| 7 | O, Z | G, Q, V | Z, initial O |
| 8 | F, Ph, P, H | H, R, Hi | P, Ph, F, aspirate H, hard Ch |
| 9 | Th, Tz | I, S, Hu | Th, Tz |

The phonetic column is based on sounds, not a generic vowel/consonant split.
Sepharial says to use each system with its own interpretation (p. 30), and
later says to include only letters contributing to a name's sound (p. 35).

**Name examples**

- **Napoleone Buonaparte (p. 26):** Using the phonetic key named on the page
  (its spelling is ambiguous in the scan/OCR: `Hlaydon`), the scan gives each
  name 36 -> 9 and the combined total 72 -> 9. A separate literal Hebraic
  enumeration is printed as Napoleone = 361 -> 10 -> 1 and Buonaparte = 815
  -> 5. The page does not give enough steps to reconstruct those literal
  numbers from the later p. 30 unit table; do not normalize the key's name or
  assume the two phonetic procedures are the same method.
- **William, Ewart, and Gladstone (pp. 34–35):** The Pythagorean column gives
  30 -> 3, 19 -> 1, and 38 -> 2; the text then prints the combined number
  312 and interprets both 300 and 12 before reducing the digits to 6. The
  source does not explain the construction of 312 as an arithmetic sum.
  Its William string assigns W = 4, although W is absent from the printed
  Pythagorean table. This is an unresolved source inconsistency.
- The phonetic calculation on p. 35 gives Gladstone = 31 -> 4, William =
  14 -> 5, and Ewart = 14 -> 5; their combined result is 14 -> 5.
- **Benjamin and Disraeli (p. 36):** The printed phonetic strings are
  Benjamin = 2153145 = 21 -> 3 and Disraeli = 472131 = 18 -> 9, combined
  as 12 -> 3. The missing short-I value is consistent with the p. 30 table
  only assigning long I, but the pronunciation assumption is not stated;
  preserve the example as printed rather than “correcting” it.
- **Francis Bacon (p. 37):** Francis = 821566 = 28 -> 1; Bacon = 21225 =
  12 -> 3; combined result 4. These examples reinforce that the phonetic
  procedure depends on the spoken sound.

The p. 26 scan resolves an OCR omission: the embedded 1911 PDF text drops one
`6` from the nine-character Napoleone phonetic sequence. The page image reads
`5 1 8 6 3 1 6 5 1`, which sums to 36. The PDF text layer also garbles some
letters in the p. 30 tables; the transcription above was checked against the
scan image.

**Birth and date procedures**

- **Tarot signature (pp. 38–40):** The text sets Hebraic values against the
  name and multiplies them by descending “converse” positions, separately
  totals Christian and surnames, and adds the Sun's sign/degree. For John
  Milton (9 Dec. 1608 O.S., 19 Dec. N.S.; Sun in the 9th sign, 28th degree),
  the name subtotals are 46 and 72; adding the sign and degree digits gives
  key 38. Adding the birth year 1608 gives 1646; the text reduces these to
  Tarot Keys 11 and 17. For 1674, 38 + 1674 = 1712 -> 13 (pp. 39–40).
  However, 1 + 7 + 1 + 2 = 11, not 13; preserve the p. 40 result as a
  source arithmetic inconsistency rather than inferring another reduction
  rule. On p. 39, the first John multiplier appears as `1 + 4 = 4` in the
  scan/OCR, although the prose specifies multiplication and the other rows
  use multiplication; record this as a typographic ambiguity. This is not
  LIFE's full-date digit-sum rule.
- **Table of Three (pp. 41–44):** Page 41 prints the familiar 4-9-2 /
  3-5-7 / 8-1-6 magic square. Page 42 then gives a separate planetary
  arrangement, 3-1-9 / 6-7-5 / 2-8-4, used for the birth chart. For a
  morning birth at 10 a.m. on 26 June 1899, the text uses the date at noon
  preceding the birth (25 June), omits century digits, and places 25/6/99
  in that chart (p. 43). It totals 25699 = 31 -> 4 (p. 44). The geometric
  square matches LIFE's fixed `GRID_LAYOUT`, but the date adjustment,
  planetary arrangement, and interpretation are not LIFE's DOB-frequency
  calculation.
- **Later key-number procedure (pp. 140–141):** Page 140 says the general
  key number is obtained by adding birth day, month, and year, without
  specifying a full reduction convention there. Page 141 separately gives
  Tuesday, 26 April 1910, 4:05 p.m. as 532 -> 10 -> 1, using weekday,
  planetary-hour, and minute influences. The printed planetary glyphs and
  intermediate values are not sufficiently clear to reconcile this example
  with the earlier planet-number table. Keep this as a separate unresolved
  procedure; do not generalize it into a date formula.

The 1911 and 1920 editions are demonstrably not interchangeable. On printed
p. 30, the 1911 scan has Pythagorean 4 = D/N/Y and 5 = E/O/Z. The separately
inspected 1920 scan prints E/O/Z/W for both rows 4 and 5 and includes an
additional note on that page. This is visible in the 1920 scan itself, not
merely an OCR transcription error. Do not silently use the 1920 table for the
1911 edition or “repair” either edition by inference.

LIFE's Pythagorean mapping differs from Sepharial's p. 30 Pythagorean mapping.
LIFE's Chaldean mapping is not the p. 30 Hebraic mapping either. LIFE's
`calculateDateNumbers()` uses the day root for Moolank and a full
DDMMYYYY digit sum for Bhagyank; it does not implement Sepharial's Tarot
signature or Table of Three. No astronomy or calculation code was changed.

### Cheiro: verified table, partial method match

The locally inspected public Internet Archive scan is titled *Cheiro's Book
of Numbers*, “Complete Edition, Revised.” Its copyright page says copyright
1959 in India; the printing-year row does not identify a selected year, so
the exact printing remains undated. This is not proof that this printing is
identical to the separate 1927 Google Books record.

The table on printed p. 70 is:

| Value | Letters |
|---|---|
| 1 | A, I, J, Q, Y |
| 2 | B, K, R |
| 3 | C, G, L, S |
| 4 | D, M, T |
| 5 | E, H, N, X |
| 6 | U, V, W |
| 7 | O, Z |
| 8 | F, P |
| 9 | No letter assigned |

This table exactly matches LIFE's `CHALDEAN` mapping.
The complete OCR text does not capture the p. 70 table; the mapping above was
transcribed from the scanned page image.

- **Lloyd George (pp. 71–72):** Lloyd totals 18 -> 9 and George 25 -> 7.
  Cheiro adds the word roots to make the name compound 16; the text says
  adding “David” gives compound 23. This is not the raw all-letter compound
  43 that LIFE would return for “Lloyd George,” although the reduced root is
  the same.
- **John Smith (p. 86):** John totals 18 -> 9 and Smith 17 -> 8; Cheiro
  adds these roots to obtain 17 -> 8. The birth number is the day of the
  month: the example uses 8 January and birth number 8. Pages 85–86 then
  combine name, birth, and a candidate calendar day to choose a “lucky” day.
- **Birth number (p. 90):** The chapter treats the day of the month as the
  birth number (for example 1, 10, 19, and 28 all reduce to 1); the
  compound day remains relevant to Cheiro's interpretations.
- **Napoleon Bonaparte (p. 94):** The text gives Napoleon = 5 and
  Bonaparte = 8, combining them as 13. This is another source example of
  name form affecting the compound interpretation.

LIFE's Chaldean alphabet is source-aligned with this revised edition, but
`calculateNameName()` sums every letter in the full input (John Smith =
35 -> 8), rather than adding the two reduced word values to Cheiro's
compound 17. LIFE also derives vowel-based Soul Urge and consonant-based
Personality values not established by this inspected Cheiro procedure.
LIFE's Moolank root agrees with Cheiro's day-based root, but Bhagyank is a
separate full-date calculation and is not Cheiro's birth number.

### Johari and remaining source gaps

The Internet Archive record for Harish Johari's 1990 *Numerology: with Tantra,
Ayurveda, and Astrology* lists a DjVu text derivative, but marks that text and
scan derivatives private/access-restricted. Those restricted files were not
opened or bypassed. The official publisher page request returned HTTP 403,
and the Google Books API request returned HTTP 429; neither supplied primary
rules. Other Archive search results include a 2024-dated record and a
differently named item; neither edition nor provenance was authenticated, so
they were not used as evidence. No Johari mapping or worked calculation is
verified.

“Kiro” and “Adhunik” still lack an identified primary title, author, and
edition. The Cheiro source now verifies a Chaldean table, but it does not
establish that “Kiro” means Cheiro.

### Source locations and local verification

- Balliett scan and exact OCR: [Internet Archive item](https://archive.org/details/philosophyofnumb00ball) and [OCR text](https://archive.org/download/philosophyofnumb00ball/philosophyofnumb00ball_djvu.txt).
- Sepharial 1911: University of Illinois at Urbana-Champaign scan; title page states 1911. The complete 180-page scan was downloaded and its embedded text extracted locally; pages cited above were checked against rendered scan images.
- Sepharial 1920: [Internet Archive item](https://archive.org/details/TheKabalaOfNumbers) and the [exact supplied OCR text](https://archive.org/download/TheKabalaOfNumbers/Sepharial-the-Kabala-of-Numbers_djvu.txt). This is a separate edition from the 1911 scan.
- Cheiro revised edition: [Internet Archive item](https://archive.org/details/cheirosbookofnumbers), [complete OCR text](https://archive.org/download/cheirosbookofnumbers/Cheiro%27s%20Book%20of%20Numbers_djvu.txt), and scanned PDF. The separate [1927 Google Books record](https://books.google.com/books?id=-qMgZzxmN1oC) remains bibliographic evidence only.
- Johari 1990 record and access status: [Internet Archive item](https://archive.org/details/numerologywithta0000joha). The OCR derivative is marked private in its metadata.

SHA-256 checksums for the complete locally inspected files:

| File | Bytes | SHA-256 |
|---|---:|---|
| Balliett `philosophyofnumb00ball_djvu.txt` | 185,360 | `846DA171533697A23C6AC8B6262BBEF3C7AF078AB69834D2377869F53B40224C` |
| Sepharial 1920 `Sepharial-the-Kabala-of-Numbers_djvu.txt` | 264,431 | `B22951431794368B8590B9DD444E6072D03E0C430B0620610A2E92DB2EC4591D` |
| Sepharial 1911 scanned PDF | 11,968,015 | `98C64F8AE31BFB9743733058C5296FD182F664DB947A701C16DF8373A718BF69` |
| Sepharial 1911 extracted complete text | 234,074 | `73BAAC4E1E360E93F0EC8A227365846BE2B0E14239755BC672A153C5E2A2424E` |
| Cheiro revised-edition OCR | 318,634 | `97361815589C61C727362A433488706709EBD479B7BF7E8352B9BD30EDBDE5AC` |
| Cheiro revised-edition scanned PDF | 10,927,436 | `E491417288DD837EA25EBB5896AC5A7A9DB92FC48DBF7331DBD7A5C9CF20D542` |

## Proposed implementation plan (source gate; no new engine added)

1. **Resolve intended variants first.** The inspected Cheiro edition verifies its letter table, Balliett verifies only the rules above, and Sepharial has several distinct source methods. Keep Johari, “Kiro,” and Adhunik unsupported until their exact primary sources and intended variants are identified.
2. **Publish a method specification before coding.** For each authorized method, record its alphabet/table, name input policy, treatment of spaces/punctuation and unsupported scripts, vowel/consonant rules, compound-number preservation/reduction, birth-date procedure, interpretation rules, worked source examples, edition/page citations, and unresolved ambiguities. Keep author-specific systems separate even where tables overlap.
3. **Implement only verified rules as isolated, versioned calculations.** Preserve the current Pythagorean and Chaldean outputs as regression baselines. Add separately named method identifiers rather than changing defaults or treating Cheiro, Sepharial, Balliett, or Johari as synonyms.
4. **Build source-derived fixtures before enabling a method.** Each method must reproduce at least one source worked example and include focused edge cases for transliteration, zero handling, compound numbers, and missing/unsupported input. A method without a reproducible source example remains disabled.
5. **Keep report claims within the selected method.** Store the method identifier/version with saved output, identify the supporting author/source in technical metadata, and do not mix interpretation vocabularies or present numerology as scientifically validated prediction.
6. **Enable UI and recommendations only after calculation verification.** Expose each verified method as a distinct choice, make source/method limitations clear, and do not attach existing hard-coded career or compatibility recommendations to a new method without source-backed rules and tests.
7. **Validate compatibility and persistence.** Run existing numerology tests plus new source vectors, verify saved/reopened reports preserve their method/version, then run the full suite, type check, lint, and production build. Do not modify the existing calculation defaults until the user approves the completed comparison and source-backed specification.

The review is a methodology comparison and implementation proposal, not authorization
to add an engine. The inspected-source gaps above must be resolved or deliberately
kept unsupported before implementation begins.
