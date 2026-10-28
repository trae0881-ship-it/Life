# Calculation methods

## Implemented calculation module

The D1 engine uses `@swisseph/node@1.4.0` and the checked-in local ephemeris files. The server verifies every asset SHA-256 before calculating. Swiss Ephemeris output flags must confirm Swiss data; fallback results are rejected. Each body is calculated in tropical and selected sidereal frames from the same UT instant. The configured Lahiri, Raman, or Krishnamurti ayanamsa is recorded; the engine checks tropical-minus-ayanamsa against the sidereal longitude. Mean node, true node, or both are selectable; each selected ascending node is paired with a derived descending node exactly 180° opposite, with matching angular speed and zero ecliptic latitude. Supported directly calculated bodies are Sun through Pluto plus the selected ascending node(s).

House calculation supports Whole Sign, Placidus, Koch, and Equal (Ascendant). Whole Sign cusps are derived from the sidereal ascendant sign; for the other systems, Swiss tropical cusps are shifted by the selected ayanamsa. Unsupported calculations fail with a house-system-specific error rather than substituting a different system. Ascendant, Midheaven, sidereal cusps, planet house placements, nakshatra, and pada are returned from full-precision values. Display DMS is derived only for presentation.

D2–D60 are returned as varga longitudes from unrounded sidereal longitudes. The engine exposes a convention string and 1-based segment for each result. The implementation follows the explicitly selected rule variants below; this is a software convention selection, not a claim that all schools agree. A mapping-only comparison now uses fixed outputs from PyJHora 4.8.7 (`V4.8.7`, commit `ca22995709bd60e371e7820a1a5efc80ce4cf821`); fixture scope and limitations are documented in `D1_D60_VALIDATION_MATRIX.md` and `data/reference/pyjhora-v4.8.7-varga-sign-fixtures.json`. LIFE does not import or depend on PyJHora.

- D2 Parashari Hora: odd signs map first/second halves to Leo/Cancer; even signs to Cancer/Leo.
- D3: occupied sign, fifth, ninth. D4: occupied sign then fourth-sign increments.
- D5: odd-sign starts Aries/Aquarius/Sagittarius/Gemini/Libra; even-sign starts Taurus/Virgo/Pisces/Capricorn/Scorpio.
- D6: odd signs count from Aries, even from Libra. D7: odd signs from themselves, even signs from the seventh.
- D8: movable/fixed/dual sign starts Aries/Sagittarius/Leo.
- D9 retains the existing movable/fixed/dual mapping (self/ninth/fifth); D10 retains odd self/even ninth.
- D11 uses LIFE's selected reverse-sign seed / forward-part Rudramsha mapping. Its external textual attribution is unverified; the PyJHora fixture establishes only that the implemented mapping matches that software's output.
- D12 counts sequentially from the occupied sign.
- D16 starts movable/fixed/dual signs from Aries/Leo/Sagittarius; D20 from Aries/Sagittarius/Leo.
- D24 starts odd signs from Leo and even signs from Cancer.
- D27 starts fire/earth/air/water signs from Aries/Cancer/Libra/Capricorn.
- D30 uses unequal Trimshamsha segments: odd signs [0,5,10,18,25,30] degrees and sign assignments Aries/Aquarius/Sagittarius/Gemini/Libra; even signs [0,5,12,20,25,30] and Taurus/Virgo/Pisces/Capricorn/Scorpio.
- D40 starts odd signs from Aries, even from Libra. D45 starts movable/fixed/dual signs from Aries/Leo/Sagittarius. D60 counts forward from the occupied sign.
- Factors other than the listed named factors use a labeled Parivritti Cyclic custom mapping. For source sign index `s`, division `N`, and zero-based segment index `p`, the target sign index is `(s × N + p) mod 12`; the fraction through the source segment is retained as the fraction through the target sign. These custom factors are calculated, but are not presented as universally established classical Shodashavarga rules.

