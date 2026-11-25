# Palmistry

## Current behavior

Palmistry is a private, manual-first feature in the authenticated dashboard. A user can upload one JPG/JPEG/PNG hand image (up to 10 MiB), replace it, preview/download the original, record their own visibility observations for five named lines, ask the shared 38-question catalog, and delete the stored image and observations.

Uploads are checked on the server for filename, extension, MIME type, file signature/structure, dimensions, and size. The original bytes are stored in PostgreSQL `BYTEA`; the app does not rewrite, OCR, or automatically interpret the image. Only enumerated user-verified line visibility values are persisted. Replacing an image clears those observations.

The question endpoint authenticates the LIFE account and reads only that account's Palmistry observations. It runs deterministic local rules, without sending the image, birth details, question, or observations to an external AI/API. Answers identify the visible user-marked features and their broad traditional associations. Questions that require timing, Kundli calculations, compatibility, or specific outcomes return an explicit unsupported/insufficient status. Palmistry interpretations are cultural traditions, not guaranteed or scientifically established facts.

## Security and operations

- The `/api/palmistry` endpoints require the authenticated LIFE session. Mutations check same-origin requests, rate-limit by account, and scope database reads/writes/deletes to the authenticated user.
- `/api/palmistry/original` serves the original as a private, no-store attachment after owner authorization.
- The additive `20261124140000_palmistry_records` migration defines and forces PostgreSQL row-level security with separate owner policies for SELECT, INSERT, UPDATE, and DELETE.
- Palmistry originals are excluded from database export/import workflows. No temporary upload files are created.
- The migration has not been applied to a live database, and RLS has not been integration-tested against PostgreSQL. Do not treat production persistence/RLS as verified until an authorized migration and isolated-database test are performed.

Automatic hand/line detection is intentionally not implemented: LIFE currently has no bundled model, and no model weights were added without independently confirmed licensing and local-runtime behavior.
