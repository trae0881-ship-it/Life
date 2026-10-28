# Offline birthplace gazetteer

The locally bundled files are compressed, two-character city-name prefix
shards generated from a reduced-field GeoNames `cities500` extract and
`admin1CodesASCII.txt`. The repository notes record the source extract as
downloaded on 2026-10-21. The indexed fields include coordinates, GeoNames
country and administrative-region labels, population ranking and the GeoNames
IANA timezone field. The data is used only for local search; normal chart
calculations do not make network requests.

The current index contains 237,018 rows across 620 shards and 236,275 distinct
IDs; 743 rows repeat an ID across shards. This does not match the 236,560-place
count previously stated for the source extract (a 285-ID difference). The
original source extract and transformation script are not checked in, so the
difference cannot be explained or reproduced from this repository. These are
separate counts, not a claim that the current index exactly preserves every
source record.

GeoNames data is licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
The official [GeoNames export README](https://download.geonames.org/export/dump/readme.txt)
states the license and provides the source-file descriptions. Attribution:
GeoNames (https://www.geonames.org/), dataset source
https://download.geonames.org/export/dump/. LIFE filters fields and restructures
the extract into compressed prefix shards; these changes are indicated here.
Users should verify the selected location against a birth record or other
reliable source. The `cities500` extract is not an exhaustive list of every
village, neighborhood or address; manual birthplace, coordinate and timezone
fields remain available.
