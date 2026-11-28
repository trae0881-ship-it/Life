# Numerology Source Traceability

## Purpose

This register maps each specification claim to the inspected source and
printed page. Printed page numbers are book page numbers, not PDF page
indexes. The research record, edition caveats, and local-file hashes are
maintained in
[`02-NUMEROLOGY-CALCULATION-AUDIT.md`](./02-NUMEROLOGY-CALCULATION-AUDIT.md).

## Traceability matrix

| ID | Method/claim | Primary evidence | Traceability note |
|---|---|---|---|
| B-01 | Balliett cyclic A-Z mapping | *The Philosophy of Numbers*, 1908 first edition, p. 17 | Page image checked; mapping is A/J/S=1 through I/R=9. |
| B-02 | Henry Elder name totals and Name Vibration | Same, pp. 18-19 | Henry 34 -> 7; Elder 26 -> 8; 7+8=15 -> 6. |
| B-03 | January 17, 1872 Birth Vibration | Same, p. 19 | Month 1, day 17 -> 8, year digit sum 18 -> 9; component sum 18 -> 9. |
| B-04 | John Wanamaker discrepancy | Same, p. 90 | Printed name values and “birth numbers 9, 11” do not show a derivation consistent with p. 19. |
| C-01 | Cheiro revised-edition alphabet values | *Cheiro's Book of Numbers*, “Complete Edition, Revised,” p. 70 | Transcribed from the scan image; the OCR does not capture the table. Copyright page says 1959 in India; exact printing year unknown. |
| C-02 | Lloyd George word roots and compound | Same, pp. 71-72 | Lloyd 18 -> 9; George 25 -> 7; compound 16; adding David yields 23. |
| C-03 | John Smith word roots and compound | Same, p. 86 | John 18 -> 9; Smith 17 -> 8; compound 17 -> 8. The example uses birth day 8 January. |
| C-04 | Day-of-month Birth Number examples | Same, p. 90 | Days 1, 10, 19, and 28 reduce to 1; compound day remains relevant in the text. |
| C-05 | Napoleon Bonaparte name example | Same, p. 94 | Napoleon 5 and Bonaparte 8 are combined as 13; source discusses spelling change. |
| S-01 | Sepharial 1911 Hebraic, Pythagorean, and Phonetic tables | *The Kabala of Numbers*, 1911 scan, p. 30 | Page image checked; `Hi` and `Hu` retained as printed. The supplied 1920 edition is not a replacement. |
| S-02 | Napoleone/Buonaparte phonetic and Hebraic values | Same, p. 26 | Scan/OCR key spelling is ambiguous (`Hlaydon` in 1911 text layer). Text layer omits one `6` from Napoleone's sequence; the page image shows nine values. Printed Hebraic totals are not reconstructible from p. 30 alone. |
| S-03 | Sepharial Pythagorean name example | Same, pp. 34-35 | William 30 -> 3, Ewart 19 -> 1, Gladstone 38 -> 2; William's W=4 conflicts with p. 30; combined `312` is unexplained. |
| S-04 | Sepharial phonetic procedure and examples | Same, pp. 35-37 | Only sound-contributing letters are used; examples include Gladstone, William, Ewart, Benjamin, Disraeli, and Francis Bacon. Pronunciation is not generally specified. |
| S-05 | Tarot Signature procedure and John Milton | Same, pp. 38-40 | Positional multipliers, separate name totals, solar sign/degree, and birth year are described. The first John operator is ambiguous in the scan/OCR; p. 40's `1712 = 13` conflicts with digit sum 11. |
| S-06 | Table of Three layouts and worked date | Same, pp. 41-44 | Numeric square on p. 41; separate planetary arrangement on p. 42; June 26, 1899, 10 a.m. example uses 25/6/99 and yields 25699 -> 31 -> 4. |
| S-07 | Later Sepharial key-number example, not specified as a requested variant | Same, pp. 140-141 | Kept outside the five requested variants; planetary symbols/intermediate values remain unclear in the audit. |
| S-08 | 1911/1920 edition difference | 1911 scan p. 30; supplied 1920 OCR and corresponding scan p. 30 | The 1911 Pythagorean rows 4/5 are D/N/Y and E/O/Z; the 1920 image duplicates E/O/Z/W for both rows. |

