# LIFE Calculation Validation Matrix v1.0

Tolerance is meaningful only when the reference quantity uses the same epoch,
time scale, observer, coordinate frame, ayanamsa, and apparent/geometric
definition. Existing JPL fixtures are compatible with the conventions recorded
in their JSON metadata and are not evidence for every feature.

| Calculation | Input convention / algorithm | Required inputs | Reference evidence | Tolerance / pass criterion | Current gate |
|---|---|---|---|---|---|
| Tropical planetary longitude/latitude | Swiss Ephemeris `@swisseph/node` 1.4.0, local DE441 assets, geocentric ecliptic-of-date apparent fixture convention | UTC instant, supported ephemeris date | Offline JPL Horizons DE441 fixtures at 2000-01-01 and 2024-06-21 | Fixture arcsecond tolerance; wrap-aware longitude and latitude delta | CALCULATION VERIFIED for covered snapshots |
| Birth-input normalization → tropical chart positions | `calculateBirthChart` with IANA local date/time resolution; fixed Lahiri/Placidus/true-node chart settings; tropical body fields compared with JPL | Local date/time, IANA zone, coordinates, selected chart settings | Three fixed cases in `data/reference/natal-chart-jpl-cases.json`; 2000 Kiritimati `+14:00` resolves to Jan 1 12:00Z (10 bodies); 2024 Mumbai `+05:30` resolves to June 21 00:00Z (Sun, Moon, Mars); 2024 UTC retrograde Mercury; 14 comparisons total | 0.5 arcseconds, wrap-aware longitude and absolute latitude; Mercury finite-difference rate tolerance 0.001°/day | MATCHED for listed tropical outputs, UTC resolution and Mercury retrograde case only; not sidereal or house validation |
| Mercury retrograde direction/rate | Swiss longitude speed versus finite-difference reference samples | UTC epoch and adjacent samples | Offline DE441 Mercury fixture, 2024-04-15 | Fixture longitude tolerance and declared degrees/day rate tolerance | CALCULATION VERIFIED for covered case |
| Sidereal longitude/ayanamsa | Tropical result minus selected Swiss Lahiri, Raman, or Krishnamurti ayanamsa | UTC instant, ayanamsa selection | PyJHora 4.8.7 full-chart comparison for three Lahiri fixtures; shares Swiss engine and local files | Exact D1 output in tested environment; four-ULP allowance for serialization/operation order; not independent ephemeris evidence | SOFTWARE TESTED; independent validation NOT VERIFIED |
| Time-zone conversion | IANA wall time resolved to UTC with explicit DST ambiguity handling | Local date/time, IANA zone, optional selected offset | `Intl`/runtime behavior and deterministic fixtures | Exact UTC for fixture; reject nonexistent/ambiguous unresolved times | SOFTWARE TESTED for covered cases |
| Houses/ascendant/cusps | Swiss `calculateHouses`; selected Whole Sign, Placidus, Koch, or Equal; sidereal display subtracts selected ayanamsa | UTC Julian day, latitude, longitude, house system, ayanamsa | PyJHora Placidus/Ascendant comparison for three Lahiri fixtures; shares Swiss engine and local files; JPL geocentric planet positions do not validate houses | Four-ULP double-precision allowance for same-engine outputs; no independent house algorithm fixture | SOFTWARE CROSS-CHECKED; NOT INDEPENDENTLY VERIFIED |
| D1 placements | Planet positions assigned to selected houses and zodiac fields | Complete known-time birth input | JPL tropical subset plus PyJHora sidereal D1/Ascendant/Placidus output cross-check; PyJHora shares Swiss engine and files | Tropical JPL 0.5 arcseconds; PyJHora shared-core outputs within four ULPs | SOFTWARE CROSS-CHECKED; NOT INDEPENDENTLY VERIFIED |
| D2–D60 divisional sign mappings | Documented named mapping functions and labelled custom cyclic rules; see pinned reference comparison below | Synthetic sidereal longitude and division (mapping-only); three fixed birth inputs for pipeline cross-check | Fixed PyJHora 4.8.7 mapping outputs (42,588 probes) plus full natal chart pipeline outputs; both use Swiss Ephemeris family and the same local files (LIFE's embedded version is not exposed) | Exact mapping sign-index equality; exact natal sign indices; four-ULP numerical allowance for shared-core output | MAPPING REFERENCE MATCHED and PIPELINE CROSS-CHECKED; natal astronomy NOT independently validated |
| Vimshottari Dasha | Moon Nakshatra/Pada start balance; 365.2425-day year; proportional nested periods | Valid Moon sidereal longitude and birth instant | No independent Dasha output fixture. BPHS Ch. 61 verses 1–2 documents proportional sub-period duration, not a checked numerical result | Parent coverage, child boundaries, chronological ordering | SOFTWARE TESTED; NOT INDEPENDENTLY VERIFIED |
| KP lords/subs/significators | Krishnamurti ayanamsa, 27 equal Nakshatras, Vimshottari-proportional sub/sub-sub segments, Placidus cusps | Sidereal longitudes and 12 Placidus cusps | No independent KP output fixture; JPL tropical positions do not validate KP ayanamsa, cusps, or significators | Boundary ownership `[start,end)`, finite fields, deterministic significators | SOFTWARE TESTED; NOT INDEPENDENTLY VERIFIED |
| Panchanga Tithi/Karana/Yoga | Local Swiss planetary positions and documented angular divisions | UTC instant and birth location where applicable | No full independent Panchanga reference set | Boundary/ordering invariants; no external tolerance currently | SOFTWARE TESTED; NOT INDEPENDENTLY VERIFIED |
| Nakshatra/Pada | Sidereal Moon longitude divided into 27 Nakshatras and four Padas | UTC instant and ayanamsa | Derived calculation; no independent Vedic fixture | Boundary and range invariants | SOFTWARE TESTED; NOT INDEPENDENTLY VERIFIED |
| Kundli Details Yoni/Gana/Nadi/Varna | Selected 27-star Asta Koota mappings and Moon-Rashi Varna mapping; see `CALCULATION_METHODS.md` | Calculated Moon Nakshatra or Moon sign | Tables cross-read from Saravali and Maitreya 8 for 27-star assignments; Saravali and PyJHora for Moon-Rashi Varna | Exhaustive mapping-table tests; no astronomical tolerance applies | SOURCE-REVIEWED / SOFTWARE TESTED; not primary-text verified and not an independent numerical chart fixture |
| Vara/sunrise/sunset/moonrise/moonset | Local event search using coordinates/time zone and Swiss positions | UTC date, latitude, longitude, IANA zone | Selected published Mumbai day-length/rise checks; no full refraction suite | Covered event/date checks; published day length within 5 minutes | PARTIAL |
| Transits/sign ingress | Swiss positions at instant plus local ingress search horizon | Valid UTC instant, ayanamsa, positive finite horizon | No fixed independent ingress timestamp fixture; existing Sun ingress date range is a local regression expectation, not a sourced numerical reference | Future event ordering, longitude boundary, direction and finite/range invariants | SOFTWARE TESTED; NOT INDEPENDENTLY VERIFIED |
| Dignity/aspects/Yogas/Doshas | Documented local Parashari-style rules over calculated chart facts | D1 placements, houses, settings | No independently reviewed classical passage set | Matching/non-matching deterministic rule fixtures | SOFTWARE TESTED; INTERPRETATION NOT VERIFIED |
| Calculation provenance | Hash of inputs/settings/results, engine and asset versions | Successful calculated chart | Receipt contract tests | Same input => same result; changed input metadata is traceable | SOFTWARE TESTED |

## Invalid and boundary requirements

- Reject unsupported ephemeris dates rather than falling back.
- Reject invalid dates, coordinates, zones, and unresolved DST overlaps.
- Test leap days, DST gaps/overlaps, sign/house/Nakshatra boundaries, retrograde
  direction changes, polar no-event conditions, and node-mode selection.
- Preserve UTC and local display conventions in every fixture.

## Independent validation gaps

Before marking the remaining rows independently verified, add compatible
fixtures across multiple epochs and locations, record source metadata and
observed deltas, and ensure the fixture does not merely call Swiss Ephemeris
through a second wrapper.

## Phase 2 — divisional mapping comparison (2026-10-21)

The fixed fixture `data/reference/pyjhora-v4.8.7-varga-sign-fixtures.json`
compares D2–D60 sign mappings with transformation functions from PyJHora
4.8.7 release `V4.8.7`, commit
`ca22995709bd60e371e7820a1a5efc80ce4cf821`. The downloaded wheel SHA-256 is
`d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d`; its
chart-source hashes match the pinned repository source. The wheel license and
metadata identify AGPL-3.0, despite an MIT classifier in its `pyproject.toml`.
No PyJHora code or dependency was added to LIFE.

Expected outputs were generated by executing only the pure transformation
functions from the exact source commit (with that source's constants and
cyclic utilities). The package was not fully installed or used to calculate
birth planetary positions: the available Python 3.15 environment has no
compatible wheels for PyJHora's pinned NumPy 2.1.1 and pyswisseph 2.10.3.2.
Fixture inputs are synthetic already-sidereal `(source sign, degrees within
sign)` positions. Therefore date, time, timezone, coordinates, and ayanamsha
do not apply to this mapping-only comparison.

Named chart methods use PyJHora `chart_method=1`, except D2, which uses
`chart_method=2` for the documented traditional Hora matching LIFE. Custom
LIFE factors use PyJHora's `custom_divisional_chart(base_rasi=None)` cyclic
method. Every segment and all 12 source signs are probed 1e-7° before/after
boundaries; exact sign indices must match (zero rounding tolerance). All
42,588 expected sign placements match after correcting D45. D30 exact
boundaries are excluded because PyJHora assigns inclusive upper endpoints,
unlike LIFE's half-open segment rule. Other equal-division exact probes are
excluded because PyJHora's floating floor-division sometimes assigns a
representable mathematical boundary to the preceding segment; LIFE exact
boundary ownership is covered by internal tests.

This does not independently validate D1, natal planetary longitudes, the
ayanamsha, ascendant, or house cusps. No complete end-to-end D1–D60 birth-chart
comparison is established.

## Phase 4 independent-reference status (2026-10-19)

| Requested group | Independent source/reference checked | Exact comparison performed | Tolerance/result | Status and blocker |
|---|---|---|---|---|
| Vimshottari start lord, balance, dates and boundaries | BPHS Ch. 61 verses 1–2 is documented for proportional child periods; PyJHora is an existing project convention cross-reference | No independent implementation output was obtained. Internal tests verify lord sequence, elapsed fraction, parent/child arithmetic, chronology, and start-inclusive/end-exclusive boundaries | No independent numerical delta or tolerance can be reported | NOT INDEPENDENTLY VALIDATED. PyJHora package version/source mismatch and missing local package prevented reproducible execution; see `PREDICTION_QUALITY_EVALUATION_V1.md` |
| KP planet positions, lords, sub-lords, sub-sub-lords and cusps | Existing JPL Horizons DE441 fixtures independently cover selected geocentric tropical planetary positions only. PyJHora is a documented convention cross-check | No matching KP ayanamsa, Placidus cusp, or full KP-chain reference output | No KP numerical delta or tolerance can be reported | NOT INDEPENDENTLY VALIDATED. The JPL fixtures do not validate sidereal KP longitudes, cusp calculation, or derived lords/significators |
| D9/Navamsa sign placement and boundaries | PyJHora chart-rule source is an existing convention cross-check; source documents the selected movable/fixed/dual seed convention | No pinned PyJHora numerical D9 output was compared. LIFE tests D9 at segment and sign boundaries internally | No independent D9 delta or tolerance can be reported | NOT INDEPENDENTLY VALIDATED. A source-rule cross-check is not a numerical output fixture |
| Transit ingress, retrograde crossing and timezone conversion | Existing JPL fixtures validate selected tropical positions/rates, not a sidereal ingress event. Existing Sun ingress test checks a broad July date range without a recorded external timestamp source | No independent ingress timestamp, pre/post-boundary longitude pair, or external timezone-converted event was compared | No ingress residual or timezone error can be reported | NOT INDEPENDENTLY VALIDATED. The service reports ingress UTC; local formatting is a separate caller operation. The fixed-source event fixture remains to be obtained |

The tests named in the code provide software regression evidence only. No
independent comparison is claimed for the four requested groups in this phase.
The Phase 4 direct-call transit input guard rejects invalid date, ayanamsa, and
horizon values before ephemeris work; it does not alter the numerical method.

## Phase 3A — natal chart pipeline comparison (2026-10-21)

`data/reference/natal-chart-jpl-cases.json` records three complete fixed birth
inputs and points to independent JPL Horizons DE441 snapshots. The 2000 case
is Kiritimati, local `2000-01-02 02:00`, IANA zone `Pacific/Kiritimati`,
`+14:00`, resolved to `2000-01-01T12:00:00Z`. The 2024 case is Mumbai, local
`2024-06-21 05:30`, IANA zone `Asia/Kolkata`, `+05:30`, resolved to
`2024-06-21T00:00:00Z`. The third case uses UTC for the JPL Mercury retrograde
reference at `2024-04-15T00:00:00Z`. All record coordinates, Lahiri sidereal
chart mode, Placidus house setting, true-node setting, local Swiss Ephemeris
assets/manifest, and UTC reference epoch. Reference positions are geocentric
apparent tropical ecliptic-of-date quantities; the observer coordinates and
house system do not affect these reference quantities.

The test runs each input through LIFE's timezone resolution, local ephemeris,
house calculation, and chart assembly, then compares tropical longitude and
latitude for 10 bodies at the 2000 epoch, Sun/Moon/Mars at the June 2024 epoch,
and Mercury at the April 2024 epoch. All 14 body/epoch comparisons pass the
fixed 0.5 arcsecond tolerance (wrap-aware longitude and absolute latitude).
Observed maximum absolute longitude/latitude differences: Kiritimati
`0.125212"/0.096341"`; Mumbai `0.043156"/0.033989"`; retrograde Mercury
`0.049148"/0.008053"`. Mercury's chart speed differs from the JPL one-minute
tropical finite-difference by `-0.000009914°/day`, within the declared
`0.001°/day` rate tolerance, and both classify it as retrograde.

This is not independent evidence for Lahiri ayanamsa, sidereal planetary
positions, ascendant, house cusps/assignments, D1 signs, or D2–D60 placements.
The separately executed PyJHora chart output is documented below, but both
systems use the Swiss Ephemeris implementation family and local files. LIFE's
binding does not expose its embedded Swiss version, so this does not close the
independent-engine validation gap.

## Phase 3B — PyJHora natal pipeline cross-check (2026-10-21)

PyJHora 4.8.7 was installed in a separate Python 3.11.9 runtime using
PySwisseph 2.10.3.2 (Swiss Ephemeris 2.10.03), NumPy 2.1.1, geocoder 1.38.1,
pytz 2026.5, timezonefinder 6.0.1, geopy 2.5.0, python-dateutil 2.9.0.post0,
and requests 2.34.2. The reference wheel SHA-256 is
`d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d`.
Its metadata and bundled license state AGPL-3.0; the upstream pyproject MIT
classifier conflicts. The isolated environment is not a LIFE runtime
dependency.

Fixed inputs/outputs are stored in `data/reference/pyjhora-natal-cases.json`
and reproducibly emitted by `scripts/reference-pyjhora-natal.py`. Across the
Kiritimati, Mumbai, and UTC retrograde cases, the fixture compares 2,160
shared D1–D60 sign assignments, 36 D1 sidereal longitude values, and 39
Ascendant/Placidus cusp values. There were zero sign mismatches. Maximum
absolute differences are `2.842170943040401e-14°`
(`1.0231815394945443e-10″`) for D1 longitudes and
`5.684341886080802e-14°` (`2.0463630789890885e-10″`) for Ascendant/cusps.
Exact sign equality is required; numerical tolerance is four double-precision
ULPs at 0–360° (`3.197442310920451e-13°`) for only serialization and
operation-order differences.

PyJHora invokes Swiss Ephemeris 2.10.03; LIFE uses `@swisseph/node` 1.4.0,
whose embedded Swiss version is not exposed. Both use the Swiss Ephemeris
implementation family and the same local ephemeris files. This comparison
verifies reproducible application wiring and convention agreement, but is not
an independent ephemeris or astronomical validation. The strict independent
gates for sidereal positions, houses, and all end-to-end D1–D60 natal charts
therefore remain NOT INDEPENDENTLY VALIDATED. No calculation formula changed.
