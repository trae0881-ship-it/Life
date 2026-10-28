# Licensing review

## Selected path and remaining release blocker

The user selected the AGPL path. The project and `@swisseph/node@1.4.0` are marked AGPL-3.0-compatible. The full AGPL text is in the repository. Public service/source compliance still needs a release checklist and review.

Swiss Ephemeris is offered under a dual licensing model: AGPL or a Swiss Ephemeris Professional License. The official programmer documentation states the choice must be made before distribution or activation of a public service. The `pyswisseph` project identifies itself as AGPL-3.0 and describes the underlying Swiss Ephemeris dual-license terms. Review the original documents and obtain legal review as appropriate:

- [Swiss Ephemeris programmer documentation](https://www.astro.com/swisseph-download/doc/swisseph.pdf)
- [pyswisseph repository and license notes](https://github.com/astrorigin/pyswisseph)
- [Swiss Ephemeris source repository](https://github.com/aloistr/swisseph)

The runtime binding license is not the only consideration. Two package-sourced ephemeris data files, `sepl_18.se1` and `semo_18.se1`, are checked into `data/ephemeris/`; their SHA-256 values and the npm tarball integrity are recorded in `data/ephemeris-manifest.json` and the hashes match the checked-in files. The package and upstream Swiss Ephemeris documentation describe the engine license model, but file-specific redistribution rights for these two data files have not been confirmed. This remains a public-release blocker.

The offline birthplace search also redistributes a modified GeoNames extract in `data/locations/city-index/`. GeoNames' official export README identifies CC BY 4.0 and the license requires attribution, a license link, and indication of changes. LIFE's attribution and transformation description are recorded in `data/locations/README.md`; the generated index's row count differs from the recorded source-extract count, and its provenance gap is described in the Phase 20 audit. The extract is provided as-is by GeoNames, with no accuracy, timeliness, or completeness warranty. This engineering review is not legal advice.

## Release gate

Record the selected engine distribution and license path, applicable source disclosure/offer obligations, confirmed terms for each bundled data file, dependency license inventory, and review before public deployment. The user chose AGPL; do not switch to a proprietary license path without new license review. This document is an engineering status record, not legal advice.
