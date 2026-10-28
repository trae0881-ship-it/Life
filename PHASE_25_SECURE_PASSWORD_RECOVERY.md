# Phase 25 — Secure Password Recovery

## Status

The code-level recovery flow is implemented and automated checks pass. End-to-end recovery is **not operationally verified**: email delivery is not configured in the local environment, and the additive database migration has not been applied. No account was reset or otherwise modified.

## Implementation

- `/forgot-password` accepts reset requests and `/reset-password` completes them.
- Reset tokens use 32 cryptographically random bytes, are valid for 30 minutes, are single-use, and are persisted only as SHA-256 hashes. Reset links carry the token in the URL fragment; the client removes it from browser history after reading it.
- Password updates use the existing Argon2id password-hashing function. Completion atomically claims the unexpired token, updates the password, and revokes all sessions and reset tokens for that user.
- Responses do not disclose whether an account exists. The account lookup and email delivery are scheduled with Next.js `after()` after the generic response is sent, reducing account-existence timing differences.
- Mutations enforce same-origin checks. Request and completion endpoints are rate-limited using the existing in-memory limiter. Limits are process-local, not shared across multiple app instances.
- Delivery uses the Resend Email API. The server-side configuration is `RESEND_API_KEY`, `LIFE_EMAIL_FROM`, and `LIFE_PUBLIC_APP_URL`. Configure these only in the deployment's secret/environment manager, verify the sender domain/address with Resend, and use an HTTPS public URL outside localhost. The Resend API request uses an eight-second timeout.
- The additive migration is [20261026140000_password_reset_tokens/migration.sql](./prisma/migrations/20261026140000_password_reset_tokens/migration.sql). It creates the token table, indexes, and cascading user foreign key. It has **not** been applied to any database.

## Verification

| Check | Result |
|---|---|
| Full automated suite (`npm.cmd test`) | PASS — 338 passed, 0 failed, 0 skipped |
| Password recovery unit coverage | PASS — random token/hash and expiry, unknown/malformed email, invalid/expired/replayed tokens, Argon2id update, session revocation, password confirmation, request limits, and route/migration assertions |
| TypeScript (`tsc --noEmit`) | PASS |
| Prisma schema (`prisma validate`) | PASS |
| Production build (`npm.cmd run build`) | PASS — Prisma Client generated and Next.js production build completed |
| Local forgot-password endpoint smoke test | BLOCKED as expected — returned HTTP 503 because recovery email configuration is absent; this request did not perform an account lookup or database write |
| Email-provider delivery | BLOCKED — provider configuration and verified sender are not available for a safe delivery test |
| Database-backed recovery | BLOCKED — migration remains unapplied; no disposable `LIFE_TEST_DATABASE_URL` was available. No live database write was attempted |

The automated recovery tests exercise token and persistence behavior through test doubles; they do not prove Resend delivery or live database integration. Code-level validation must not be interpreted as independent validation of the deployed recovery workflow.

## Safe operator next steps

1. Review the additive migration and recovery changes, then have an authorized operator apply the migration through the approved database process. Do not bypass TLS verification or use the transaction pooler if it continues to produce the previously observed prepared-statement/TLS errors.
2. Configure the three server-side email settings and verify the Resend sender domain/address without sharing the API key in chat or source control.
3. In an approved non-production environment, verify delivery to an authorized test account, token expiry/replay rejection, password login with the new password, and invalidation of existing sessions.
4. Only after that verification, ask the account owner to use `/forgot-password` for their own account. Do not run a reset or claim the Super Admin account is recovered on the owner's behalf.
