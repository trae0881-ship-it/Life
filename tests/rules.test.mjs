import test from "node:test";
import assert from "node:assert/strict";
import { calculateDivisionalLongitude, calculateNakshatraPada, calculatePanchanga, calculateVimshottariDasha, VIMSHOTTARI_YEAR_DAYS } from "../src/calculation/rules.ts";

test("Nakshatra and Pada use equal sidereal segments with start-inclusive boundaries", () => {
  const nakshatraSize = 360 / 27;
  const padaSize = nakshatraSize / 4;
  assert.deepEqual(calculateNakshatraPada(0), { name: "Ashwini", index: 0, pada: 1, longitude: 0 });
  assert.equal(calculateNakshatraPada(360).name, "Ashwini");
  assert.equal(calculateNakshatraPada(-1).longitude, 359);
  for (let index = 0; index < 27; index++) {
    for (let pada = 0; pada < 4; pada++) {
      const boundary = index * nakshatraSize + pada * padaSize;
      assert.equal(calculateNakshatraPada(boundary).index, index);
      assert.equal(calculateNakshatraPada(boundary).pada, pada + 1);
      assert.equal(calculateNakshatraPada(boundary + 1e-8).index, index);
      if (pada > 0) assert.equal(calculateNakshatraPada(boundary - 1e-8).pada, pada);
    }
  }
  assert.throws(() => calculateNakshatraPada(Number.NaN), /finite sidereal longitude/);
});

test("D9 divisional boundaries follow movable, fixed, and dual sign starts", () => {
  assert.deepEqual(calculateDivisionalLongitude(0, 9), { division: "D9", convention: "Parashari Navamsha: movable/fixed/dual signs start from themselves/ninth/fifth", segment: 1, sign: "Aries", signIndex: 0, longitude: 0, degreesInSign: 0 });
  assert.equal(calculateDivisionalLongitude(30 / 9, 9).sign, "Taurus");
  assert.equal(calculateDivisionalLongitude(30, 9).sign, "Capricorn");
  assert.equal(calculateDivisionalLongitude(60, 9).sign, "Libra");
  assert.equal(calculateDivisionalLongitude(360, 9).sign, "Aries");
});

test("D9 owns exact segment boundaries in the following navamsha", () => {
  const boundary = 30 / 9;
  const before = calculateDivisionalLongitude(boundary - 1e-8, 9);
  const at = calculateDivisionalLongitude(boundary, 9);
  const after = calculateDivisionalLongitude(boundary + 1e-8, 9);

  assert.equal(before.segment, 1);
  assert.equal(before.sign, "Aries");
  assert.equal(at.segment, 2);
  assert.equal(at.sign, "Taurus");
  assert.equal(after.segment, 2);
  assert.equal(after.sign, "Taurus");
});

test("divisional mapping does not promote a longitude just before a boundary", () => {
  const boundary = 30 / 9;
  const before = calculateDivisionalLongitude(boundary - 5e-11, 9);
  const at = calculateDivisionalLongitude(boundary, 9);

  assert.equal(before.segment, 1);
  assert.equal(before.sign, "Aries");
  assert.equal(at.segment, 2);
  assert.equal(at.sign, "Taurus");
});

test("D10 starts same for odd signs and ninth for even signs", () => {
  assert.equal(calculateDivisionalLongitude(0, 10).sign, "Aries");
  assert.equal(calculateDivisionalLongitude(3, 10).sign, "Taurus");
  assert.equal(calculateDivisionalLongitude(30, 10).sign, "Capricorn");
  assert.ok(calculateDivisionalLongitude(359.999999, 10).longitude < 360);
});

test("D45 starts movable, fixed, and dual signs from Aries, Leo, and Sagittarius", () => {
  assert.equal(calculateDivisionalLongitude(30, 45).sign, "Leo");
  assert.equal(calculateDivisionalLongitude(60, 45).sign, "Sagittarius");
  assert.equal(calculateDivisionalLongitude(90, 45).sign, "Aries");
});

