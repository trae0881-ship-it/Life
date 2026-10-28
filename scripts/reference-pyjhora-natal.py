"""Emit fixed PyJHora natal-chart outputs for local validation."""

import datetime as dt
import contextlib
import argparse
import importlib.metadata
import io
import json
from pathlib import Path

import swisseph as swe

with contextlib.redirect_stdout(io.StringIO()):
    from jhora import const, utils
    from jhora.horoscope.chart import charts
    from jhora.panchanga import drik


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "data" / "reference" / "natal-chart-jpl-cases.json"
EXPECTED_PYJHORA_VERSION = "4.8.7"
EXPECTED_SWISSEPH_VERSION = "2.10.03"
EXPECTED_NUMPY_VERSION = "2.1.1"
WHEEL_SHA256 = "d8d8014573a38ddefedcae57d3b8d84687cac2ad31bb5b1dd70d945906a4d54d"
PLANET_NAMES = {
    0: "Sun",
    1: "Moon",
    2: "Mars",
    3: "Mercury",
    4: "Jupiter",
    5: "Venus",
    6: "Saturn",
    7: "Rahu",
    8: "Ketu",
    9: "Uranus",
    10: "Neptune",
    11: "Pluto",
}


def require_version(package: str, expected: str) -> None:
    actual = importlib.metadata.version(package)
    if actual != expected:
        raise RuntimeError(f"Expected {package} {expected}, found {actual}")


def offset_hours(value: str) -> float:
    sign = -1 if value.startswith("-") else 1
    hours, minutes = (int(part) for part in value[1:].split(":"))
    return sign * (hours + minutes / 60)


def chart_positions(positions: list) -> dict[str, dict]:
    result = {}
    for planet_id, (sign_index, degrees_in_sign) in positions:
        name = "Lagna" if planet_id == "L" else PLANET_NAMES[planet_id]
        result[name] = {
            "signIndex": sign_index,
            "longitudeDegrees": sign_index * 30 + degrees_in_sign,
        }
    return result


def main() -> None:
    require_version("PyJHora", EXPECTED_PYJHORA_VERSION)
    require_version("numpy", EXPECTED_NUMPY_VERSION)
    if swe.version != EXPECTED_SWISSEPH_VERSION:
        raise RuntimeError(f"Expected Swiss Ephemeris {EXPECTED_SWISSEPH_VERSION}, found {swe.version}")

    ephemeris_path = ROOT / "data" / "ephemeris"
    swe.set_ephe_path(str(ephemeris_path))
    drik.set_ayanamsa_mode("LAHIRI")
    const.PLANET_POSITIONS_TRUE = False
    const.PLANET_POSITIONS_USE_ABERRATION = True
    const.PLANET_POSITIONS_USE_DEFLECTION = True
    const.PLANET_POSITIONS_USE_NUTATION = True
    drik.refresh_planet_flags()
    drik.set_planet_list(set_rahu_ketu_as_true_nodes=True, include_western_planets=True)

    source = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    cases = []
    for fixture_case in source["cases"]:
        birth = fixture_case["input"]
        local = dt.datetime.fromisoformat(f'{birth["localDate"]}T{birth["localTime"]}:00')
        zone_offset = offset_hours(fixture_case["expectedOffset"])
        place = drik.Place(
            fixture_case["id"],
            birth["latitude"],
            birth["longitude"],
            zone_offset,
            elevation=0,
        )
        jd_local = utils.julian_day_number(
            (local.year, local.month, local.day),
            (local.hour, local.minute, local.second),
        )
        const._TROPICAL_MODE = False
        sidereal_ascendant = drik.ascendant(jd_local, place)
        sidereal_houses = drik.bhaava_madhya_swe(jd_local, place, house_code="P")
        houses = {
            "ascendantLongitude": sidereal_ascendant[0] * 30 + sidereal_ascendant[1],
            "cusps": sidereal_houses,
        }

        drik.set_planet_list(set_rahu_ketu_as_true_nodes=True, include_western_planets=True)
        divisional_charts = {}
        for division in range(1, 61):
            method = 2 if division == 2 else 1
            positions = charts.divisional_chart(
                jd_local,
                place,
                divisional_chart_factor=division,
                chart_method=method,
            )
            divisional_charts[f"D{division}"] = chart_positions(positions)

        cases.append({
            "id": fixture_case["id"],
            "input": {
                "localDate": birth["localDate"],
                "localTime": birth["localTime"],
                "timeZone": birth["timeZone"],
                "resolvedOffset": fixture_case["expectedOffset"],
                "utc": fixture_case["expectedUtc"],
                "latitude": birth["latitude"],
                "longitude": birth["longitude"],
                "coordinateSource": birth["coordinateSource"],
                "ayanamsa": birth["ayanamsa"],
                "zodiac": "sidereal",
                "houseSystem": birth["houseSystem"],
                "nodeMode": birth["nodeMode"],
                "ephemerisPath": "LIFE checked-in Swiss Ephemeris assets",
                "ephemerisFlags": "SWIEPH|SIDEREAL|SPEED; apparent geocentric positions",
                "houseConvention": "Swiss Placidus sidereal cusps and Ascendant under PyJHora Lahiri mode",
            },
            "reference": {
                "planetEngine": f"PyJHora {EXPECTED_PYJHORA_VERSION} / PySwisseph {EXPECTED_SWISSEPH_VERSION}",
                "referencePackageWheelSha256": WHEEL_SHA256,
                "sharedCoreCaveat": "PyJHora uses Swiss Ephemeris 2.10.03; LIFE uses @swisseph/node 1.4.0 and the same local data, but its embedded Swiss version is not exposed. Shared implementation family means this is a pipeline/convention cross-check, not independent ephemeris validation.",
                "divisionMethods": "PyJHora named chart functions; D2 chart_method=2, other named charts chart_method=1, unnamed divisions use PyJHora custom cyclic mapping.",
                "numericComparisonToleranceDegrees": 4 * 2.220446049250313e-16 * 360,
                "numericToleranceRationale": "Four double-precision ULPs at the 0-360 degree scale accommodate only serialization and operation-order rounding; shared-core output is not independent ephemeris evidence.",
            },
            "houses": houses,
            "charts": divisional_charts,
        })

    output = {
        "fixtureVersion": 1,
        "sourceCases": "data/reference/natal-chart-jpl-cases.json",
        "reference": {
            "name": "PyJHora",
            "version": EXPECTED_PYJHORA_VERSION,
            "commit": "ca22995709bd60e371e7820a1a5efc80ce4cf821",
            "license": "AGPL-3.0 in wheel metadata and bundled license; upstream pyproject MIT classifier conflicts",
            "runtime": "Python 3.11.9; isolated from LIFE runtime",
            "dependencies": {
                "numpy": EXPECTED_NUMPY_VERSION,
                "pyswisseph": "2.10.3.2",
                "geocoder": "1.38.1",
                "pytz": "2026.5",
                "timezonefinder": "6.0.1",
                "geopy": "2.5.0",
                "python-dateutil": "2.9.0.post0",
                "requests": "2.34.2",
            },
            "swissEphemerisVersion": EXPECTED_SWISSEPH_VERSION,
            "wheelSha256": WHEEL_SHA256,
            "numericComparisonToleranceDegrees": 4 * 2.220446049250313e-16 * 360,
            "numericToleranceRationale": "Four double-precision ULPs at the 0-360 degree scale accommodate only serialization and operation-order rounding; shared-core output is not independent ephemeris evidence.",
        },
        "cases": cases,
    }
    rendered = json.dumps(output, indent=2, sort_keys=True) + "\n"
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
