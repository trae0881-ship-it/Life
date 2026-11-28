# Numerology Methodology Specifications

## Scope and evidence rules

This document converts the verified evidence in
[`02-NUMEROLOGY-CALCULATION-AUDIT.md`](./02-NUMEROLOGY-CALCULATION-AUDIT.md)
into method-specific specifications. It does not authorize or implement
calculation code.

Historical procedures are kept separate from software input policies. Where a
source does not explain normalization, transliteration, spelling, or a
calculation step, that gap is marked rather than filled by convention. The
Sepharial tables below are from the 1911 scan unless explicitly identified
otherwise. The supplied 1920 OCR/scan is a different edition and is not a
substitute for the 1911 text.

`Reduce` below means repeatedly sum the decimal digits until a single digit is
obtained, except where a source explicitly retains a compound number or
Tarot-key value. This notation describes the cited examples; it must not be
extended to unsupported rules.

## Balliett - 1908 first edition

### Alphabet mapping

Printed on p. 17:

| Value | Letters |
|---:|---|
| 1 | A, J, S |
| 2 | B, K, T |
| 3 | C, L, U |
| 4 | D, M, V |
| 5 | E, N, W |
| 6 | F, O, X |
| 7 | G, P, Y |
| 8 | H, Q, Z |
| 9 | I, R |

This is the cyclic A-I, J-R, S-Z arrangement. LIFE's current Pythagorean
letter mapping has these same letter values; that does not make its name
compound procedure Balliett's.

### Name Vibration

The demonstrated two-part name procedure (pp. 18-19) is:

1. Sum the mapped values for each name component separately.
2. Reduce each component total to one digit.
3. Add the component roots to form the compound Name Vibration.
4. Reduce that compound to the final one-digit Name Vibration.

Only the shown name components are specified by this evidence. Do not infer
how to select names, include middle names, handle multiple surnames, or
normalize punctuation, accents, or non-Latin scripts.

**Henry Elder (pp. 18-19):**

- Henry: letter total 34 -> 7.
- Elder: letter total 26 -> 8.
- Compound Name Vibration: 7 + 8 = 15.
- Final Name Vibration: 1 + 5 = 6.

The compound `15` is part of the demonstrated procedure and must not be
replaced by the raw sum of all name letters.

### Birth Vibration

The January 17, 1872 example on p. 19 demonstrates:

1. Use the month value: January = 1.
2. Reduce the day: 17 -> 8.
3. Sum the year digits: 1 + 8 + 7 + 2 = 18, then reduce: 18 -> 9.
4. Add the three component values: 1 + 8 + 9 = 18.
5. Reduce the compound: 18 -> 9, the printed Birth Vibration.

This is the procedure evidenced by this date, not a fully specified treatment
of all date formats, invalid dates, calendars, or years.

### Unresolved example

On p. 90, John Wanamaker is listed as born July 11, 1838. The page gives
John = 2, Wanamaker = 6, full name = 8; it then lists July = 7, day = 11,
year digit = 2, and “birth numbers 9, 11.” It does not derive both birth
numbers from the p. 19 procedure. Keep this as a source inconsistency; do not
change the p. 19 rule to force agreement.

## Cheiro - inspected “Complete Edition, Revised”

### Edition boundary

The inspected Internet Archive scan is titled *Cheiro's Book of Numbers*,
“Complete Edition, Revised.” Its copyright page says copyright 1959 in India,
but does not identify a selected printing year. This specification applies
only to the inspected revised-edition scan. It does not attribute these rules
to the separate 1927 Google Books record or establish that the editions are
identical.

### Alphabet mapping

Printed on p. 70 and transcribed from the scan image (the OCR does not capture
the table):

| Value | Letters |
|---:|---|
| 1 | A, I, J, Q, Y |
| 2 | B, K, R |
| 3 | C, G, L, S |
| 4 | D, M, T |
| 5 | E, H, N, X |
| 6 | U, V, W |
| 7 | O, Z |
| 8 | F, P |
| 9 | No letter assigned |

This table matches LIFE's current Chaldean letter-value table. Matching
letters alone does not mean LIFE implements Cheiro's method.

### Word-by-word Name Number

The examples on pp. 71-72 and 86 demonstrate:

1. Sum each word separately using the p. 70 table.
2. Reduce each word total to its single number.
3. Add the word single numbers to make the name compound.
4. Preserve that compound for interpretation; its final single number may
   also be reported.

