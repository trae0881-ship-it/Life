# Phase 20: Calculation, Reference, and Licensing Audit

Audit scope: application source and tests under `src/` and `tests/`, project
documentation, reference fixtures, configuration-level external links, and
bundled files under `data/`. Dependency internals were not recursively audited;
only direct-package metadata needed to identify the calculation engine was
checked. No calculation algorithm, database, user record, or production
service was changed.

## Feature-by-feature findings

| Feature | Implementation | References and exact scope | Tests and independent validation | Status and limitations |
|---|---|---|---|---|
| Planetary positions | `src/calculation/chart.ts`; `@swisseph/node@1.4.0`; `data/ephemeris/sepl_18.se1`, `semo_18.se1` | Swiss Ephemeris Programmer's Documentation describes the Julian-day, `swe_calc_ut`, and flag flow. JPL Horizons DE441 Quantity 31 fixtures specify geocenter, apparent ecliptic-of-date longitude/latitude, epoch, and comparison tolerances. | `tests/reference.test.mjs` and `tests/natal-chart-reference.test.mjs` compare 14 longitude/latitude pairs at three epochs and a Mercury finite-difference rate. Maximum reported longitude/latitude deltas are within the fixtures' 0.5 arcsecond tolerance. | **Partially verified.** This is a narrow numerical cross-check, not full-range or observational certification. It does not test sidereal conversion, ayanamsa, houses, nodes, chart time-scale accuracy, or interpretations. The PyJHora pipeline check shares the Swiss Ephemeris software family and is not independent astronomy validation. |
| D1 sidereal chart, ayanamsa, ascendant, houses, lunar nodes | `src/calculation/chart.ts`; `src/calculation/rules.ts` | Swiss documentation supports engine/API use, not LIFE's selected Lahiri/Raman/Krishnamurti or house conventions. These choices are LIFE implementation conventions. JPL tropical geocentric fixtures do not cover these outputs. | `tests/engine.test.mjs`, `tests/houses.test.mjs`, and the pinned PyJHora natal comparison exercise consistency and selected inputs. PyJHora's 2,160 D1–D60 signs match, but it uses the Swiss Ephemeris software family. | **Not independently verified end-to-end.** No independent matched sidereal chart, ascendant, house-cusp, node, or ayanamsa fixture exists. High-latitude/error tests are implementation tests, not an independent house calculation reference. |
| D2–D60 divisional sign mapping, including D11 | `src/calculation/rules.ts`; `src/calculation/divisional-metadata.ts` | The pinned PyJHora 4.8.7 commit is an implementation comparison only; it is not a classical-text authority. LIFE's named and custom mapping choices are documented in `docs/CALCULATION_METHODS.md`. | `tests/divisional-charts.test.mjs` compares 42,588 synthetic near-boundary mapping probes across D2–D60 and tests internal boundaries. All compared mapping signs match the pinned PyJHora outputs. | **Software mapping matched; tradition/source validation incomplete.** No natal ephemeris is used in the synthetic fixture. The D11 reverse-seed/forward-part choice is retained as a LIFE convention; no exact external work, edition, or passage has been verified for its attribution. |
| Vimshottari Dasha | `src/calculation/rules.ts`; period presentation in `src/interpretation/` | The 120-year sequence, 365.2425-day year, elapsed-nakshatra balance, proportional child-period formula, and interval boundary convention are visible implementation choices. The former citation to *Brihat Parashara Hora Shastra*, Chapter 61, verses 1–2, could not be checked against readable text and is now labeled a source candidate only. | `tests/rules.test.mjs`, `tests/kundli-predictions.test.mjs`, and period-analysis tests cover order, arithmetic, contiguity, and boundaries. No independent Dasha example fixture exists. | **Internally tested; external formula attribution unverified.** Internal arithmetic tests do not establish that a traditional text supports the exact implemented rule or that Dasha predicts events. |
| Panchanga, Nakshatra, Tithi, Karana, Yoga, Vara | `src/calculation/rules.ts`, `src/calculation/chart.ts`, `src/calculation/events.ts` | The equal divisions, angular intervals, sidereal sum, weekday, and sunrise-adjusted Vara are LIFE's documented calculation conventions. No exact external table/formula source was established for the complete implementation. | `tests/rules.test.mjs`, `tests/events.test.mjs`, and chart tests cover boundaries, labels, and behavior. No independent Panchanga reference fixture exists. | **Internally tested; independently unverified.** Swiss astronomical positions do not validate the traditional labels or conventions. |
| KP lords, significators, and marriage-timing candidates | `src/calculation/kp.ts`, `src/calculation/events.ts`, `src/calculation/chart.ts` | The repository documents the Krishnamurti ayanamsa, Placidus cusps, proportional sub-lord divisions, significator rules, and LIFE candidate-window rule IDs. No primary KP text or authoritative external implementation was verified for the full rule set. | `tests/kp.test.mjs`, marriage-timing and period-analysis tests exercise lord chains, boundaries, candidate generation, and disclosure text. No independent KP fixture exists. | **Internally tested; independently unverified.** Candidate windows are software outputs, not validated predictions or event dates. |
| Yogas, doshas, dignity, aspects | `src/calculation/yogas.ts`, `src/calculation/rules.ts` | The exact predicates and convention descriptions are implementation rules. No exact classical passage was mapped to each predicate; some same-sign associations are explicitly broad. | `tests/yogas.test.mjs` and calculation tests verify rule behavior only. | **Internally tested; source-to-rule validation incomplete.** No independent source fixture establishes interpretive meaning or outcome accuracy. |
| Transits and timeline | `src/calculation/events.ts`, `src/calculation/chart.ts`, `src/interpretation/rules.ts` | Planet positions use the Swiss engine; a JPL position snapshot does not independently validate transit crossing times or the traditional interpretation of transit houses. Transit house counting and candidate windows are LIFE rules. | `tests/events.test.mjs`, `tests/period-analysis.test.mjs`, and interpretation tests cover computed behavior. No independent ingress/transit-event fixture exists. | **Partially tested; transit semantics and interpretations independently unverified.** |
| Sunrise, sunset, moonrise, and moonset | `src/calculation/events.ts` through Swiss `swe_rise_trans` | Swiss documentation describes the upstream API. A former Mumbai solstice test attributed an approximate day length to a WorldTimeLab page but did not contain a retrievable exact URL; the external attribution was removed rather than treated as independent evidence. | `tests/events.test.mjs` checks Swiss event output, event ordering, timezone labels, and polar no-event behavior. The equinox day-length assertion is a local regression expectation, not an independent published comparison. | **Implementation-tested; no verified independent rise/set fixture.** |
| Birthplace search and timezone resolution | `src/server/location-search.ts`, `src/calculation/time.ts`, `src/presentation/location-search.ts`, `data/locations/city-index/` | GeoNames official export README identifies the `cities500` source and CC BY 4.0 terms. Node uses its bundled ICU/IANA timezone data; LIFE records the runtime timezone version. IANA's latest release is not asserted to equal the runtime's version. | `tests/location-search.test.mjs` and `tests/time.test.mjs` check offline lookup, timezone conversion, DST gaps/overlaps, and valid coordinate ranges. These tests do not verify every gazetteer coordinate against a primary record or reconstruct the source dataset. | **Source provenance partially verified.** The index count differs from its recorded source count; transformation provenance is incomplete. A place suggestion is not a verified birth-record coordinate. |
| Interpretations and remedies | `src/interpretation/catalog.ts`, `src/interpretation/rules.ts`, `src/presentation/remedies.ts`, `src/presentation/personalized-remedies.ts` | The app identifies these as traditional symbolism, project rules, and educational material. Exact external editions/passages are not mapped for all rules or remedies. Personalized remedy drafts remain unapproved/inactive. | Interpretation/remedy tests verify software behavior and safeguards only. | **Externally unverified.** No scientific validation or reliable predictive performance is claimed. |

