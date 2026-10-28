# Answer Rules and Limitations v1.0

## Reliable answer pipeline

1. Resolve the question ID from `assistantQuestionCatalog`; free-text topic
   inference is only a fallback and is not evidence of intent.
2. Require the selected calculated chart and usable provenance.
3. Use server-calculated chart facts, not client-supplied planetary positions,
   Dasha periods, ownership, or dates.
4. Select the narrowest implemented rule for the question.
5. Return calculated facts separately from traditional interpretation.
6. Validate every displayed date against the returned service result.
7. Use localized templates without concatenating question text into predictions.
8. State missing evidence, uncertainty, and unsupported timing explicitly.

## Supported surfaces

- Current Vimshottari Mahadasha, Antardasha, and Pratyantardasha are deterministic
  interval facts when the requested instant is inside the calculated horizon.
- D1, D9, D10, other calculated vargas, KP fields, Panchanga, transits,
  Yogas/Doshas, and chart placements can be reported as calculated facts when
  present and provenance-valid.
- Marriage timing is conditional only: the KP service requires 2/7/11
  significations, 7th-cusp sub-lord support, and qualifying Dasha intersections.
  Separate candidate windows remain separate and are never guarantees.
- The first Answer Engine v1.1 increment connects five questions to explicit
  existing chart rules: `marriage_factors` and `partner_indicators` use the
  relationship rule's houses 2, 7, and 8 plus Venus/Jupiter; `government_indicators`
  and `career_growth` use the career rule's houses 6, 10, and 11 plus
  Saturn/Sun/Mercury; and `foreign_travel_indicators` reports calculated houses
  3, 9, and 12 with available cusps and occupants. The answer evidence names
  the rule and exposes only facts present in the selected chart.
- These five improvements remain partially supported: the rules describe
  traditional chart factors, not government/private classification, partner
  profiles, travel dates, career outcomes, or guarantees.

## Unsupported event timing

No production rule currently supports dates for government employment, private
jobs, promotions, business starts, property purchases, financial improvement,
foreign travel/settlement, education outcomes, or relationship outcomes.
These questions may receive chart-context limitations, but must not receive
invented dates, percentages, countries, guarantees, or generic positive text
presented as a personal forecast.
Unsupported event questions must not receive invented dates.

## Provenance and ownership

`hasUsableChartProvenance` requires calculated status, a result hash, engine
version, UTC input, and IANA timezone. Saved-chart/profile API access must use
the authenticated owner predicate. A changed selected chart invalidates old
assistant history in the client.

## Remedies

The personalized-remedies engine remains provenance-gated. General catalog
practices are not personalized. No draft, pending, rejected, retired, or
unreviewed remedy rule may activate. The active approved registry is empty.

## Validation limits

Passing unit/regression tests verifies code behavior and claim suppression. It
does not independently validate astrology conventions or real-world outcomes.
Independent fixtures currently cover selected astronomical snapshots and
boundary behavior, not every question, interpretation, or remedy.

The relationship and career rule review is tracked in
[`INTERPRETATION_VALIDATION.md`](./INTERPRETATION_VALIDATION.md). Both rules
remain pending because no exact, directly verified source passage has been
recorded.