Examples show that the name is treated as its component words. The source
does not define modern normalization, punctuation handling, transliteration,
or how to split every possible name format. Those are not source rules.

### Birth Number

The Birth Number is based on the day of the month, not the full date. Reduce
the day to its single number while preserving the original day compound when
relevant to Cheiro's discussion. The example uses John Smith, born 8 January,
with Birth Number 8 (p. 86). Page 90 also gives 1, 10, 19, and 28 as days
that reduce to 1.

This is not LIFE's full-date Bhagyank calculation.

### Worked-name evidence

- **John Smith (p. 86):** John = 18 -> 9; Smith = 17 -> 8; name compound
  9 + 8 = 17 -> 8.
- **Lloyd George (pp. 71-72):** Lloyd = 18 -> 9; George = 25 -> 7; name
  compound 9 + 7 = 16. Adding David contributes another word root 7, making
  the compound 23.
- **Napoleon Bonaparte (p. 94):** Napoleon = 5; Bonaparte = 8; combined
  compound 5 + 8 = 13. The source also notes the spelling change from
  Buonaparte to Bonaparte; do not normalize one spelling to the other.

LIFE's current Chaldean implementation sums all mapped letters across the
input before reducing. For John Smith, it returns the raw all-letter total
35 -> 8, not Cheiro's word-root compound 17 -> 8. The reduced result agrees;
the compound and procedure do not.

## Sepharial - variant specifications

The following variants are distinct procedures. Their shared 1911 p. 30
tables are reproduced below for reference. `Hi` and `Hu` are transcribed as
printed; their intended transliteration is not explained. Some multi-letter
entries are source spellings, not a license to invent a tokenizer.

### 1911 p. 30 value tables

| Value | Hebraic | Pythagorean | Phonetic |
|---:|---|---|---|
| 1 | A, I, Y, Q, J | A, K, T | A, E, Y, or long I |
| 2 | B, C, K, R | B, L, U | B, K, R, PP, hard G, short O, Q, X |
| 3 | G, L, S | C, M, X | J, soft G, Sh, L |
| 4 | D, M, T | D, N, Y | D, T, M |
| 5 | E, N | E, O, Z | N |
| 6 | U, V, W, X | F, P, J | U, OO, V, W, S |
| 7 | O, Z | G, Q, V | Z, initial O |
| 8 | F, Ph, P, H | H, R, Hi | P, Ph, F, aspirate H, hard Ch |
| 9 | Th, Tz | I, S, Hu | Th, Tz |

The phonetic column distinguishes sounds such as hard/soft G and long/short
vowels. It is not a spelling-to-sound algorithm. Sepharial says the systems
have their own interpretations (p. 30) and says to include only letters that
contribute to a name's sound (p. 35).

### A. Sepharial Hebraic

**Value table:** Use only the Hebraic column above (p. 30). The entries `Ph`,
`Th`, and `Tz` and the other grouped spellings must remain as printed; the
source does not provide a general modern transliteration or tokenization
policy.

**Procedure and evidence:** On p. 26, the source prints a literal Hebraic
enumeration for Napoleone = 361 -> 10 -> 1 and Buonaparte = 815 -> 5. The
page does not provide enough steps to reconstruct these values from the p. 30
table. Treat the printed example as evidence of its result only, not as a
reproducible general procedure. Do not force the p. 30 table to produce those
values.

**Normalization and reduction:** No complete input-normalization or general
name-calculation procedure is established. The example shows a reduction
from 10 to 1 and a value 5; it does not settle all compound-number handling.

### B. Sepharial Pythagorean - 1911 edition

**Value table:** Use only the Pythagorean column in the 1911 p. 30 table.
It differs from LIFE's Pythagorean mapping. The table omits W, while the
p. 34 William example assigns W = 4. It also contains `Hi` and `Hu`, whose
intended forms are not explained.

**Demonstrated calculation:** The p. 34 example takes out unit values from
the names and reduces their totals:

- William = 30 -> 3.
- Ewart = 19 -> 1.
- Gladstone = 38 -> 2.

The text then prints the combined number `312`, interprets 300 and 12, and
reduces the digits to 6. It does not explain how `312` is constructed as an
arithmetic sum of the component roots. Do not replace it with an assumed
addition rule.

**Normalization and reduction:** The source does not specify a general
normalization policy. Do not assign a value to W or resolve `Hi`/`Hu` by
inference. The example supports the printed individual totals, but its W
assignment conflicts with the p. 30 table.

