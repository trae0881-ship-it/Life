# D1–D60 Divisional Chart Validation Matrix v1.3

## Scope and shared implementation details

This matrix describes the repository implementation, not astrological truth or
predictive performance.

- **Calculation source:** D1 is assembled in `src/calculation/chart.ts`;
  D2–D60 use `calculateDivisionalLongitude` in `src/calculation/rules.ts`.
  Chart-specific names and conventional-use notes are in
  `src/calculation/divisional-metadata.ts`; localized explanation text is in
  `src/presentation/divisional-chart-explanations.ts`.
- **Inputs/configuration:** one validated birth instant resolved from the
  recorded local date/time and IANA timezone, validated coordinates, local
  Swiss Ephemeris planetary positions and ascendant, and the selected sidereal
  ayanamsa. D2–D60 map full-precision sidereal longitudes; retrograde status is
  retained as a planetary fact but does not change the geometric varga mapping.
  Missing or invalid required chart inputs fail before a chart is returned.
- **UI/report path:** `src/app/DivisionalChartSections.tsx` creates one
  navigable section and explanation for each D1–D60, and consumes the same
  saved chart result when a saved report is restored in the chart workspace.
  D1 houses use the calculated house assignment, not an inferred sign match.
- **Testing:** `tests/rules.test.mjs` exercises every division across all 12
  source signs and its segment boundaries; `tests/divisional-charts.test.mjs`
  verifies calculation wiring, all 60 explanation records in English, Hindi,
  and Hinglish, the D1 house projection, and the UI/report section source.
- **Interpretation:** traditional purposes are descriptive context only.
  No personalized D1–D60 divisional-chart outcome rule is marked reviewed or
  implemented. For unnamed/custom factors, the UI explains the actual selected
  arithmetic mapping and explicitly makes no chart-specific traditional
  purpose claim.
- **Independent references:** D2–D60 sign mappings are compared to fixed
  transformation outputs from PyJHora 4.8.7 at commit
  `ca22995709bd60e371e7820a1a5efc80ce4cf821`; fixture provenance, methods,
  and limitations are recorded below and in
  `data/reference/pyjhora-v4.8.7-varga-sign-fixtures.json`. LIFE does not
  import PyJHora. The comparison uses synthetic sidereal longitudes to isolate
  varga mapping; it does not independently validate birth planetary
  longitudes, ayanamsa, ascendant, or houses. Phase 3A additionally runs
  complete public birth inputs through LIFE's timezone resolution and chart
  pipeline, comparing 14 tropical planet positions against fixed JPL
  Horizons DE441 values across three epochs. A separate PyJHora 4.8.7
  full-chart fixture reproduces D1–D60 sign placements for three fixed birth
  inputs, but PyJHora and LIFE use the same Swiss Ephemeris implementation
  family and local files. PyJHora's version is 2.10.03; LIFE's `@swisseph/node`
  binding does not expose its embedded Swiss version. That is a
  pipeline/convention cross-check, not independent astronomical validation.
  No end-to-end natal D-chart is independently validated.

The per-chart rows below separate implementation and internal tests from
independent validation. A UI explanation is not evidence that the underlying
traditional interpretation has been source-reviewed.

Separate status registers:

| Status dimension | Charts | Result |
|---|---|---|
| Calculated and rendered | D1–D60 | IMPLEMENTED; D1 is assembled from the chart result and D2–D60 are calculated by the selected engine rules. |
| Internal mapping and boundary tests | D1–D60 | SOFTWARE_TESTED; D2–D60 segment boundaries are tested across all 12 source signs, including both D30 layouts. |
| Localized chart explanations | D1–D60 | IMPLEMENTED in English, Hindi, and Hinglish; source placements and limitations are rendered with each chart. |
| Personalized interpretation rule status | D1, D13–D15, D17–D19, D21–D23, D25–D26, D28–D29, D31–D39, D41–D44, D46–D59 | UNSUPPORTED; no chart-specific personalized divisional outcome rule is applied. |
| Traditional-use source review | D2–D12, D16, D20, D24, D27, D30, D40, D45, D60 | REVIEW_REQUIRED; descriptions indicate common traditional associations, not validated interpretation rules. |
| Independent varga sign-mapping comparison | D2–D60 | REFERENCE-MATCHED for 42,588 near-boundary probes across every segment and all 12 source signs using pinned PyJHora 4.8.7 outputs; astronomical birth inputs are not part of this mapping-only comparison. |
| Birth input normalization and tropical planetary path | three fixed non-user cases | TIME RESOLUTION MATCHED; 14 longitudes and latitudes across three epochs compare to fixed JPL DE441 snapshots within 0.5 arcseconds. This does not validate sidereal positions or houses. |
| PyJHora natal chart pipeline/convention cross-check | D1–D60; three fixed cases | SOFTWARE CROSS-CHECK MATCHED: 2,160 sign placements, 36 D1 sidereal longitude values, and 39 ascendant/Placidus cusp values; exact sign equality and floating residuals within four double-precision ULPs. The Swiss version in LIFE's binding is not exposed; both use the Swiss Ephemeris implementation family and local data. |
| Independent sidereal D1 and end-to-end natal comparison | D1–D60 | NOT VALIDATED; no independent ephemeris/reference engine checks Lahiri planetary positions, ascendant/cusps, and the resulting complete natal/divisional charts. |

