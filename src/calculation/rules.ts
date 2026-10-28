import { InputError } from "./time.ts";

const zodiacSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const nakshatraLords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const dashaYears = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const yogaNames = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const karanaNames = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
const fixedKaranas = ["Kimstughna", "Shakuni", "Chatushpada", "Naga"];
const DAY_MS = 86_400_000;
export const VIMSHOTTARI_YEAR_DAYS = 365.2425;

function wrap(value: number) { return ((value % 360) + 360) % 360; }

export function calculateNakshatraPada(siderealLongitude: number) {
  if (!Number.isFinite(siderealLongitude)) {
    throw new InputError("Nakshatra calculation requires a finite sidereal longitude.", "INVALID_NAKSHATRA_LONGITUDE");
  }
  const longitude = wrap(siderealLongitude);
  const nakshatraSize = 360 / 27;
  const padaSize = nakshatraSize / 4;
  const index = Math.min(26, Math.floor((longitude + 1e-10) / nakshatraSize));
  const withinNakshatra = longitude - index * nakshatraSize;
  return {
    name: nakshatras[index],
    index,
    pada: Math.min(4, Math.floor((withinNakshatra + 1e-10) / padaSize) + 1),
    longitude,
  };
}

const modalityStartSign = [0, 8, 4];
const divisionLabel = (division: number) => `D${division}`;

export function calculateDivisionalLongitude(longitude: number, division: number) {
  if (!Number.isFinite(longitude) || !Number.isInteger(division) || division < 2 || division > 60) {
    throw new InputError("Divisional chart requires a finite longitude and an integer division from D2 through D60.", "UNSUPPORTED_DIVISIONAL_CHART");
  }
  const longitudeRemainder = longitude % 360;
  const normalized = longitudeRemainder < 0 ? longitudeRemainder + 360 : longitudeRemainder;
  const signIndex = Math.floor(normalized / 30);
  const withinSign = normalized - signIndex * 30;
  let boundaries: number[] | undefined;
  if (division === 30) boundaries = signIndex % 2 === 0 ? [0, 5, 10, 18, 25, 30] : [0, 5, 12, 20, 25, 30];
  let part: number;
  let fraction: number;
  if (boundaries) {
    part = boundaries.findIndex((edge, index) => index < boundaries!.length - 1 && withinSign >= edge && withinSign < boundaries![index + 1]);
    if (part < 0) part = boundaries.length - 2;
    fraction = (withinSign - boundaries[part]) / (boundaries[part + 1] - boundaries[part]);
  } else {
    const partSize = 30 / division;
    const signStart = signIndex * 30;
    part = 0;
    while (part < division - 1 && normalized >= signStart + (part + 1) * partSize) part++;
    fraction = Math.max(0, Math.min(1, (normalized - (signStart + part * partSize)) / partSize));
  }
  const oddSign = signIndex % 2 === 0;
  const modality = signIndex % 3;
  let vargaSignIndex: number;
  let convention: string;
  if (division === 2) {
    // Parashari Hora: the two halves map to Sun's Leo and Moon's Cancer horas.
    vargaSignIndex = oddSign ? (part === 0 ? 4 : 3) : (part === 0 ? 3 : 4);
    convention = "Parashari Hora: odd signs Leo→Cancer; even signs Cancer→Leo";
  } else if (division === 3) {
    vargaSignIndex = (signIndex + part * 4) % 12;
    convention = "Parashari Drekkana: occupied sign, fifth, ninth";
  } else if (division === 4) {
    vargaSignIndex = (signIndex + part * 3) % 12;
    convention = "Parashari Chaturthamsha: occupied sign, fourth, seventh, tenth";
  } else if (division === 5) {
    const oddStarts = [0, 10, 8, 2, 6];
    const evenStarts = [1, 5, 11, 9, 7];
    vargaSignIndex = (oddSign ? oddStarts : evenStarts)[part];
    convention = "Parashari Panchamsha: odd-sign Aries/Aquarius/Sagittarius/Gemini/Libra; even-sign Taurus/Virgo/Pisces/Capricorn/Scorpio";
  } else if (division === 6) {
    vargaSignIndex = (part + (oddSign ? 0 : 6)) % 12;
    convention = "Parashari Shashthamsha: odd signs count from Aries; even signs from Libra";
  } else if (division === 7) {
    vargaSignIndex = (signIndex + part + (oddSign ? 0 : 6)) % 12;
    convention = "Parashari Saptamsha: odd signs from themselves; even signs from the seventh";
  } else if (division === 8) {
    const starts = [0, 8, 4];
    vargaSignIndex = (starts[modality] + part) % 12;
    convention = "Parashari Ashtamsha: movable Aries, fixed Sagittarius, dual Leo starts";
  } else if (division === 9) {
    vargaSignIndex = (signIndex + modalityStartSign[modality] + part) % 12;
    convention = "Parashari Navamsha: movable/fixed/dual signs start from themselves/ninth/fifth";
  } else if (division === 10) {
    vargaSignIndex = (signIndex + (oddSign ? 0 : 8) + part) % 12;
    convention = "Parashari Dashamsha: odd signs start from themselves; even signs from the ninth";
  } else if (division === 11) {
    vargaSignIndex = ((12 - signIndex + part) % 12 + 12) % 12;
    convention = "Rudramsha: LIFE-selected reverse sign seed with forward parts; external attribution unverified";
  } else if (division === 12) {
    vargaSignIndex = (signIndex + part) % 12;
    convention = "Parashari Dwadashamsha: count sequentially from occupied sign";
  } else if (division === 16) {
    const starts = [0, 4, 8];
    vargaSignIndex = (starts[modality] + part) % 12;
    convention = "Parashari Shodashamsha: movable Aries, fixed Leo, dual Sagittarius starts";
  } else if (division === 20) {
    const starts = [0, 8, 4];
    vargaSignIndex = (starts[modality] + part) % 12;
    convention = "Parashari Vimshamsha: movable Aries, fixed Sagittarius, dual Leo starts";
  } else if (division === 24) {
    vargaSignIndex = ((oddSign ? 4 : 3) + part) % 12;
    convention = "Parashari Chaturvimshamsha: odd signs start Leo; even signs start Cancer";
  } else if (division === 27) {
    const elementStart = [0, 3, 6, 9][signIndex % 4];
    vargaSignIndex = (elementStart + part) % 12;
    convention = "Parashari Saptavimshamsha: fire/earth/air/water signs start Aries/Cancer/Libra/Capricorn";
  } else if (division === 30) {
    const oddParts = [0, 10, 8, 2, 6];
    const evenParts = [1, 5, 11, 9, 7];
    vargaSignIndex = (oddSign ? oddParts : evenParts)[part];
    convention = "Parashari Trimshamsha: unequal sign-specific segments and traditional sign assignments";
  } else if (division === 40) {
    vargaSignIndex = ((oddSign ? 0 : 6) + part) % 12;
    convention = "Parashari Khavedamsha: odd signs start Aries; even signs start Libra";
  } else if (division === 45) {
    vargaSignIndex = ([0, 4, 8][modality] + part) % 12;
    convention = "Parashari Akshavedamsha: movable/fixed/dual signs start Aries/Leo/Sagittarius";
  } else if (division === 60) {
    vargaSignIndex = (signIndex + part) % 12;
    convention = "Parashari Shashtiamsha: count forward from occupied sign";
  } else {
    vargaSignIndex = (signIndex * division + part) % 12;
    convention = "Parivritti Cyclic custom varga: parts progress through zodiac signs from Aries";
  }
  const vargaLongitude = vargaSignIndex * 30 + fraction * 30;
  return {
    division: divisionLabel(division),
    convention,
    segment: part + 1,
    sign: zodiacSigns[vargaSignIndex],
    signIndex: vargaSignIndex,
    longitude: vargaLongitude,
    degreesInSign: fraction * 30,
  };
}

