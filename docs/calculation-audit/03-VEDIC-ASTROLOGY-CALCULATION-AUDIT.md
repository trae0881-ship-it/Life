# Vedic Astrology Calculation Audit

## Executed synthetic birth profile

- Name: Synthetic Audit Profile
- DOB: `1997-04-27`
- Time: `05:45 Asia/Kolkata`
- UTC: `1997-04-27T00:15:00.000Z`
- Coordinates: `30.483997, 76.593948`
- Ayanamsa: Lahiri
- House system: Placidus
- Node: true node plus True Ketu
- Engine: `@swisseph/node 1.4.0`

## Lagna and houses

Lagna: Aries `11.94801181269429°`, DMS `11°56'52"`, Ashwini Pada 4.

House cusps:

| House | Sign | Cusp longitude |
|---|---|---:|
| 1 | Aries | 11.948012 |
| 2 | Taurus | 42.290398 |
| 3 | Gemini | 66.457086 |
| 4 | Gemini | 89.695986 |
| 5 | Cancer | 116.158055 |
| 6 | Virgo | 150.109075 |
| 7 | Libra | 191.948012 |
| 8 | Scorpio | 222.290398 |
| 9 | Sagittarius | 246.457086 |
| 10 | Sagittarius | 269.695986 |
| 11 | Capricorn | 296.158055 |
| 12 | Pisces | 330.109075 |

## D1 planetary output

| Planet | Sidereal longitude | Sign | House | Nakshatra | Pada | Motion |
|---|---:|---|---:|---|---:|---|
| Sun | 12.967645 | Aries | 1 | Ashwini | 4 | Direct |
| Moon | 243.196022 | Sagittarius | 8 | Mula | 1 | Direct |
| Mercury | 10.376896 | Aries | 12 | Ashwini | 4 | Retrograde |
| Venus | 19.284711 | Aries | 1 | Bharani | 2 | Direct |
| Mars | 142.923106 | Leo | 5 | Purva Phalguni | 3 | Retrograde |
| Jupiter | 295.197446 | Capricorn | 10 | Dhanishta | 1 | Direct |
| Saturn | 349.767115 | Pisces | 12 | Revati | 1 | Direct |
| Uranus | 284.745997 | Capricorn | 10 | Shravana | 2 | Direct |
| Neptune | 276.131811 | Capricorn | 10 | Uttara Ashadha | 3 | Direct |
| Pluto | 221.150888 | Scorpio | 7 | Anuradha | 3 | Retrograde |
| True node | 154.238739 | Virgo | 6 | Uttara Phalguni | 3 | Retrograde |
| True Ketu | 334.238739 | Pisces | 12 | Uttara Bhadrapada | 1 | Retrograde |

## Divisional charts

The engine exposes D2-D60. Executed D9/D10/D60 sign placements are recorded with the actual engine output:

- D9 Lagna Cancer 107.532106°, Sun Cancer 116.708808°, Moon Aries 28.764195°, Jupiter Leo 136.777010°, Saturn Sagittarius 267.904034°.
- D10 Lagna Cancer 119.480118°, Sun Leo 129.676453°, Moon Capricorn 271.960217°, Jupiter Taurus 41.974455°, Saturn Taurus 47.671148°.
- D60 Lagna Pisces 356.880709°, Sun Taurus 58.058717°, Moon Gemini 71.761303°, Jupiter Pisces 341.846732°, Saturn Gemini 76.026891°.

The implementation uses named mappings in `src/calculation/rules.ts`. D2-D60 mapping tests passed in the suite. This does not independently establish every classical varga interpretation.

## Vimshottari

Actual birth values:

- Birth Moon: Mula, Pada 1, sidereal longitude `243.19602171182112°`
- Starting Mahadasha: Ketu
- Birth balance: `5.322088601293914` years
- Birth Ketu Mahadasha: `1995-08-23T03:58:50.530Z` to `2002-08-22T20:43:14.530Z`
- At `2026-11-26`: Sun Mahadasha `2022-08-22T17:07:14.530Z` to `2028-08-22T04:02:26.530Z`
- Mercury Antardasha `2026-06-10T15:14:12.130Z` to `2027-04-17T02:11:01.330Z`

Formula: 27 equal nakshatras; 365.2425-day year; Mahadasha sequence Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury; child years equal parent years x child lord years / 120.

## Panchanga

Actual output:

- Civil weekday: Sunday
- Nakshatra: Mula, Pada 1
- Tithi: Krishna Panchami
- Karana: Kaulava
- Yoga: Shiva
- Moon-Sun elongation: `230.228376°`

## Verification limits

The result hash is `0ae713702eeee93283fa959555f84752d6e763695661037dbec3ee575388a361`. Provenance says `fullyVerified=false` and `independentReferenceValidation=not-performed`. Selected D1-D60 and tropical reference fixtures exist, but this exact customer-style sample is not independently reference-validated.
