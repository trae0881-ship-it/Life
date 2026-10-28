# LIFE — Phase 24: Secure Super Admin Account Recovery

**Date:** 2026-10-26  
**Result:** **BLOCKED — no implemented, verified password-recovery mechanism exists for LIFE accounts. No account recovery was attempted.**

## Findings

- LIFE uses its own application authentication. The login route calls `authenticateCredentials`, which looks up the LIFE `User` by normalized email and verifies the stored Argon2id hash. It then creates a LIFE database-backed session.
- Registration hashes passwords with Argon2id. It does not send a verification email.
- The only auth API routes present are registration, login, session inspection, and logout. There is no forgot-password route, reset-password route, verification-link route, reset-token handler, or account recovery page.
- The Prisma `User` model contains the password hash, account email and role, but no verified-email flag. The schema has no password-reset-token model or recovery-token fields.
- The project documentation states that no email-verification service is implemented. `package.json` and the inspected configuration did not show a mail delivery integration or reset mechanism.
- The Super Admin provisioning CLI only promotes an existing account. It does not reset passwords, issue recovery links, or bypass authentication.
- Consequently, entering a recovery email or using a Supabase Auth password-reset flow would not be a supported recovery path for this custom LIFE account system. Supabase database hosting does not itself verify ownership of the email stored in LIFE’s `User` table.

## Safest supported option

There is currently **no supported operator password-reset procedure** in this repository. If the account owner still knows the current password, they can use the normal LIFE login flow directly in the browser. If the password is lost, do not try to recover access by editing the live password hash, inserting a reset token, changing roles, creating another account, or using a public bootstrap endpoint.

The safe next step is for the authorized project operator to approve a purpose-built recovery mechanism before attempting an account reset. At minimum, a reviewed implementation needs:

1. A configured email-delivery provider and verified sender/domain, with secrets kept in the server-side secret store.
2. A secure email-ownership verification and reset flow: cryptographically random, single-use, short-lived tokens stored only as hashes; indistinguishable responses for existing/non-existing accounts; rate limiting; same-origin protections; and no tokens or passwords in logs.
3. A reviewed additive schema migration for the recovery-token lifecycle, if the implementation uses persisted tokens. Do not apply that migration without separate operator approval.
4. Password reset using the existing Argon2id hashing parameters, session revocation after a successful reset, and safe audit metadata without recording credentials or raw tokens.
5. Focused tests for expiry, replay, account enumeration, rate limits, same-origin requests, session invalidation, and mail-provider failures.

A separate operator-only maintenance command could be considered only after a security review and explicit operational approval; none exists now, and this phase did not create one.

## Phase 23 status

The current Super Admin credential remains unavailable to the operator. The local login route and preservation of `/super-admin` as the post-login destination were verified in Phase 23, but no login was attempted. The account’s existence, role, password validity, and recoverability remain unverified. The account is **not claimed to be recovered**, and Super Admin access is **not claimed to be working**.

## Post-recovery browser verification checklist

Only after the authorized account owner completes a reviewed recovery through an approved mechanism:

1. Enter the current password directly in the local browser login UI at `/login?next=%2Fsuper-admin`; do not paste it into chat, a command line, screenshots, or logs.
2. Confirm successful login returns to `/super-admin`.
3. Refresh `/super-admin` and confirm the authenticated session remains valid.
4. Confirm overview counts load or the dashboard displays its explicit error state.
5. Exercise user search, role filters, and pagination using read-only actions only.
6. Confirm audit logs load real entries or show a truthful empty state; do not create events for testing.
7. Confirm the health panel contains only approved status fields and no credentials or environment values.
8. Do not test live role mutations or edit account data during verification.
9. Use the UI logout action; confirm the session is revoked, `/super-admin` redirects to login, and protected APIs return 401.
10. Test USER/ADMIN denials only using mocks or isolated disposable accounts; do not change live roles.

No tests, type checks, Prisma validation, or build were run for this phase because no code changed. No database query, migration, account lookup, password reset, role change, or provisioning command was run.