export function calculateVimshottariDasha(moonSiderealLongitude: number, birthInstant: Date) {
  if (!Number.isFinite(moonSiderealLongitude) || !(birthInstant instanceof Date) || !Number.isFinite(birthInstant.getTime())) {
    throw new InputError("Vimshottari requires a finite Moon longitude and valid birth instant.", "INVALID_DASHA_INPUT");
  }
  const longitude = wrap(moonSiderealLongitude);
  const segment = 360 / 27;
  const nakshatraIndex = Math.min(26, Math.floor((longitude + 1e-10) / segment));
  const fractionElapsed = Math.max(0, Math.min(1, (longitude - nakshatraIndex * segment) / segment));
  const lordIndex = nakshatraIndex % 9;
  const startingLord = nakshatraLords[lordIndex];
  const elapsedYears = fractionElapsed * dashaYears[lordIndex];
  const currentStart = birthInstant.getTime() - elapsedYears * VIMSHOTTARI_YEAR_DAYS * DAY_MS;
  const horizon = birthInstant.getTime() + 120 * VIMSHOTTARI_YEAR_DAYS * DAY_MS;
  const mahadashas = [];
  let cursor = currentStart;
  let sequenceIndex = lordIndex;
  while (cursor < horizon) {
    const lord = nakshatraLords[sequenceIndex % 9];
    const years = dashaYears[sequenceIndex % 9];
    const end = cursor + years * VIMSHOTTARI_YEAR_DAYS * DAY_MS;
    const antardashas = [];
    let subCursor = cursor;
    for (let offset = 0; offset < 9; offset++) {
      const subLordIndex = (sequenceIndex + offset) % 9;
      const subLord = nakshatraLords[subLordIndex];
      const subStart = subCursor;
      const subEnd = subStart + (years * dashaYears[subLordIndex] / 120) * VIMSHOTTARI_YEAR_DAYS * DAY_MS;
      subCursor = subEnd;
      if (subEnd > birthInstant.getTime() && subStart < horizon) {
        const pratyantardashas = [];
        let pratyCursor = subStart;
        for (let pratyOffset = 0; pratyOffset < 9; pratyOffset++) {
          const pratyLordIndex = (subLordIndex + pratyOffset) % 9;
          const pratyLord = nakshatraLords[pratyLordIndex];
          const pratyStart = pratyCursor;
          // Each level uses the same proportional 120-year Vimshottari cycle.
          // Pin the final boundary to the parent end to avoid floating-point drift.
          const pratyEnd = pratyOffset === 8
            ? subEnd
            : pratyStart + ((years * dashaYears[subLordIndex] / 120) * dashaYears[pratyLordIndex] / 120) * VIMSHOTTARI_YEAR_DAYS * DAY_MS;
          pratyCursor = pratyEnd;
          pratyantardashas.push({ lord: pratyLord, start: new Date(pratyStart).toISOString(), end: new Date(pratyEnd).toISOString(), runningAtBirth: pratyStart <= birthInstant.getTime() && pratyEnd > birthInstant.getTime() });
        }
        antardashas.push({ lord: subLord, start: new Date(subStart).toISOString(), end: new Date(subEnd).toISOString(), runningAtBirth: subStart <= birthInstant.getTime() && subEnd > birthInstant.getTime(), pratyantardashas });
      }
    }
    mahadashas.push({
      lord,
      years,
      start: new Date(cursor).toISOString(),
      end: new Date(end).toISOString(),
      balanceAtBirthYears: cursor <= birthInstant.getTime() && end > birthInstant.getTime() ? (end - birthInstant.getTime()) / (VIMSHOTTARI_YEAR_DAYS * DAY_MS) : null,
      runningAtBirth: cursor <= birthInstant.getTime() && end > birthInstant.getTime(),
      antardashas,
    });
    cursor = end;
    sequenceIndex++;
  }
  return {
    system: "Vimshottari",
    convention: { yearDays: VIMSHOTTARI_YEAR_DAYS, nakshatraBasis: "27 equal sidereal segments", balance: "proportional to elapsed Moon position in birth nakshatra", hierarchy: "Mahadasha → Antardasha → Pratyantardasha", subperiodDuration: "parent period years × child lord years ÷ 120", intervals: "start-inclusive, end-exclusive" },
    birthMoon: { longitude, nakshatra: nakshatras[nakshatraIndex], nakshatraIndex, pada: Math.floor((longitude - nakshatraIndex * segment) / (segment / 4)) + 1, fractionElapsed },
    startingMahadasha: startingLord,
    remainingMahadashaBalanceYears: dashaYears[lordIndex] * (1 - fractionElapsed),
    mahadashas,
  };
}