## Verified sources and their limits

- **Swiss Ephemeris Programming Interface** — the official programming page was
  readable and describes Julian-day computation and the `swe_calc_ut` API. It
  documents the engine interface; it does not validate LIFE's input accuracy,
  selected conventions, or all outputs.
- **JPL Horizons API and DE441 fixtures** — the official API documentation was
  readable. The checked-in snapshots and test settings are reproducible offline
  and define only the selected geocentric apparent tropical comparisons.
- **GeoNames export README and CC BY 4.0** — the official README states the
  license, “as is” disclaimer, and dataset fields. The CC BY 4.0 terms require
  attribution, a license link, and indication of modifications. LIFE's
  `data/locations/README.md` now records those modifications.
- **Maitreya 8 `COPYING`** — the upstream file states GNU GPL v2.0 or later. LIFE
  compares explicit mapping data; no Maitreya source code is redistributed.
- **PyJHora 4.8.7** — the pinned mapping and fixture can be reproduced as a
  software comparison. Existing wheel/license metadata and its MIT classifier
  conflict; resolve that metadata conflict before copying or redistributing
  PyJHora material. No PyJHora runtime dependency is added to LIFE.
- **IANA Time Zone Database** — the IANA site identifies the database; the
  runtime's actual ICU/tzdb version is recorded separately. The IANA site is
  not itself the implementation of LIFE's timezone resolution.
