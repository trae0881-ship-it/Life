# Palmistry and Tarot Audit

## Palmistry

### Implemented

- Image upload validation and account storage routes for left/right hands and legacy one-record storage.
- Manual hand-shape, finger, thumb, line-quality, mount, and feature observations.
- 27-section manual palm report in `src/palmistry/engine.ts`.
- User self-selected observation confidence.
- Left/right hand comparison and difference reporting.
- Local palm reading history with maximum 50 records.
- Reference and knowledge search.
- Deterministic palm question lookup.

### Not implemented

- AI image recognition.
- Automatic life/head/heart/fate line detection.
- Mount or finger detection from pixels.
- OCR or medical interpretation.
- External AI/API call for image analysis.

The image is a stored artifact. The report is derived from fields manually entered by the user. The uploaded original is not converted into observations.

### 15-section report

The source actually defines 27 report sections, not 15:

overall, hand-shape, personality, thinking, emotional, heart, head, life, fate, sun, mercury, mounts, fingers, thumb, relationships, marriage, career, business, financial, leadership, creativity, travel, strengths, challenges, comparison, combined, summary.

## Tarot

`src/calculation/tarot.ts` implements:

- Single-card spread;
- Three-card spread;
- Past-present-future spread;
- General, relationship, and career topics;
- Upright/reversed card meanings;
- Random card drawing with `crypto.getRandomValues`;
- Saved reading history through `/api/astrology-readings`.

This is deterministic interpretation text over randomly selected cards. It is not astronomical calculation or prediction.