test("all D2-D60 vargas have a named convention and every segment boundary is mapped", () => {
  const divisions = Array.from({ length: 59 }, (_, index) => index + 2);
  for (const division of divisions) {
    for (let signIndex = 0; signIndex < 12; signIndex++) {
      const boundaries = division === 30
        ? (signIndex % 2 === 0 ? [0, 5, 10, 18, 25, 30] : [0, 5, 12, 20, 25, 30])
        : Array.from({ length: division + 1 }, (_, index) => index * (30 / division));
      for (let part = 0; part < boundaries.length - 1; part++) {
        const boundary = signIndex * 30 + boundaries[part];
        const at = calculateDivisionalLongitude(boundary, division);
        assert.equal(at.segment, part + 1, `D${division}, sign ${signIndex}, segment ${part + 1} at ${boundary}°`);
        assert.match(at.convention, /.+/, `D${division} has an explicit convention`);
        assert.ok(at.signIndex >= 0 && at.signIndex < 12);
        assert.ok(at.degreesInSign >= 0 && at.degreesInSign < 30);
        assert.ok(at.longitude >= 0 && at.longitude < 360);
        if (part > 0) {
          const before = calculateDivisionalLongitude(boundary - 1e-8, division);
          assert.equal(before.segment, part, `D${division}, sign ${signIndex}, before boundary ${boundary}°`);
        }
      }
      const end = calculateDivisionalLongitude((signIndex + 1) * 30, division);
      assert.equal(end.segment, 1, `D${division} starts a new segment at sign ${signIndex + 1}`);
      assert.ok(end.degreesInSign >= 0 && end.degreesInSign < 30);
      assert.ok(end.longitude >= 0 && end.longitude < 360);
      if (division !== 30) {
        const partSize = 30 / division;
        for (let part = 1; part < division; part++) {
          const boundary = signIndex * 30 + part * partSize;
          const before = calculateDivisionalLongitude(boundary - 1e-8, division);
          const at = calculateDivisionalLongitude(boundary, division);
          assert.equal(before.segment, part, `D${division}, sign ${signIndex}, before boundary ${part}`);
          assert.equal(at.segment, part + 1, `D${division}, sign ${signIndex}, at boundary ${part}`);
        }
      }
    }
  }
});

test("selected Parashari varga conventions cover special mappings and reject unsupported identifiers", () => {
  assert.equal(calculateDivisionalLongitude(0, 2).sign, "Leo");
  assert.equal(calculateDivisionalLongitude(15, 2).sign, "Cancer");
  assert.equal(calculateDivisionalLongitude(30, 2).sign, "Cancer");
  assert.equal(calculateDivisionalLongitude(0, 5).sign, "Aries");
  assert.equal(calculateDivisionalLongitude(5, 30).sign, "Aquarius");
  assert.equal(calculateDivisionalLongitude(35, 30).sign, "Virgo");
  assert.equal(calculateDivisionalLongitude(30, 11).sign, "Pisces");
  assert.equal(calculateDivisionalLongitude(30, 24).sign, "Cancer");
  assert.equal(calculateDivisionalLongitude(30, 27).sign, "Cancer");
  assert.equal(calculateDivisionalLongitude(30, 40).sign, "Libra");
  assert.throws(() => calculateDivisionalLongitude(0, 1), /integer division from D2 through D60/);
  assert.throws(() => calculateDivisionalLongitude(0, 61), /integer division from D2 through D60/);
  assert.throws(() => calculateDivisionalLongitude(Number.NaN, 9), /finite longitude/);
});