- **Saravali Koota pages** — the cited Yoni/Gana/Nadi/Varna page content was
  reachable and can be compared with the selected tables. An authoritative
  license notice was not verified on the cited page or a linked repository.
  Existing LIFE documentation's CC BY-SA 4.0 statement is therefore not treated
  as established permission. Do not redistribute adapted table content until
  reuse terms are confirmed.

## Unverified citations and registry corrections

- The linked *Brihat Parashara Hora Shastra* PDF did not yield readable text in
  this audit. The claimed Chapter 61, verses 1–2 attribution and its connection
  to LIFE's proportional Pratyantardasha formula remain unverified.
- The IERS Bulletin D product metadata URL returned HTTP 400 during retrieval.
  The cited DUT1 metadata and stated precision remain unverified here. LIFE does
  not apply DUT1.
- The earlier D11 “Sanjay Rath” attribution had no exact work, edition, or
  passage. It has been removed from implementation descriptions; the selected
  numeric mapping is unchanged and remains a LIFE convention.
- The earlier WorldTimeLab sunrise comparison had no exact source URL and
  could not be verified. Its assertion was removed from the test suite; the
  remaining event tests do not claim independent published validation.
- Product strategy and market-comparison links in project documentation are
  editorial/operational references, not evidence for calculation algorithms.
- The registry now includes the directly relevant Swiss programmer interface,
  installed Node binding, JPL API documentation, and unresolved BPHS/IERS
  records. Registry entries marked `not_yet_verified` are candidates or
  limitations, not authorities for the linked calculation.

## Licensing, data provenance, and release blockers

1. **Swiss Ephemeris `.se1` data files:** the checked-in `sepl_18.se1` and
   `semo_18.se1` SHA-256 values match `data/ephemeris-manifest.json`. The
   package and official Swiss documentation establish the engine's dual-license
   model and LIFE's selected AGPL path, but do not establish file-specific
   redistribution rights for these two data assets. Obtain and record
   authoritative data-file terms before public distribution.
2. **GeoNames index count/provenance:** inspection of all 620 compressed shards
   found 237,018 rows, 236,275 distinct IDs, and 743 repeated IDs across
   shards. The repository's prior source-extract count was 236,560, a 285-ID
   difference from distinct indexed IDs. The original source extract and
   transformation script are absent, so omissions/additions and the count
   difference cannot be reconstructed. The index was not modified.
3. **GeoNames license:** the authoritative export README states CC BY 4.0 and
   “as is.” The repository now records attribution, license link, and that LIFE
   filtered fields and created compressed prefix shards. This attribution does
   not establish the accuracy of individual coordinates or timezone fields.
4. **Saravali reuse terms:** table content was accessed, but its license was
   not verified. Confirm permissions before distributing adapted table data.
5. **PyJHora metadata:** the pinned distribution's AGPL metadata conflicts with
   its MIT classifier. Avoid redistribution until resolved.
6. **Maitreya:** the upstream COPYING file states GPL-2.0-or-later. LIFE uses
   it as a reference comparison and does not include its source code.

No bundled files were deleted or replaced. The audit did not change database
schema or data, apply migrations, create accounts, or deploy.

## Validation boundary and next steps

Existing JPL and PyJHora comparison tests were retained; no new expected
astronomical or traditional outputs were invented. The D11 regression test
checks the selected mapping and its unverified status without changing its
numeric result. The WorldTimeLab assertion was removed because its source
identity was not verifiable. Tests for Dasha, KP, Panchanga, houses, yogas,
transits, interpretations, and remedies remain implementation tests unless
explicitly described above.

Before claiming broader accuracy or releasing bundled assets:

1. Obtain authoritative terms for the two Swiss Ephemeris data files.
2. Recover the exact GeoNames source snapshot and transformation procedure, or
   clearly treat the current index as an unreproducible derived snapshot.
3. Confirm Saravali table reuse rights and resolve PyJHora license metadata.
4. Verify the exact BPHS translation/passages and the IERS DUT1 product.
5. Add independent, settings-compatible fixtures for sidereal charts, houses,
   Dasha, Panchanga, KP, rise/set, and transits where a reliable source exists.
6. Record and verify the native Swiss library version and its Delta T behavior.

Passing software tests does not imply scientific validation of astrology
predictions.
