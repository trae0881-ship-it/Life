# LIFE product strategy

## Product thesis

LIFE should feel like a **Jyotish workbench with a calculation receipt**, not another prediction feed. The product helps a curious learner and a working astrologer answer three questions: *What exactly was calculated? Which tradition and settings produced it? Which conclusions are sensitive to uncertain birth time or a different rule choice?*

### Positioning

**LIFE — see the chart, see the method.** A local-first Vedic astrology workspace that makes its calculations inspectable and repeatable, while clearly separating astronomical outputs from tradition-specific interpretations.

This is a product direction, not a verified claim that no competitor offers any of these capabilities. Publicly available material already shows broad chart/KP/Panchanga feature suites, and several current products market privacy or browser-local chart handling. The differentiated bet is the *integrated workflow* of provenance, sensitivity, and rule comparison, not a single feature claim.

## Differentiation hypothesis

### 1. Calculation receipt on every result

Each saved chart has an immutable, human-readable receipt: original local birth input, zone and resolved offset, UTC instant, coordinate source, time scales, engine/data versions, ayanamsa, house/node settings, rule-set version, warnings, and result hash. A user can reproduce a chart or compare a new engine/data version without silently overwriting the old calculation.

### 2. Birth-time sensitivity, not false certainty

Implemented in the first slice for ±2, ±5, or ±15 minutes at one-minute steps. It shows changes in D1 Lagna, sign/nakshatra/pada, and Whole Sign house classifications. It does not yet sweep divisional placements, KP sub-lords, or Dasha balance. It labels the sampling resolution and never claims a “corrected” birth time.

### 3. Tradition comparison with explainable deltas

Provide a comparison canvas for explicitly selected systems (for example Lahiri vs Raman, Whole Sign vs an implemented house system, or named rule-set revisions). Highlight only the fields that differ and trace each result to its rule. Never merge incompatible conventions into one result or imply one tradition is universally authoritative.

### 4. Interpretation trace

Every yoga/dosha/KP rule-based finding should expand into its exact matched conditions, source/convention, and boundary tests. Keep observed ephemeris values, computed classifications, and interpretive language in separate visual layers. Use local versioned text only; do not invent certainty or make guaranteed predictions.

### 5. Private by default and useful offline

Offer a no-account local workspace where feasible, with explicit opt-in for synchronized storage. Build a real offline acceptance mode after implementation. Do not send birth inputs to third parties. An offline badge must reflect an actual runtime network test, not the absence of API keys.

## Product principles

- **Show your work:** every derived result links to its input values, formula/rule, and version.
- **Uncertainty is a feature:** unknown time, rounded time, ambiguous DST, unsupported ranges, and high-latitude issues remain visible.
- **One selected method per calculation:** users may compare methods, but the system never silently switches them.
- **Learning and expert depth share one source:** plain-language summaries expand to the full calculation trace.
- **No prediction theater:** no fabricated dates, fake confidence scores, or scientific framing for traditional interpretations.
- **Portable data:** export/import a documented, versioned chart bundle; redact birth details when sharing a report.

## Initial audience and first workflow

Start with Jyotish learners and practitioners who need to verify a chart and explain how it was derived. First workflow: enter birth details and a confirmed IANA zone/coordinates → see input/time resolution → calculate a D1 only with the verified local engine → inspect positions and receipt → compare one supported setting → export a redacted calculation report. Avoid implementing all requested modules before this loop is correct.

## Roadmap gates

1. **Trust foundation:** license and data rights; pinned Linux engine; manifest; timezone policy; one independently sourced golden fixture; no-network smoke test.
2. **Chart workbench:** audited D1 positions, houses, receipt persistence, and an explicit unsupported/error state.
3. **Sensitivity:** time interval sweep with visible transition boundaries and reproducible settings.
4. **Vedic depth:** vargas, Vimshottari, rule-traced yogas; each gated by documented convention and boundary fixtures.
5. **KP/Panchanga/transits:** isolated implementations and event-boundary validation.
6. **Accounts and collaboration:** only after local-first chart workflow works; server-side ownership, admin controls, export/delete, and audit.

## Market scan (directional, 2026-10-16)

- The Vedic Astrology App publicly lists 16 divisional charts, Shadbala, Ashtakavarga, Vimshottari and KP, so breadth alone is not a credible differentiator ([feature list](https://thevedicastrologyapp.com/astrology)).
- Yogatara advertises extensive Vedic/KP/Jaimini features, research tools, and AI, reinforcing that advanced feature count is already a competitive axis ([product site](https://yogatara.app/)).
- Open Kundali describes server-side calculation and browser-local saved charts, showing privacy-conscious handling is already in-market ([privacy policy](https://openkundali.com/privacy)).
- AstroLina describes browser-local use and downloadable reports ([privacy policy](https://astrolina.org/privacy)).

This is a small scan of public marketing/privacy pages, not exhaustive competitive research, feature verification, or proof of uniqueness. Before using “first”, “only”, or “not in the market” claims, conduct a dated competitor matrix, hands-on trials, customer interviews, and trademark review.

## Success measures

- Reproduction: same input/config/engine/data version yields identical calculation hash.
- Traceability: every displayed derived classification has an inspectable rule trace.
- Sensitivity: users can identify which outputs change inside their chosen time interval.
- Trust: unsupported inputs fail clearly; no silent fallback or unexplained discrepancy.
- Privacy: no birth information in routine logs, third-party requests, or public links.
- Adoption: first-chart completion and repeat use by practitioners; measure only after privacy-conscious analytics are deliberately designed.

## Current implementation state

The first chart workbench and D1 sensitivity sweep are implemented in LIFE 0.1.0. The product thesis is not proof of market uniqueness; the competitor scan is limited. Engine smoke calculations are repeatable, but no independent astronomical reference validation has been run. Ephemeris file redistribution review and Linux/Railway execution remain release blockers.