## LIFE implementation comparison

| Source-backed method | Existing LIFE behavior | Boundary |
|---|---|---|
| Balliett mapping | Current Pythagorean letter values match the cyclic table. | LIFE sums all letters before reduction; Balliett's demonstrated compound is the sum of reduced component words. |
| Cheiro revised-edition mapping | Current Chaldean letter values match p. 70. | LIFE sums all letters across the input; Cheiro adds reduced word roots. LIFE's full-date Bhagyank is not Cheiro's day-based Birth Number. |
| Sepharial Hebraic | Not implemented as a method. | Similarity of some letter values is not proof of method equivalence; p. 26 name totals cannot be derived from p. 30 alone. |
| Sepharial Pythagorean, 1911 | Not implemented as a method. | Its p. 30 table differs from LIFE's Pythagorean table and has a W conflict in the worked example. |
| Sepharial Phonetic | Not implemented as a method. | Sound distinctions cannot be derived from a generic spelling map. |
| Sepharial Tarot Signature | Not implemented as a method. | Positional multipliers and solar position are distinct from LIFE's name and DOB calculations. |
| Sepharial Table of Three | Not implemented as a method. | Its date preprocessing and planetary arrangement differ from LIFE's fixed Lo Shu DOB digit-frequency grid. |

## Source locations

- **Balliett:** [Internet Archive item](https://archive.org/details/philosophyofnumb00ball); [exact OCR](https://archive.org/download/philosophyofnumb00ball/philosophyofnumb00ball_djvu.txt).
- **Cheiro revised edition:** [Internet Archive item](https://archive.org/details/cheirosbookofnumbers); [complete OCR](https://archive.org/download/cheirosbookofnumbers/Cheiro%27s%20Book%20of%20Numbers_djvu.txt); scanned PDF in the same item. The separate [1927 Google Books record](https://books.google.com/books?id=-qMgZzxmN1oC) is bibliographic evidence only.
- **Sepharial 1911:** [University of Illinois scan PDF](https://brittlebooks.library.illinois.edu/brittlebooks_open/Books2012-04/sephar0001kabofn/sephar0001kabofn.pdf).
- **Sepharial 1920:** [Internet Archive item](https://archive.org/details/TheKabalaOfNumbers); [exact supplied OCR](https://archive.org/download/TheKabalaOfNumbers/Sepharial-the-Kabala-of-Numbers_djvu.txt). This is a separate edition.
- **Johari access limitation:** [Internet Archive 1990 item](https://archive.org/details/numerologywithta0000joha); derivatives are marked private/access-restricted in metadata and were not opened.

## Local research-file checksums

These identify the complete local source files used in the audit. SHA-256
values were recomputed during the documentation review.

| Local file | Bytes | SHA-256 |
|---|---:|---|
| Balliett `philosophyofnumb00ball_djvu.txt` | 185,360 | `846DA171533697A23C6AC8B6262BBEF3C7AF078AB69834D2377869F53B40224C` |
| Sepharial 1920 `Sepharial-the-Kabala-of-Numbers_djvu.txt` | 264,431 | `B22951431794368B8590B9DD444E6072D03E0C430B0620610A2E92DB2EC4591D` |
| Sepharial 1911 scanned PDF | 11,968,015 | `98C64F8AE31BFB9743733058C5296FD182F664DB947A701C16DF8373A718BF69` |
| Sepharial 1911 extracted complete text | 234,074 | `73BAAC4E1E360E93F0EC8A227365846BE2B0E14239755BC672A153C5E2A2424E` |
| Cheiro revised-edition OCR | 318,634 | `97361815589C61C727362A433488706709EBD479B7BF7E8352B9BD30EDBDE5AC` |
| Cheiro revised-edition scanned PDF | 10,927,436 | `E491417288DD837EA25EBB5896AC5A7A9DB92FC48DBF7331DBD7A5C9CF20D542` |

## Exclusions

Johari's primary full text was inaccessible; “Kiro” has not been established
as an author or as Cheiro; and “Adhunik” has no verified title, author, or
method. No method is inferred from search snippets, restricted derivatives,
or unverified later records.