**How to read each row:** chart names are taken from the metadata registry
(unnamed higher factors remain custom rather than being assigned guessed
Sanskrit names); the convention column is the sign-placement algorithm; inputs,
ayanamsha, zodiac frame, source files, and saved-report path are shared as
specified above. All 60 rows have a localized calculation/use/limitation
explanation. `REVIEW_REQUIRED` applies to named traditional-use descriptions;
`UNSUPPORTED` applies to D1's personalized outcome rule and custom factors.
Neither status is an implemented or source-reviewed personalized interpretation.
The per-chart “independent reference” cells describe independent mapping-rule
evidence, not independent natal astronomy. The PyJHora birth-output comparison
below is a separate software/convention check because it shares the Swiss
Ephemeris implementation family and local data with LIFE. The version embedded
in LIFE's binding is not exposed, so exact Swiss patch-level parity is unknown.

Status meanings:

- **IMPLEMENTED**: the chart has a distinct calculation/display section and
  documented software convention.
- **SOFTWARE_TESTED**: implementation plus deterministic boundary tests pass.
- **INDEPENDENTLY_VERIFIED**: compatible independent numerical/reference
  evidence exists for the end-to-end chart inputs and output. No complete
  D-chart currently meets this bar.
- **MAPPING_REFERENCE_MATCHED**: divisional sign mapping agrees with the
  pinned independent mapping fixtures; this does not validate natal
  astronomical inputs or houses.
- **BLOCKED**: required inputs, calculation output, or safe reference evidence
  is unavailable.

All D2–D60 rows use `calculateDivisionalLongitude`. Equal divisions use the
documented segment mapping; D30 uses unequal odd/even sign segments. D2, D3,
D4, D5, D6, D7, D8, D9, D10, D11, D12, D16, D20, D24, D27, D30, D40, D45,
and D60 have named conventions in the engine. Other divisions are explicitly
labelled `Parivritti Cyclic custom varga`; they are not silently treated as
universally classical mappings.

Browser QA evidence (2026-10-19):

- This is previously recorded browser evidence. Browser-based QA was not
  repeated during the current implementation pass.

- Local Next.js application tested at desktop-sized and 390×844 mobile
  viewports using a deterministic UTC fixture (`2000-01-01 12:00`, `Etc/UTC`,
  0° latitude/longitude).
- The rendered page contained 60 unique `division-D1` through
  `division-D60` sections, 60 navigation links, and 60 immediately following
  `.divisional-birth-report` elements.
- Navigating to `#division-D60` preserved the fixture profile and selected
  chart details. English, Hindi, and Hinglish label switching rendered without
  missing translation-key text.
- Invalid date input disabled calculation and displayed a localized field
  error. Initial no-chart state and server-generated invalid-provenance
  payloads were not injectable through the browser UI; their fail-closed
  behavior remains covered by automated tests.
- No browser console or failed-request evidence was observed during the
  successful calculation flow. Browser QA does not establish calculation or
  interpretation correctness.

Independent mapping-reference evidence:

- Reference: PyJHora 4.8.7 release `V4.8.7`, commit
  `ca22995709bd60e371e7820a1a5efc80ce4cf821`; wheel SHA-256
  `d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d`.
  The wheel's `charts.py` and `drik.py` hashes match the files at the pinned
  commit. Its bundled license and wheel metadata state AGPL-3.0; the
  `pyproject.toml` MIT classifier conflicts with that license text and is not
  treated as the governing license. No PyJHora code or runtime dependency was
  added to LIFE.
- Compatibility: the complete package could not be installed on the available
  Python 3.15 runtime because pinned NumPy 2.1.1 and pyswisseph 2.10.3.2 have
  no compatible wheels in that environment. A separate Python 3.11.9 runtime
  later installed the full pinned package and dependencies as wheels. The
  mapping-only comparison below still uses the exact pure chart-transformation
  function definitions and their cyclic utility functions.