For equal divisions, segment selection compares the normalized longitude to each sign-relative boundary `signStart + part × (30 / division)` without adding a fixed epsilon. This keeps exact boundaries start-inclusive while preserving a representable longitude immediately before a boundary in the preceding segment. D30 continues to use its separate unequal half-open boundaries. The implementation normalizes nonnegative longitudes without an unnecessary `+360` operation, avoiding precision loss near boundaries.

Every division D2–D60 is covered by numeric segment-boundary and range tests; D30 additionally tests both odd- and even-sign unequal boundary sets. A fixed independent mapping fixture compares 42,588 near-boundary probes across all source signs and segments with the pinned PyJHora methods. It compares sign indices only: the fixture inputs are synthetic sidereal positions, not an independently calculated birth chart. D1 natal positions, ayanamsha, ascendant, and houses remain without a matched independent chart fixture.

The comparison found and corrected the D45 modality starts: the previous implementation reused the D9/D20 start order `[Aries, Sagittarius, Leo]`, but the selected D45 rule requires `[Aries, Leo, Sagittarius]`. It also found that a fixed `1e-10°` boundary epsilon incorrectly promoted a value just before a boundary; the epsilon was removed and strict boundary regression coverage added. PyJHora's exact floating division boundaries can fall on the preceding segment because of binary floor-division, and its D30 function includes upper endpoints; those reference-specific ownership cases are not used as sign-mapping expected values. LIFE's selected half-open boundary behavior remains independently covered by internal tests.

Reference distribution note: the pinned PyJHora wheel and bundled license identify AGPL-3.0, while its `pyproject.toml` has an MIT classifier. PyJHora's mapping fixture was generated from pure transformation functions at the pinned source commit. The full package was later installed in a separate Python 3.11.9 runtime with NumPy 2.1.1 and pyswisseph 2.10.3.2; the wheels were unavailable for the original Python 3.15 runtime. No PyJHora source or runtime dependency was added to LIFE.

End-to-end natal-input reference check: three fixed synthetic inputs in
`data/reference/natal-chart-jpl-cases.json` exercise IANA wall-time resolution
and the complete birth-chart pipeline, then compare the pipeline's tropical
planet longitude/latitude fields to the independent JPL Horizons DE441
snapshots at the resolved UTC epochs. Kiritimati local `2000-01-02 02:00`
resolves to `2000-01-01 12:00Z`; Mumbai local `2024-06-21 05:30` resolves to
`2024-06-21 00:00Z`; an `Etc/UTC` fixture covers retrograde Mercury on
`2024-04-15 00:00Z`. All 14 available body/epoch pairs matched within 0.5
arcseconds; maximum absolute longitude/latitude deltas were 0.125212"/0.096341"
for Kiritimati, 0.043156"/0.033989" for Mumbai, and 0.049148"/0.008053" for
retrograde Mercury. Mercury's chart speed differed from the JPL one-minute
tropical finite-difference by `-0.000009914°/day`, within the fixture's
`0.001°/day` tolerance. This confirms only the exercised
tropical position outputs and wall-time resolution for those fixtures. JPL's
geocentric quantities do not validate the supplied geographic coordinates,
Lahiri sidereal conversion, ascendant, Placidus cusps, D1 signs, or natal
D2–D60 placements. No complete end-to-end sidereal chart has independent
expected values.

## PyJHora natal pipeline cross-check

`data/reference/pyjhora-natal-cases.json` contains fixed PyJHora 4.8.7 results
for the same three inputs, including D1–D60 signs, D1 sidereal longitudes,
Ascendant, and Placidus cusps. It was emitted by
`scripts/reference-pyjhora-natal.py` under isolated Python 3.11.9 with
PySwisseph 2.10.3.2 / Swiss Ephemeris 2.10.03, NumPy 2.1.1, geocoder 1.38.1,
pytz 2026.5, timezonefinder 6.0.1, geopy 2.5.0, python-dateutil 2.9.0.post0,
and requests 2.34.2. The pinned PyJHora 4.8.7 wheel SHA-256 is
`d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d`.
Wheel metadata and its bundled license identify AGPL-3.0; the MIT classifier
in `pyproject.toml` conflicts and is not treated as the governing license.