export function calculatePanchanga(sunSiderealLongitude: number, moonSiderealLongitude: number, localDate: string) {
  if (![sunSiderealLongitude, moonSiderealLongitude].every(Number.isFinite)) {
    throw new InputError("Panchanga requires finite Sun and Moon longitudes.", "INVALID_PANCHANGA_LONGITUDE");
  }
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const date = dateMatch ? new Date(`${localDate}T00:00:00.000Z`) : new Date(Number.NaN);
  if (!dateMatch || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== localDate) {
    throw new InputError("Panchanga requires a valid local calendar date in YYYY-MM-DD format.", "INVALID_PANCHANGA_DATE");
  }
  const elongation = wrap(moonSiderealLongitude - sunSiderealLongitude);
  const nakshatra = calculateNakshatraPada(moonSiderealLongitude);
  const tithiIndex = Math.floor(elongation / 12);
  const halfTithiIndex = Math.floor(elongation / 6);
  const yogaIndex = Math.min(26, Math.floor((wrap(sunSiderealLongitude + moonSiderealLongitude) + 1e-10) / (360 / 27)));
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getUTCDay()];
  const karana = halfTithiIndex === 0
    ? fixedKaranas[0]
    : halfTithiIndex >= 57
      ? fixedKaranas[halfTithiIndex - 56]
      : karanaNames[(halfTithiIndex - 1) % 7];
  const tithiNumber = (tithiIndex % 15) + 1;
  const paksha = tithiIndex < 15 ? "Shukla" : tithiNumber === 15 ? "Amavasya" : "Krishna";
  return {
    weekday,
    nakshatra,
    tithi: { name: tithiNumber === 15 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : ["Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"][tithiNumber - 1], number: tithiNumber, paksha, elongationDegrees: elongation },
    karana,
    yoga: yogaNames[yogaIndex],
    yogaIndex,
    convention: "Tithi/karana from geocentric Moon-Sun elongation; yoga from sidereal Sun+Moon; Nakshatra and Pada use 27 equal sidereal divisions and four equal padas per division; the weekday here is the local civil weekday and is not sunrise-adjusted. The sunrise-adjusted vara, sunrise/sunset and other rise/set events are reported separately in the chart's riseSet and vara fields.",
  };
}
