# References and source attribution

The public `/references` page is generated from the version-controlled registry
in `src/presentation/references.ts`. That registry is the canonical source list;
do not add a citation directly to a UI component without adding and testing its
registry entry.

## Adding or updating a source

1. Open and inspect the exact source material when access is available. For a
   book or paper, identify the relevant edition and page or section before
   claiming it supports a rule. Do not reproduce copyrighted passages.
2. Add a stable, descriptive, kebab-case `id` that will not change when the
   title or URL changes. Fill required fields and use `null` for metadata that
   is unknown or not applicable.
3. Select the source category and only the `used_by` feature identifiers that
   the inspected material actually informs. Add a feature identifier to
   `referenceFeatures` before referencing it.
4. Set `verification_status` to `verified` only when both the source and its
   described connection to LIFE are supported by inspected material and
   reproducible evidence. Use `partially_verified` for narrow comparisons,
   incomplete mappings, or unresolved limitations. Use `not_yet_verified`
   when the source cannot be inspected or its connection is still uncertain.
5. Set `accessed_at` only after opening the source during that review. Never
   infer a publication date, edition, version, access date, license, quotation,
   or page number. Record license and attribution terms when actually known;
   unresolved rights must remain explicit.
6. Link the registry entry near the relevant user-facing explanation using
   `ReferenceLinks` or an appropriate feature-specific Sources section. Keep
   numerical astronomy, traditional interpretation, LIFE implementation
   choices, and independent scientific evidence clearly distinct.
7. Add/update tests for the stable ID, URL, metadata, verification label and
   feature mapping. Review the rendered `/references` page and the linked
   feature after changes.

When a new reference is supplied, inspect the material if accessible and map
only the rule or calculation it actually supports. If it is unavailable,
record the exact supplied details, leave unknown metadata empty, and mark it
`not_yet_verified`; do not guess based on a title, abstract, search snippet or
another source's description.

## Current audit notes

- JPL Horizons fixtures check only their documented geocentric apparent
  tropical position quantities and epochs. They do not validate sidereal
  conversion, houses, ascendant, or traditional rules.
- PyJHora comparison fixtures cover synthetic divisional sign mappings only;
  they are not an independent natal-chart calculation or an authority for
  disputed traditions. The conflicting license metadata is recorded in the
  fixture and registry.
- IANA rules and the GeoNames extract inform timezone/location resolution, but
  users should verify coordinates and the selected place. Runtime timezone
  data need not be the latest IANA release.
- LIFE's own chart, Panchanga, Dasha and KP conventions are implementation
  choices. Independent reference validation is incomplete, and traditional
  interpretations are not scientifically validated predictions.
- The D11 Rudramsha source attribution, broad interpretation-rule bibliography,
  and exact remedy-tradition editions remain pending. Their missing or
  unverified status is listed on `/references`; software regression tests do
  not resolve these source questions.
- Swiss Ephemeris dual licensing and the selected AGPL path are documented in
  `docs/LICENSING.md`. Rights to redistribute individual bundled ephemeris
  files remain unresolved and are a release blocker.
- This registry is not a complete dependency-license inventory. Review direct
  and transitive dependency licenses and asset-specific terms before release.