- Inputs/settings: synthetic already-sidereal `(zero-based source sign,
  degrees within sign)` positions; all 12 source signs and every segment.
  Ayanamsha, date, time, timezone, coordinates, and house system do not apply
  to an isolated mapping function. Named PyJHora methods use `chart_method=1`,
  except D2, which uses `chart_method=2` (documented traditional Hora, matching
  LIFE's selected convention); unnamed LIFE custom factors use PyJHora's
  `custom_divisional_chart(base_rasi=None)` cyclic mapping.
- Comparison: 42,588 fixed probes within 1e-7° on both sides of segment
  boundaries; exact sign-index equality, no rounding tolerance. All D2–D60
  probes matched after the D45 correction. D30 exact boundaries are excluded
  because PyJHora uses inclusive upper endpoints while LIFE uses half-open
  segments. Other exact equal-division probes are also excluded because
  PyJHora's floating floor-division can assign a representable mathematical
  boundary to the preceding part; LIFE exact ownership is separately tested.
- Scope: these fixtures independently validate the D2–D60 sign-mapping
  transformations only. They are not expected outputs for a birth date and
  do not compare independently calculated planetary/ascendant longitudes.
  JPL/DE441 fixtures validate selected tropical positions and do not close
  these sidereal/house gaps.

Phase 3A birth-input-to-chart-pipeline comparison:

- Fixed synthetic, non-user test inputs using public location coordinates are in
  `data/reference/natal-chart-jpl-cases.json`. The first is local
  `2000-01-02 02:00`, `Pacific/Kiritimati`, coordinates 1.8721° N,
  157.4278° W, resolving to `2000-01-01 12:00:00Z` (`+14:00`). The second is
  `2024-06-21 05:30`, `Asia/Kolkata`, coordinates 19.0760° N, 72.8777° E,
  resolving to `2024-06-21 00:00:00Z` (`+05:30`). The third uses UTC,
  `2024-04-15 00:00`, at 0°, 0° to exercise the fixed Mercury retrograde
  reference. All use Lahiri sidereal output, Placidus houses, true node, and
  local Swiss Ephemeris assets v1.
- Independent references are pinned, pre-existing JPL Horizons DE441 fixtures
  at those UTC epochs. They provide geocentric apparent tropical longitude and
  latitude (10 bodies at the 2000 epoch; Sun, Moon, and Mars in 2024; Mercury
  in the 2024 retrograde case). Input coordinate and house settings are
  recorded for reproducibility but do not affect geocentric reference
  quantities.
- The birth-chart calculation was run from local date/time and IANA timezone
  through output creation; all 14 available planet-position pairs match the
  fixed references at the 0.5 arcsecond tolerance. Maximum observed absolute
  longitude/latitude deltas: Kiritimati 0.125212"/0.096341"; Mumbai
  0.043156"/0.033989"; retrograde Mercury 0.049148"/0.008053". Mercury's
  speed differs from the JPL one-minute tropical finite-difference rate by
  `-0.000009914°/day` (declared tolerance `0.001°/day`); both classify it as
  retrograde.
- The comparison does not establish Lahiri ayanamsha, sidereal longitudes,
  ascendant, Placidus cusps, houses, D1 signs, D2–D60 natal placements, or
  nodes. No independent end-to-end divisional chart is validated. No
  discrepancy was found in the supported tropical quantities.

Phase 3B PyJHora full-chart pipeline cross-check:

- `data/reference/pyjhora-natal-cases.json` contains fixed outputs generated
  by `scripts/reference-pyjhora-natal.py` for all D1–D60 charts across the
  three fixed cases above. The reference records complete local birth inputs,
  verified IANA offset resolutions, Lahiri sidereal settings, Placidus
  houses, true-node mode, local ephemeris assets, and chart-method choices.
- The Python 3.11.9 environment was isolated outside the project. It used
  PyJHora 4.8.7, PySwisseph 2.10.3.2 / Swiss Ephemeris 2.10.03, NumPy 2.1.1,
  geocoder 1.38.1, pytz 2026.5, timezonefinder 6.0.1, geopy 2.5.0,
  python-dateutil 2.9.0.post0, and requests 2.34.2. The PyJHora wheel
  SHA-256 is `d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d`.
  Wheel metadata and the bundled license state AGPL-3.0; its upstream
  `pyproject.toml` MIT classifier conflicts. Nothing from PyJHora was added
  to LIFE's runtime dependencies.
- Exact sign-index comparison passed for **2,160** shared D1–D60 placements.
  The reference's Ketu is excluded because LIFE does not separately expose it
  in these chart outputs. Across the three cases, 36 shared D1 sidereal
  longitudes differ by at most `2.842170943040401e-14°`
  (`1.0231815394945443e-10″`); three ascendants and 36 Placidus cusps differ
  by at most `5.684341886080802e-14°` (`2.0463630789890885e-10″`).
  The numerical allowance is four double-precision ULPs at 0–360°
  (`3.197442310920451e-13°`); sign indices require exact equality.
- This is an application-pipeline/convention cross-check, not independent
  astronomical validation: PyJHora calls Swiss Ephemeris 2.10.03; LIFE uses
  `@swisseph/node` 1.4.0, whose embedded Swiss version is not exposed. Both
  use the same checked-in ephemeris files and Swiss implementation family.
  It cannot rule out shared ephemeris, time-scale, or data errors. The 42,588 mapping probes cover all 12 source
  signs and every D2–D60 segment near boundaries, but are not birth-derived
  boundary cases. No discrepancy was found. Every D1–D60 chart remains
  `NOT INDEPENDENTLY VERIFIED` for end-to-end natal astronomy; no calculation
  formula or question-answer rule was changed.

| Chart / name | Implementation | Convention / boundary behavior | Unit/boundary tests | Independent reference evidence (excluding shared-core cross-checks) | Limitations | Final status |
|---|---|---|---|---|---|---|
| D1 - Rashi | Distinct section and calculated Rashi placements | Selected ayanamsa/house system; sign boundaries start-inclusive | PASS | JPL tropical subset matched; PyJHora pipeline cross-check matched (shared Swiss core) | Lahiri, ascendant/cusps, D1 placements, and interpretations lack independent-engine validation | SOFTWARE_TESTED; NOT INDEPENDENTLY VERIFIED |
| D2 - Hora | Distinct section and engine output | Named Hora mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal/Hora fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D3 - Drekkana | Distinct section and engine output | Named Drekkana mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal/Drekkana fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D4 - Chaturthamsha | Distinct section and engine output | Named Chaturthamsha mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D5 - Panchamsha | Distinct section and engine output | Named Panchamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D6 - Shashthamsha | Distinct section and engine output | Named Shashthamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D7 - Saptamsha | Distinct section and engine output | Named Saptamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D8 - Ashtamsha | Distinct section and engine output | Named Ashtamsha modality mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D9 - Navamsha | Distinct section and engine output | Named Navamsha modality mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D10 - Dashamsha | Distinct section and engine output | Named Dashamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D11 - Rudramsha / Ekadashamsha | Distinct section and engine output | LIFE-selected reverse-sign seed / forward-part mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | External textual attribution is unverified; software match is not a tradition/source validation; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D12 - Dwadashamsha | Distinct section and engine output | Named Dwadashamsha sequential mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D13 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D14 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D15 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D16 - Shodashamsha | Distinct section and engine output | Named Shodashamsha modality mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D17 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D18 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D19 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D20 - Vimshamsha | Distinct section and engine output | Named Vimshamsha modality mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D21 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D22 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D23 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D24 - Chaturvimshamsha / Siddhamsha | Distinct section and engine output | Named Chaturvimshamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D25 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D26 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D27 - Saptavimshamsha / Bhamsha | Distinct section and engine output | Named Saptavimshamsha element mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D28 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D29 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D30 - Trimshamsha | Distinct section and engine output | Named unequal odd/even Trimshamsha segments; start-inclusive | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; tradition variants exist | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D31 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D32 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D33 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D34 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D35 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D36 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D37 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D38 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D39 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D40 - Khavedamsha | Distinct section and engine output | Named Khavedamsha odd/even mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D41 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D42 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D43 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D44 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D45 - Akshavedamsha | Distinct section and engine output | Named Akshavedamsha modality mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D46 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D47 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D48 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D49 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D50 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D51 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D52 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D53 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D54 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D55 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D56 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D57 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D58 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D59 - unnamed custom cyclic factor | Distinct section and engine output | Parivritti Cyclic custom mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | Custom convention not source-reviewed; natal positions unvalidated | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |
| D60 - Shashtiamsha | Distinct section and engine output | Named Shashtiamsha forward mapping; start-inclusive segments | PASS | PyJHora 4.8.7 mapping fixture: PASS | No independent natal-position fixture; mapping only | SOFTWARE_TESTED; MAPPING_REFERENCE_MATCHED |

No chart is marked `INDEPENDENTLY_VERIFIED`. A chart can be rendered and
software-tested without being numerically or traditionally independently
validated. The PyJHora pipeline cross-check passed for each D1–D60 row above,
but it does not upgrade any chart's independent natal-astronomy status because
both applications use the Swiss Ephemeris implementation family and local
data (the version embedded in LIFE's binding is not exposed).