### C. Sepharial Phonetic

**Value table:** Use only the Phonetic column in the 1911 p. 30 table. The
method depends on sounds, including distinctions such as long I, short O,
hard/soft G, aspirate H, and initial O.

**Procedure:** Use values for sounds that contribute to the spoken name;
Sepharial states this on p. 35. The source does not give a general
pronunciation, accent, language, or transliteration algorithm. Do not infer
pronunciation from spelling.

**Examples:** The p. 35-37 examples and their printed sequences are listed in
[`05-NUMEROLOGY-WORKED-EXAMPLES.md`](./05-NUMEROLOGY-WORKED-EXAMPLES.md).
The p. 26 Napoleone example names a phonetic key whose spelling is ambiguous
in the 1911 scan/OCR (`Hlaydon`). The p. 26 key and the later p. 30 phonetic
table must not be assumed to be identical. In the 1911 PDF text layer, one
`6` is missing from Napoleone's nine-value sequence; the scan image shows all
nine values.

**Normalization and reduction:** A generic phonetic calculator is not
specified. Preserve the source's printed sound sequences and totals; do not
automatically transliterate names or choose among pronunciations.

### D. Sepharial Tarot Signature

**Value table:** The name uses the Hebraic values in the p. 30 table. The
source applies positional multipliers to those values; this is not a simple
Hebraic name sum.

**Procedure (pp. 38-40):**

1. For each name component, multiply each letter's Hebraic value by its
   converse position: the first letter uses the component length, the next
   uses one less, continuing to 1.
2. Sum each component separately.
3. Add the digits of the component totals and the digits of the Sun's sign
   number and degree to get the key number.
4. Add the birth year to the key number to get the nativity sum; extend that
   sum by adding its digits to obtain the Tarot signature.
5. Preserve the multi-digit key/signature values identified as Tarot keys.

John Milton is the worked example on p. 39: John's positional products total
46; Milton's total 72; the Sun is given as sign 9, degree 28. The source
extends the component totals and Sun position as
`4+6+7+2+9+2+8 = 38`. Adding the birth year gives `38+1608 = 1646`; the
source reduces 38 to 11 and 1646 to 17.

**Source inconsistencies:** In the scan/OCR, the first John line appears as
`1 + 4 = 4`, although the prose says to multiply and the remaining products
use multiplication. On p. 40, the source prints `38 + 1674 = 1712 = 13`;
however, the digit sum of 1712 is 11, not 13. Preserve the printed result
as an inconsistency. Do not create a correction rule or calculate a general
Tarot Signature from this discrepant example.

**Normalization:** The source's worked example separates Christian and
surnames and uses a birth year and supplied solar position. It does not define
all name-boundary, spelling, or solar-position calculation rules. A
calculation implementation would need a source-independent, explicit input
contract; it must not silently compute a Sun position from an unrelated
engine.

### E. Sepharial Table of Three

**Value/layout tables:** This is a date-placement procedure, not an alphabet
mapping. Page 41 prints the numeric square:

```text
4 9 2
3 5 7
8 1 6
```

Page 42 gives a separate planetary arrangement for the birth chart:

```text
3 1 9
6 7 5
2 8 4
```

Do not treat the second arrangement as LIFE's Lo Shu grid or as a
frequency-counting rule. The source evidence here does not establish a
general mapping from each cell to a named planet.

**Demonstrated procedure (pp. 42-44):** For the example of a birth at 10 a.m.
on 26 June 1899, the text uses the date at noon preceding the birth, takes
25 June, omits the century digits, and places `25/6/99` in the birth chart.
It totals the digits `25699 = 31 -> 4`.

**Normalization and reduction:** The evidence shows this one date/time
example and its result. It does not establish general time cutoffs, timezone
handling, calendar conversion, century treatment for every year, or all
chart-placement rules. Do not generalize the example's “noon preceding”
handling to other birth times without further source evidence.

## Edition and method separation

The 1911 Sepharial Pythagorean table has 4 = D/N/Y and 5 = E/O/Z. The
separately inspected 1920 scan prints E/O/Z/W for both rows 4 and 5. Keep
these editions separate; do not use the 1920 table to fill the missing W in
the 1911 table.

The source methods above do not establish Johari, “Kiro,” or “Adhunik”
calculations. Those remain outside these specifications pending accessible,
authenticated primary evidence.