All **2,160 shared D1–D60 sign placements** matched exactly. The 36 shared D1
sidereal longitudes had a maximum absolute difference of
`2.842170943040401e-14°`; the 39 Ascendant/cusp values differed by at most
`5.684341886080802e-14°`. The fixed numerical allowance is four IEEE-754
double-precision ULPs at the 0–360° scale
(`3.197442310920451e-13°`), because both applications use the Swiss
Ephemeris implementation family and checked-in data; LIFE's binding does not
expose its embedded Swiss version. Sign indices require exact equality.
These tiny residuals represent floating operation order, not demonstrated
astronomical accuracy.

This is only a package-pipeline and convention cross-check. PyJHora uses Swiss
Ephemeris 2.10.03; LIFE uses `@swisseph/node` 1.4.0, which does not expose its
embedded Swiss version. Both use the Swiss Ephemeris implementation family
and the same local ephemeris assets, so a common-mode defect could affect both.
It does not independently validate sidereal positions, ayanamsa, houses, or
natal D1–D60 placements. Existing 42,588 near-boundary
mapping probes still provide separate D2–D60 mapping-rule evidence across all
segments and source signs; they are not natal boundary fixtures. No formula
change was warranted by these comparisons.

The chart workspace renders one explanation for each D1–D60 in English, Hindi,
and Hinglish. Each explains the chart's conventional name/use when recorded,
the selected mapping and ayanamsa, the actual placement-table facts, the
birth-time sensitivity, and the fact that no personalized divisional outcome
rule is currently reviewed or applied. For custom factors, LIFE states that it
does not assert a traditional life-topic meaning. Their explanation is specific
to the factor and reports its segment count and selected arithmetic convention.
The translated named-chart use descriptions reflect the existing LIFE metadata;
they are not quotations and were not independently source-reviewed in this
implementation pass. They remain marked `REVIEW_REQUIRED`, and no personalized
interpretation rule is inferred from them.
Saved chart snapshots reuse the same chart-workspace rendering when restored.
The D1 house column uses the calculated planet house assignment; it does not
infer a house from a possibly duplicated sign cusp.

Vimshottari uses the 120-year Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury cycle and a 365.2425-day dasha year. Initial balance is proportional to the Moon's elapsed fraction in its 27-equal-part birth nakshatra. Antardasha duration is Mahadasha years × sub-lord years ÷ 120. Pratyantardasha is calculated as Antardasha years × sub-sub-lord years ÷ 120, with the sub-period sequence beginning at the Antardasha lord. An earlier draft cited *Brihat Parashara Hora Shastra*, Chapter 61, verses 1–2 for this proportional rule; the linked PDF was not readable for verification, so that passage is a source candidate only and is not evidence that the text supports LIFE's exact formula. The candidate and its status are recorded on `/references`. All intervals are start-inclusive/end-exclusive; child periods share exact parent boundaries. Arithmetic, sequence and contiguity tests exist, but no independent Vedic Dasha reference fixture exists, so these results remain convention-based and independently unverified.

Panchanga Nakshatra and Pada use the chart's full-precision sidereal Moon longitude in 27 equal divisions of 13°20′ and four equal padas per Nakshatra. Boundaries are start-inclusive and wrap at 360°. Tithi and karana use geocentric Moon-minus-Sun elongation in 12° and 6° intervals; the fifteenth waxing/waning tithis are labeled Purnima/Amavasya respectively. Yoga uses the sidereal Sun+Moon sum in 27 equal divisions, with small floating-point boundary protection to preserve start-inclusive segments. The displayed weekday is the local civil date's weekday; the sunrise-adjusted vara is calculated separately (see the sections below). The website labels this as the calculated Panchanga Nakshatra/Pada. This is a convention-level implementation with internal boundary tests, not independent reference validation.