test("Vimshottari includes contiguous Mahadasha, Antardasha, and Pratyantardasha intervals", () => {
  const birth = new Date("2000-01-01T00:00:00.000Z");
  const dasha = calculateVimshottariDasha(0, birth);
  const yearsByLord = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const yearMs = VIMSHOTTARI_YEAR_DAYS * 86_400_000;
  assert.equal(dasha.startingMahadasha, "Ketu");
  assert.equal(dasha.birthMoon.nakshatra, "Ashwini");
  assert.equal(dasha.birthMoon.pada, 1);
  assert.equal(dasha.birthMoon.longitude, 0);
  assert.equal(dasha.convention.yearDays, VIMSHOTTARI_YEAR_DAYS);
  assert.equal(dasha.convention.hierarchy, "Mahadasha → Antardasha → Pratyantardasha");
  assert.equal(dasha.remainingMahadashaBalanceYears, 7);
  assert.equal(dasha.mahadashas[0].runningAtBirth, true);
  assert.equal(dasha.mahadashas[0].balanceAtBirthYears, 7);
  assert.ok(dasha.mahadashas.length >= 9);
  for (const period of dasha.mahadashas) {
    assert.ok(Date.parse(period.start) < Date.parse(period.end));
    for (const [index, sub] of period.antardashas.entries()) {
      assert.ok(Date.parse(sub.start) < Date.parse(sub.end));
      if (index > 0) assert.equal(period.antardashas[index - 1].end, sub.start, "Antardashas have no gaps or overlaps");
      const antardashaYears = period.years * yearsByLord[sub.lord] / 120;
      assert.ok(Math.abs((Date.parse(sub.end) - Date.parse(sub.start)) - antardashaYears * yearMs) <= 1, "Antardasha uses the proportional 120-year duration");
      assert.equal(sub.pratyantardashas.length, 9);
      assert.equal(sub.pratyantardashas[0].lord, sub.lord, "Pratyantardasha sequence starts from its Antardasha lord");
      assert.equal(sub.pratyantardashas[0].start, sub.start, "Pratyantardashas begin at the parent interval");
      assert.equal(sub.pratyantardashas.at(-1).end, sub.end, "Pratyantardashas end at the parent interval");
      for (const [pratyIndex, praty] of sub.pratyantardashas.entries()) {
        assert.ok(Date.parse(praty.start) < Date.parse(praty.end));
        if (pratyIndex > 0) assert.equal(sub.pratyantardashas[pratyIndex - 1].end, praty.start, "Pratyantardashas have no gaps or overlaps");
        const pratyYears = antardashaYears * yearsByLord[praty.lord] / 120;
        assert.ok(Math.abs((Date.parse(praty.end) - Date.parse(praty.start)) - pratyYears * yearMs) <= 1, "Pratyantardasha uses the proportional 120-year duration");
      }
    }
    if (period.antardashas.length) {
      assert.equal(period.antardashas[0].start, period.start, "Child periods begin with the parent period");
      assert.equal(period.antardashas.at(-1).end, period.end, "Child periods end with the parent period");
    }
  }
  for (let index = 1; index < dasha.mahadashas.length; index++) assert.equal(dasha.mahadashas[index - 1].end, dasha.mahadashas[index].start, "Mahadashas are chronological and contiguous");
  assert.equal(Math.round((Date.parse(dasha.mahadashas[1].end) - Date.parse(dasha.mahadashas[1].start)) / (VIMSHOTTARI_YEAR_DAYS * 86_400_000)), 20);
  const exactNakshatraBoundary = calculateVimshottariDasha(360 / 27, birth);
  assert.equal(exactNakshatraBoundary.startingMahadasha, "Venus");
  assert.equal(exactNakshatraBoundary.remainingMahadashaBalanceYears, 20);
  assert.equal(exactNakshatraBoundary.mahadashas[0].antardashas[0].pratyantardashas[0].lord, "Venus");
  const partialBalance = calculateVimshottariDasha(2, birth);
  const birthMahadasha = partialBalance.mahadashas.find((period) => period.runningAtBirth);
  const birthAntardasha = birthMahadasha.antardashas.find((period) => period.runningAtBirth);
  assert.equal(birthAntardasha.pratyantardashas.length, 9, "a birth-spanning child retains its complete parent interval");
  assert.equal(birthAntardasha.pratyantardashas[0].start, birthAntardasha.start);
  assert.equal(birthAntardasha.pratyantardashas.at(-1).end, birthAntardasha.end);
});

test("Vimshottari birth balance and absolute boundaries follow the configured year convention", () => {
  const birth = new Date("2000-01-01T00:00:00.000Z");
  const dasha = calculateVimshottariDasha(2, birth);
  const yearMs = VIMSHOTTARI_YEAR_DAYS * 86_400_000;
  const fractionElapsed = 2 / (360 / 27);
  const elapsedMs = 7 * fractionElapsed * yearMs;
  const balanceMs = 7 * (1 - fractionElapsed) * yearMs;
  const birthPeriod = dasha.mahadashas.find((period) => period.runningAtBirth);

  assert.equal(dasha.startingMahadasha, "Ketu");
  assert.equal(dasha.birthMoon.fractionElapsed, fractionElapsed);
  assert.equal(dasha.remainingMahadashaBalanceYears, 7 * (1 - fractionElapsed));
  assert.equal(birthPeriod.balanceAtBirthYears, dasha.remainingMahadashaBalanceYears);
  assert.ok(Math.abs(Date.parse(birthPeriod.start) - (birth.getTime() - elapsedMs)) <= 1);
  assert.ok(Math.abs(Date.parse(birthPeriod.end) - (birth.getTime() + balanceMs)) <= 1);
  assert.equal(birthPeriod.end, birthPeriod.antardashas.at(-1).end);
});

