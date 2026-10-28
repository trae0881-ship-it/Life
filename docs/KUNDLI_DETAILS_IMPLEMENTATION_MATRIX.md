# Kundli Details implementation matrix

Updated: 2026-10-19

This matrix records the 18 fields requested for the Kundli Details section.
“Implemented” means the field is populated from the existing validated chart
snapshot or an explicitly disclosed user value. It does not mean the
underlying convention has independent astronomical or classical-text
validation. The live chart and account saved-report view share the same
projection in `src/presentation/kundli-details.ts` and
`src/app/KundliDetails.tsx`.

| # | Field | Calculation / input source | Required inputs | UI destinations | Localization | Unit / boundary tests | Independent reference status | Final status |
|---:|---|---|---|---|---|---|---|---|
| 1 | Rashi (Janma Rashi) | Calculated Moon sidereal sign; selected chart ayanamsa | Validated birth instant, timezone, coordinates, supported ephemeris | Chart overview, live details, saved report | en/hi/hinglish labels | Engine/sign-boundary and projection tests | No independent sidereal reference fixture | Implemented; independently unverified |
| 2 | Naam | Optional chart `fullName`; never inferred or copied from profile label | User entry | Calculation receipt, live details, saved report | en/hi/hinglish labels | Projection and absent-name tests | Not applicable; user-supplied text | Implemented as input; no separate profile-name field |
| 3 | Lagna | Swiss Ephemeris house calculation and selected sidereal ayanamsa | Complete birth date/time, IANA zone, coordinates, supported house system | Chart overview, live details, saved report | en/hi/hinglish labels | Engine/API and repeatability tests | No independent cusp fixture | Implemented; independently unverified |
| 4 | Balance of Dasha at birth | Vimshottari from calculated sidereal Moon; 365.2425-day year; display rounded to 3 decimals | Moon longitude and resolved birth instant | Dasha panel, live details, saved report | en/hi/hinglish labels and units | Dasha sequence/boundary and projection tests | No independent Dasha output fixture | Implemented; convention disclosed, independently unverified |
| 5 | Tithi | Geocentric Moon-Sun elongation in 12-degree intervals | Calculated Sun and Moon positions | Panchanga panel, live details, saved report | Existing Panchanga labels | Angular boundary and projection tests | No full independent Panchanga fixture | Implemented; internally tested |
| 6 | Nakshatra | Sidereal Moon in 27 equal divisions | Calculated sidereal Moon longitude | Panchanga panel, live details, saved report | Existing names; detail label localized | Nakshatra boundary and projection tests | No independent Vedic fixture | Implemented; internally tested, independently unverified |
| 7 | Nakshatra Pada | Four equal subdivisions of the calculated Nakshatra | Calculated sidereal Moon longitude | Panchanga panel, live details, saved report | Localized field and Pada label | Pada boundary and projection tests | No independent fixture | Implemented; internally tested |
| 8 | Yoga | Sidereal Sun-plus-Moon longitude in 27 equal divisions | Calculated Sun and Moon positions | Panchanga panel, live details, saved report | Existing Panchanga labels | Angular boundary and projection tests | No full independent Panchanga fixture | Implemented; internally tested |
| 9 | Karana | Moon-Sun elongation in 6-degree divisions and existing names | Calculated Sun and Moon positions | Panchanga panel, live details, saved report | Existing Panchanga labels | Angular boundary and projection tests | No full independent Panchanga fixture | Implemented; internally tested |
| 10 | Ishtkaal | No selected and fully sourced time convention | Reviewed definition, reference sunrise/day rule, units, conversion, rounding | Live details, saved report | en/hi/hinglish field labels; unresolved status localized | Test confirms no value is fabricated | No convention/reference established | Unavailable; do not infer |
| 11 | Sunrise | Local Swiss Ephemeris rise event and IANA local-time formatting; no-event retained | Validated local date, timezone, latitude, longitude | Rise/set panel, live details, saved report | Field label localized; local time and zone shown | Event/no-event and projection tests | Limited published event checks only; not full independent validation | Implemented; validation partial |
| 12 | Rashi Swami | Existing sign-lord table projected for calculated Moon sign | Calculated Moon sign | Live details, saved report | en/hi/hinglish field label | Dignity table and projection tests | Rule-source review not established | Implemented as derived convention |
| 13 | Nakshatra Swami | Vimshottari birth Nakshatra lord | Calculated sidereal Moon longitude | Dasha panel, live details, saved report | en/hi/hinglish field label | Nakshatra lord cycle and projection tests | No independent fixture | Implemented as derived convention; independently unverified |
| 14 | Nakshatra Paya | No selected mapping or formula | Reviewed mapping, inputs, and variation policy | Live details, saved report | en/hi/hinglish field labels; unresolved status localized | Test confirms no value is fabricated | No sufficiently established source/convention | Unavailable; do not infer |
| 15 | Yoni | 27-star mapping from Moon Nakshatra; Sheep/Goat represents Mesha | Calculated Moon Nakshatra | Live details, saved report | Field and all 14 output categories in en/hi/hinglish | Exhaustive 27-name mapping, unknown-name and missing-input tests | Saravali table and Maitreya 8 index map agree; no independent numerical calculation fixture | Implemented as a selected traditional classification |
| 16 | Gana | Selected Saravali/Maitreya 27-star mapping from Moon Nakshatra | Calculated Moon Nakshatra | Live details, saved report | Field and all 3 categories in en/hi/hinglish | Exhaustive 27-name mapping, unknown-name and missing-input tests | Saravali table and Maitreya 8 index map agree; PyJHora documents a separate South-style variant | Implemented; selected variant disclosed |
| 17 | Nadi | Selected 27-star Asta Koota mapping from Moon Nakshatra | Calculated Moon Nakshatra | Live details, saved report | Field and all 3 categories in en/hi/hinglish | Exhaustive 27-name mapping, unknown-name and missing-input tests | Saravali table and Maitreya 8 index map agree; no independent numerical calculation fixture | Implemented as a selected traditional classification |
| 18 | Varna | Asta Koota convention: Moon Rashi, not Nakshatra/Navamsa/Ascendant/Sun | Calculated Moon sign | Live details, saved report | Field and all 4 categories in en/hi/hinglish | All 12 signs and invalid/missing signs tested | Saravali Moon-Rashi table and PyJHora implementation cross-check; not a numerical calculation fixture | Implemented as a selected traditional classification |

## Presentation and persistence limits

- The fields are localized for English, Hindi, and Hinglish. User-entered
  `Naam` is not overwritten by any suggested name.
- Yoni/Gana/Nadi use Moon Nakshatra and Varna uses Moon Rashi. These are
  traditional labels only, not compatibility scores or factual judgments
  about character, health, caste, or outcome. Their selected mappings and
  variations are documented in `CALCULATION_METHODS.md`.
- Sunrise retains the engine's reported local timestamp and timezone. A
  no-event result remains unavailable; no fallback time is substituted.
- Dasha balance uses the existing 365.2425-day convention and displays three
  decimal places with its unit and convention note.
- A profile's `label` is currently distinct from the chart input's optional
  `fullName`. The database has no separate profile-name field. This phase does
  not add persisted fields or a migration.
- The fields appear in the live chart and the account's opened saved-report
  view. The profile editor links to that profile's newest saved report, while
  remaining a birth-data editor; it does not recalculate or persist derived
  fields.
- No independent validation is claimed for any displayed value beyond the
  specific fixtures listed in `CALCULATION_VALIDATION_MATRIX.md`.