## Kundli Details classifications

Yoni, Gana, and Nadi are derived from the calculated Moon Nakshatra using the
27-star Asta Koota tables published in [Saravali: Yoni Koota](https://saravali.github.io/astrology/koota_yoni.html),
[Saravali: Gana Koota](https://saravali.github.io/astrology/koota_gana.html), and
[Saravali: Nadi Koota](https://saravali.github.io/astrology/koota_nadi.html).
The 27-star Yoni, Gana, and Nadi lists were also compared with the explicit
index maps in [Maitreya 8 `Nakshatra.cpp`](https://github.com/martin-pe/maitreya8/blob/master/src/jyotish/Nakshatra.cpp).
The Moon-Rashi Varna rule was cross-checked against
[PyJHora `compatibility.py`](https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/horoscope/match/compatibility.py).
PyJHora documents separate South Indian variants for Yoni enemy pairs and
Gana assignments; LIFE selects the Saravali/Maitreya 27-star classification
table and does not calculate compatibility scores. Saravali's pages identify
their content as CC BY-SA 4.0. These are source-reviewed traditional mappings,
not primary-text validation or independent numerical calculation fixtures.
The source labels vary: LIFE renders Mesha as “Sheep (Goat)” and Saravali's
“Manuj” as “Manushya.” Maitreya's Yoni function has an additional Abhijit
slot; for this comparison that slot is omitted to align its remaining 27
Nakshatras with LIFE's 27-star engine. LIFE displays the Yoni animal category
only, not Maitreya's separate male/female label.

| Moon Nakshatra | Yoni | Gana | Nadi |
|---|---|---|---|
| Ashwini | Horse | Deva | Adi |
| Bharani | Elephant | Manushya | Madhya |
| Krittika | Sheep (Goat) | Rakshasa | Antya |
| Rohini | Serpent | Manushya | Antya |
| Mrigashira | Serpent | Deva | Madhya |
| Ardra | Dog | Manushya | Adi |
| Punarvasu | Cat | Deva | Adi |
| Pushya | Sheep (Goat) | Deva | Madhya |
| Ashlesha | Cat | Rakshasa | Antya |
| Magha | Rat | Rakshasa | Antya |
| Purva Phalguni | Rat | Manushya | Madhya |
| Uttara Phalguni | Cow | Manushya | Adi |
| Hasta | Buffalo | Deva | Adi |
| Chitra | Tiger | Rakshasa | Madhya |
| Swati | Buffalo | Deva | Antya |
| Vishakha | Tiger | Rakshasa | Antya |
| Anuradha | Deer | Deva | Madhya |
| Jyeshtha | Deer | Rakshasa | Adi |
| Mula | Dog | Rakshasa | Adi |
| Purva Ashadha | Monkey | Manushya | Madhya |
| Uttara Ashadha | Mongoose | Manushya | Antya |
| Shravana | Monkey | Deva | Antya |
| Dhanishta | Lion | Rakshasa | Madhya |
| Shatabhisha | Horse | Rakshasa | Adi |
| Purva Bhadrapada | Lion | Manushya | Adi |
| Uttara Bhadrapada | Cow | Manushya | Madhya |
| Revati | Elephant | Deva | Antya |

Varna uses the Asta Koota Moon-Rashi convention, not the distinct
Navamsa-, Ascendant-, Sun-, or Nakshatra-based alternatives described in
[Saravali: Varna Koota](https://saravali.github.io/astrology/koota_varna.html).
The [PyJHora compatibility implementation](https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/horoscope/match/compatibility.py)
also maps Varna from Moon Rashi.

| Moon Rashi | Varna |
|---|---|
| Cancer, Scorpio, Pisces | Brahmin |
| Aries, Leo, Sagittarius | Kshatriya |
| Gemini, Libra, Aquarius | Vaishya |
| Taurus, Virgo, Capricorn | Shudra |

Varna labels are historical Jyotisha categories; they do not identify a
person's caste, social standing, or personal qualities. Yoni/Gana/Nadi/Varna
are shown as traditional classifications only, with no health, character,
compatibility, or outcome inference. Mapping tests exhaust the 27 project
Nakshatra names and all 12 Moon signs; they verify this selected data table,
not astronomical input accuracy or independent classical authority.

Ishtkaal and Nakshatra Paya remain unavailable. No reviewed source and
unambiguous convention was established for the sunrise-day/time conversion,
units, or rounding of Ishtkaal, or for the Nakshatra Paya assignment. They
must not be inferred from elapsed time, a Nakshatra, or a Pada without further
source review.

## Astronomical events: rise/set, sunrise-based vara and transits

Sunrise, sunset, moonrise and moonset come from the local binding's `swe_rise_trans` for the upper limb with its default atmospheric refraction at sea level; observer altitude is not collected. Each event searches forward from local midnight of the reference date, so an event that falls on the following local date (common for moonrise) is reported with its true instant and flagged rather than forced onto the reference date. A circumpolar or absent event is returned as `no-event` with a reason; no time is ever invented.

The sunrise-based Vara is the weekday of the most recent sunrise at the observer's location, so an instant before its own local date's sunrise belongs to the previous day's vara; when no sunrise occurs, the vara is `unavailable`.

Transits report the sidereal longitude/sign/nakshatra of each body plus the next sidereal sign-ingress after the selected instant, strictly within the requested horizon. The ingress instant is located by forward scanning (body-specific step) then bisection on the sign boundary until the bracket is below 1e-7 days (~8.6 ms); the achieved interval is reported as `refinementDays`. The calculation API requires a valid UTC `Date`, a supported ayanamsa, and a finite positive horizon in days. Ingress instants are returned in UTC ISO form; conversion to local wall time is the caller's responsibility and must use the requested IANA zone. All event times inherit the UTC-as-UT1 approximation documented for the chart engine. No independent fixed ingress-time comparison has yet been performed.

## Yogas, doshas, planetary dignity and aspects

Dignity classifies each body as exalted, moolatrikona, own sign, friendly/neutral/enemy, or debilitated from published exaltation/moolatrikona/friendship tables, and flags combustion against the Sun (tighter retrograde orbs for Mercury and Venus) and retrogression from the engine's signed speed. Aspects use Parashari full-strength graha drishti (every body aspects the 7th; Mars 4th/8th; Jupiter 5th/9th; Saturn 3rd/10th; the nodes 5th/7th/9th).

Yogas and doshas are computed from rasi houses counted from the ascendant (and the Moon/Sun where the rule requires): Kemadruma, Sunapha, Anapha, Durudhara, Chandra-Mangala, Gajakesari, Adhi, Shakata, Vesi, Vasi, Ubhayachari, Budhaditya, the five Pancha Mahapurusha yogas, Amala, Mangal (Kuja), Grahan, Shrapit, Pitra and the twelve named Kaal Sarpa forms. Every finding carries the literal rule that produced it. The current Grahan and Pitra node association is a same-sign test, not an angular-distance conjunction; this is a deliberately broad, convention-dependent rule. These are rule-derived conventions with boundary unit tests, not independent classical-text validation; the Moon's conditional (paksha-dependent) benefic status is not applied to Amala or Adhi.

## Kundli layouts and rule-based readings

North Indian and South Indian D1 layouts use the same engine-calculated sidereal planet signs. Both visualization modes count Rashi houses from the sidereal Lagna sign; the selected house system's cusps and house assignments are shown separately, so changing the view does not change calculated placements. Empty signs and multiple bodies are retained.

`src/interpretation/catalog.ts` stores category-specific house topics and their stated conventions; `src/interpretation/rules.ts` evaluates that catalog against the calculated chart and emits structured evidence, matched conditions, Dasha/transit context, conflicts, evidence-strength labels, sources and limitations. Evidence strength only distinguishes a single from multiple calculated factors; it is not a probability or measure of predictive reliability.

Natal house lordship is resolved from the sign on each returned house cusp and the planet's selected-system house placement. Thus a selected Placidus/Koch/Equal system uses its returned cusps, while whole-sign charts use whole-sign cusps. Traditional house topics used are: education 4/5/9; career 6/10/11; business 3/7/11; finances 2/5/11; relationships 2/7/8; spiritual interests 9/12; personality uses the ascendant, its 1st-house lord and Moon. These are transparent software conventions, not claims of consensus or independently validated outcome rules. Business and relationship readings deliberately use different combinations.

Active Vimshottari Mahadasha, Antardasha and Pratyantardasha periods are selected with start-inclusive/end-exclusive boundaries and contextualized by the period lord's natal sign, selected-system house, resolved house lordships, reported dignity, same-sign placements, and available Parashari aspects. No event dates are inferred. Selected-date transit comparisons include the snapshot instant and the birth profile's IANA timezone; transit houses are explicitly counted by Rashi sign from Lagna and are not represented as selected-system cusp houses.

No D9/D10/D60 interpretation is currently generated: mapping conventions alone do not validate the suitability or outcome meaning of varga-based interpretation rules. Missing required factors produce an unavailable category rather than a generic reading. Yogas/doshas preserve the calculation module's literal matched condition and warn that convention may be broad or school-dependent. All readings are traditional Jyotisha symbolism, not scientific or guaranteed forecasts and are not independently validated against classical-text outcomes.

## KP (Krishnamurti Paddhati)

KP is calculated with its own Krishnamurti ayanamsa and Placidus cusps, independent of the chart's selected ayanamsa and house system. Each longitude is resolved to sign, sign lord, 27-equal-nakshatra star lord, and sub and sub-sub lords; each nakshatra and sub is split into nine Vimshottari-proportional segments (`years ÷ 120 × span`) starting from the parent lord, with start-inclusive boundaries. The documented significator convention includes houses occupied and owned by a planet and by its star lord. Rahu and Ketu additionally signify houses occupied and owned by their sign dispositor; conjunction/aspect association rules for nodes are not included. Cusp significators are derived by reversing those planetary house sets. Sub-lord interval boundaries and these significator relationships have unit tests; the rules have not been independently reference-validated.

Local date/time resolution uses the Node runtime's ICU/IANA timezone data. It enumerates nearby UTC offsets and checks the exact wall-clock fields, returning a required choice for repeated times and a clear error for nonexistent times. The time-zone database version is recorded with the receipt. Julian Day is computed from the normalized UTC instant and passed to Swiss `calc_ut` as its Universal Time input. LIFE does not apply a DUT1 (UT1−UTC) correction; the UTC input is therefore not an independently verified UT1 conversion. Swiss `calc_ut` internally applies its Delta T model for planetary positions, but the Node binding does not expose the numeric Delta T value in the chart result. The Swiss programming documentation and a pending IERS Bulletin D metadata source are linked from `/references`; the latter could not be retrieved during this audit. This is an explicit limitation, not an independent UT1/TT/TDB validation.

Name and birthplace label are report-only inputs. A suggested birthplace can supply coordinates and a timezone from the bundled offline GeoNames index, or users may enter coordinates manually; no live network geocoding is used, and suggested locations should be checked against a reliable birth record. If time is unknown, the UI explains that time-dependent placements cannot be calculated and does not substitute noon or another guessed time. Date-only planetary ranges are not implemented.

Every result records engine version, local file checksums, settings, flags, input instant, and a deterministic result hash. In-engine consistency checks run before the receipt is returned. `fullyVerified` stays false and each individual chart's reference-validation status stays `not-performed`. Separate pinned JPL Horizons planetary fixtures cover two planetary-position epochs and a Mercury retrograde-rate check, but do not validate the complete chart or a user's specific calculation. The wrapper calculates with Julian UT; a complete persisted TT/UT1/TDB audit record is not exposed. This implementation is not an accuracy certification.

## Versioned external comparison fixture

`data/reference/jpl-horizons-de441-2000-01-01.json` captures NASA/JPL Horizons DE441 Quantity 31 output for ten major bodies at the geocenter at 2000-01-01 12:00 UT. `data/reference/jpl-horizons-de441-2024-06-21.json` adds Sun, Moon, and Mars at 2024-06-21 00:00 UTC. `data/reference/jpl-horizons-de441-2024-04-15-mercury-retrograde.json` pins Mercury positions at adjacent one-minute instants during retrograde motion. The fixtures record query settings, the apparent IAU76/80 ecliptic-of-date frame and effects, time convention, retrieval date, output resolution, Swiss comparison mode, and tolerances. `tests/reference.test.mjs` compares against the pinned values offline; it never calls JPL at test time.

In the J2000 fixture, the largest absolute observed differences remain **0.1252 arcsecond in longitude** (Moon) and **0.0963 arcsecond in latitude** (Pluto), below the **0.5-arcsecond** tolerance. For the 2024 June fixture, the largest residuals are **0.0432 arcsecond longitude** (Mars) and **0.0340 arcsecond latitude** (Sun). Mercury's 2024 April rate is retrograde in both systems; the Swiss instantaneous longitude speed differs from the one-minute JPL finite difference by about **0.00005 degrees/day**, below the fixture's **0.001 degrees/day** rate tolerance. These checks cover only the listed bodies/epochs and comparison setup. They do not independently validate UTC-to-UT1 conversion, Lahiri/Raman/Krishnamurti ayanamsa, houses, lunar nodes, the complete ephemeris range, or upstream observational independence, and must not set a chart's `fullyVerified` flag.

## Calculation contract and future work

Future engine expansions should retain the validated birth instant (local date/time, IANA zone, resolved UTC offset, UTC instant), coordinates, zodiac mode, ayanamsa, house system, node mode, engine/data versions, and calculation flags. They should return full-precision numerical values plus explicit time scales, provenance, warnings, and unsupported-condition errors. Display rounding must happen only in presentation code.

The implementation must explicitly distinguish UT/UT1, TT and TDB according to the selected library; define geocentric/topocentric and apparent/true coordinate conventions; document tropical/sidereal frame and ayanamsa; and identify house cusp conventions and high-latitude failures. No fallback engine or guessed coordinate is permitted.

## Method records and remaining validation

- Engine name/version/build and calculation flags.
- Ephemeris asset filenames, source revision, checksums, license and date coverage.
- Timezone database version and ambiguous/nonexistent local time policy.
- Planet set and longitude/latitude/distance/speed conventions.
- Ayanamsa IDs and exact engine modes.
- House system IDs and unsupported latitude behavior.
- Varga-specific divisional rules, source convention and boundary behavior.
- Dasha year length, balance calculation, hierarchy and interval boundary policy.
- KP methodology and unequal sub-lord interval convention.
- Panchanga angular definitions and rise/set event conventions.
- Transit root-finding method, tolerances, and search-window behavior.

The records above are present in the current implementation and its receipts where supported. Remaining gaps include verified full ephemeris date coverage and independent references for time scales, ayanamsa, houses, vargas, dasha, KP, Panchanga, events, and yoga/dosha rules. House regression tests compare selected system semantics across locations and explicitly exercise high-latitude supported/unsupported cases; they are tests of integration behavior, not independent house calculation references.

Golden fixtures must have documented independent provenance and a declared tolerance. Tests must not claim NASA/JPL validation unless the named local reference dataset and implementation are present and comparisons actually run. The checked-in JPL fixtures compare 14 planetary longitude/latitude pairs across three epochs plus a finite-difference retrograde-rate case; they are limited snapshots, not broad ephemeris validation. PyJHora chart outputs are a shared-Swiss pipeline cross-check, not independent ephemeris validation. Other engine smoke inputs and internal boundary tests are not independent reference fixtures.
