# KP Astrology Calculation Audit

## Implementation

KP code is in `src/calculation/kp.ts`; chart integration is in `src/calculation/chart.ts`.

It implements:

- Krishnamurti ayanamsa;
- independent KP sidereal planetary positions;
- 12 Placidus cusps;
- sign, sign lord, star lord, sub lord and sub-sub lord;
- planet occupation and house ownership;
- star-lord and dispositor significators;
- house-wise `signifiedBy` lists.

Actual KP ayanamsa for the synthetic profile: `23.722186°`.

## Actual KP planetary output

| Planet | Longitude | Sign | Sign lord | Star | Sub | Sub-sub | House | Signified houses |
|---|---:|---|---|---|---|---|---:|---|
| Sun | 13.064498 | Aries | Mars | Ketu | Mercury | Saturn | 1 | 1,12 |
| Moon | 243.292874 | Sagittarius | Jupiter | Ketu | Sun | Jupiter | 8 | 5,8,12 |
| Mars | 143.019958 | Leo | Sun | Venus | Saturn | Sun | 5 | 1,2,5,7,8 |
| Mercury | 10.473748 | Aries | Mars | Ketu | Saturn | Sun | 12 | 3,4,6,12 |
| Jupiter | 295.294298 | Capricorn | Saturn | Mars | Rahu | Ketu | 10 | 1,5,8,9,10,12 |
| Venus | 19.381564 | Aries | Mars | Venus | Rahu | Ketu | 1 | 1,2,7 |
| Saturn | 349.863967 | Pisces | Jupiter | Mercury | Venus | Moon | 12 | 3,4,6,11,12 |
| Rahu | 154.335591 | Virgo | Mercury | Sun | Saturn | Moon | 6 | 1,3,4,6,12 |
| Ketu | 334.335591 | Pisces | Jupiter | Saturn | Saturn | Venus | 12 | 9,10,11,12 |

## Actual KP cusps

| House | Longitude | Sign | Sign lord | Star | Sub | Sub-sub |
|---:|---:|---|---|---|---|---|
| 1 | 12.044864 | Aries | Mars | Ketu | Mercury | Venus |
| 2 | 42.387250 | Taurus | Venus | Moon | Rahu | Jupiter |
| 3 | 66.553939 | Gemini | Mercury | Mars | Moon | Venus |
| 4 | 89.792838 | Gemini | Mercury | Jupiter | Moon | Jupiter |
| 5 | 116.254907 | Cancer | Moon | Mercury | Jupiter | Jupiter |
| 6 | 150.205927 | Virgo | Mercury | Sun | Rahu | Mercury |
| 7 | 192.044864 | Libra | Venus | Rahu | Saturn | Rahu |
| 8 | 222.387250 | Scorpio | Mars | Saturn | Mars | Saturn |
| 9 | 246.553939 | Sagittarius | Jupiter | Ketu | Rahu | Mercury |
| 10 | 269.792838 | Sagittarius | Jupiter | Sun | Rahu | Saturn |
| 11 | 296.254907 | Capricorn | Saturn | Mars | Jupiter | Jupiter |
| 12 | 330.205927 | Pisces | Jupiter | Jupiter | Moon | Mercury |

## Bhukti and Antara

The chart data includes Vimshottari Mahadasha/Antardasha/Pratyantardasha arrays. A dedicated KP Bhukti/Antara date service exists separately through Vimshottari hierarchy and marriage timing. No independent KP Dasha result fixture was run or found.

## Marriage timing

`src/presentation/marriage-timing.ts` returns conditional periods only when houses 2/7/11, the 7th-cusp sub-lord, and Dasha hierarchy satisfy project rules. It explicitly excludes a guarantee and does not use a reviewed transit filter.
