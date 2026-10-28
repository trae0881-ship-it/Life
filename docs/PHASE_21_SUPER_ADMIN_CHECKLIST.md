# Phase 21: Super Admin feature checklist

Status reflects repository code and mocked/unit-test coverage. No production
database was contacted; database-backed behavior and live account state remain
unverified.

| Feature | Status | Evidence and limits |
|---|---|---|
| Protected `/super-admin` page | Implemented | Server page resolves the session role and returns not-found for non-Super Admin users; route handlers independently enforce `SUPER_ADMIN`. |
| Overview counts | Implemented | Guarded API returns live ORM counts for users, profiles, saved charts, and saved questions. Values are not seeded or fabricated. Live values were not checked in this task. |
| User list, search, pagination | Implemented | Guarded API supports role filtering, bounded stable pagination, and name/email/ID search. Responses include account ID, full name, email, role, creation date, and profile count only. |
| User detail inspection | Partially implemented | The list shows a minimized user summary. Birth details, chart contents, answers, password hashes, session hashes, and tokens are excluded. No separate detail page exists. |
| Role and admin-account management | Implemented | Super Admin may assign `USER`, `DEVELOPER`, or `ADMIN`. The actor cannot change their own role; any `SUPER_ADMIN` target and `SUPER_ADMIN` assignment are rejected. Mutations require same-origin requests and are audited transactionally. |
| Admin account listing | Implemented | Admin accounts are included in the guarded user list and may be assigned permitted roles. There is no separate Admin-management service. |
| Audit-log list, filters, pagination | Implemented | Existing persisted list-read, filtered-read, role-change, and bootstrap events can be filtered by action/date and paginated. Records include actor, target/role transition where available, timestamp, requested page, and result count. No unsupported event outcome is displayed. |
| Engine and database health | Implemented | New Super Admin-only API returns only engine status and database connection status; it does not return credentials, environment values, or detailed errors. |
| Account disabling or status changes | Not supported | `User` has no disabled/status field or account-status service. No controls or endpoint were added. |
| Platform settings | Not supported | No settings model or service exists. The former placeholder navigation item was removed. |
| Chart/report inspection | Not supported as an admin workflow | Saved charts exist, but this dashboard does not expose chart contents. The former placeholder navigation item was removed; aggregate counts remain in overview. |
| Question/answer audit | Not supported as an admin workflow | Questions and answers exist as user-owned records, but there is no privileged review service or policy. Only the aggregate count is shown; the former placeholder item was removed. |
| Initial Super Admin provisioning | Implemented in code; live status blocked | CLI requires the single intended target email, `--confirm`, `--operator`, and `--database-name`; checks actual database name and both required migration records; requires existing target; refuses other Super Admins; and audits a successful promotion. The command was not run. |
| Target account exists / role | Blocked | Not queried. No account creation, password reset, or role change was performed. |
| Migration status | Blocked | Migration files exist, but the configured database's `_prisma_migrations` status was not queried. |
| Responsive UI | Implemented in CSS; browser verification blocked | Mobile navigation, horizontally scrollable tables, and responsive health/metric cards are defined. No authenticated Super Admin session was available for visual browser testing. |

## Provisioning preconditions

The operator must first use an approved database console to confirm
`SELECT current_database();`, review the migration files, and run
`npx.cmd prisma migrate status` against the intended database. Apply required
migrations only through the reviewed deployment procedure. If
`am123allindiafree@gmail.com` is absent, register that account at `/signup`;
registration creates only a `USER`. Do not duplicate an existing account or
reset its password.

After independently confirming the intended database and migration readiness,
set `DATABASE_URL` in the protected operator environment and run:

```powershell
npm.cmd run admin:provision -- --email am123allindiafree@gmail.com --database-name <verified-database-name> --operator <operator-name-or-ticket> --confirm
```

The CLI verifies database identity and successful application of
`20261026120000_super_admin_role_audit` and
`20261026130000_user_full_name`; it never runs migrations. Its actor label is
operator-supplied and must be attributable to a controlled operator process.
No password or connection string belongs in command arguments or source.

## Database integration test gate

Integration tests may run only through `npm.cmd run test:postgres` with a
dedicated disposable `LIFE_TEST_DATABASE_URL`. That script verifies the target
database name and refuses production/staging targets; it does not fall back to
`DATABASE_URL`. Availability of that test database must be checked separately
without printing either connection string.