test("Panchanga uses angular boundaries and marks the civil weekday convention", () => {
  const newMoon = calculatePanchanga(0, 0, "2000-01-01");
  assert.equal(newMoon.tithi.name, "Pratipada");
  assert.equal(newMoon.tithi.paksha, "Shukla");
  assert.equal(newMoon.karana, "Kimstughna");
  assert.equal(newMoon.yoga, "Vishkambha");
  assert.equal(newMoon.weekday, "Saturday");
  assert.equal(newMoon.nakshatra.name, "Ashwini");
  assert.equal(newMoon.nakshatra.pada, 1);
  const boundary = calculatePanchanga(0, 12, "2000-01-01");
  assert.equal(boundary.tithi.number, 2);
  assert.equal(boundary.karana, "Balava");
  assert.equal(boundary.nakshatra.name, "Ashwini");
  assert.equal(boundary.nakshatra.pada, 4);
  assert.match(boundary.convention, /not sunrise-adjusted/);
});

test("Panchanga names Purnima and Amavasya correctly and treats angular boundaries as start-inclusive", () => {
  const date = "2000-01-01";
  const tithiNames = ["Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima"];
  const karanaNames = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
  const fixedKaranas = ["Kimstughna", "Shakuni", "Chatushpada", "Naga"];

  for (let tithiIndex = 0; tithiIndex < 30; tithiIndex++) {
    const elongation = tithiIndex * 12;
    const tithi = calculatePanchanga(0, elongation, date).tithi;
    const number = tithiIndex % 15 + 1;
    assert.equal(tithi.number, number, `tithi index ${tithiIndex}`);
    assert.equal(tithi.name, number === 15 ? (tithiIndex < 15 ? "Purnima" : "Amavasya") : tithiNames[number - 1]);
    assert.equal(tithi.paksha, tithiIndex < 15 ? "Shukla" : number === 15 ? "Amavasya" : "Krishna");
    const before = calculatePanchanga(0, elongation - 1e-6, date).tithi;
    assert.notEqual(before.name + before.paksha, tithi.name + tithi.paksha, `tithi transitions at ${elongation}°`);
  }

  for (let halfTithi = 0; halfTithi < 60; halfTithi++) {
    const elongation = halfTithi * 6;
    const expected = halfTithi === 0
      ? fixedKaranas[0]
      : halfTithi >= 57
        ? fixedKaranas[halfTithi - 56]
        : karanaNames[(halfTithi - 1) % 7];
    assert.equal(calculatePanchanga(0, elongation, date).karana, expected, `karana boundary ${halfTithi}`);
    if (halfTithi > 0) {
      const previous = halfTithi - 1 >= 57
        ? fixedKaranas[halfTithi - 57]
        : halfTithi - 1 === 0
          ? fixedKaranas[0]
          : karanaNames[(halfTithi - 2) % 7];
      assert.equal(calculatePanchanga(0, elongation - 1e-6, date).karana, previous, `karana before boundary ${halfTithi}`);
    }
  }

  for (let yogaIndex = 0; yogaIndex < 27; yogaIndex++) {
    const sum = yogaIndex * (360 / 27);
    const result = calculatePanchanga(sum / 2, sum / 2, date);
    assert.equal(result.yogaIndex, yogaIndex, `yoga boundary ${yogaIndex}`);
    if (yogaIndex > 0) {
      const before = calculatePanchanga((sum - 1e-6) / 2, (sum - 1e-6) / 2, date);
      assert.equal(before.yogaIndex, yogaIndex - 1, `yoga before boundary ${yogaIndex}`);
    }
  }
});

test("Dasha and Panchanga reject invalid inputs instead of returning fabricated values", () => {
  assert.throws(() => calculateVimshottariDasha(Number.NaN, new Date("2000-01-01T00:00:00Z")), /finite Moon longitude/);
  assert.throws(() => calculateVimshottariDasha(0, new Date("invalid")), /valid birth instant/);
  assert.throws(() => calculatePanchanga(Number.NaN, 0, "2000-01-01"), /finite Sun and Moon longitudes/);
  assert.throws(() => calculatePanchanga(0, 0, "2026-02-30"), /valid local calendar date/);
  assert.throws(() => calculatePanchanga(0, 0, "2026/02/28"), /YYYY-MM-DD/);
});
