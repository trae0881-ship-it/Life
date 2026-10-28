# Disposable PostgreSQL Integration Testing

This procedure is for authenticated integration tests only. It must not use the
working Supabase database, production data, or a shared staging database.

## 1. Create an isolated database

Create a separate disposable PostgreSQL database with a name ending in `_test`
or `-test`, for example `life_integration_test`. Use a separate database,
project, or local PostgreSQL instance with credentials that are not used by the
application’s working environment.

Do not paste credentials into chat, source files, documentation, or test output.
If a password contains URL-reserved characters, percent-encode it in the URL.

## 2. Configure only the test environment

Copy `.env.test.example` to `.env.test` and replace the placeholder with the
disposable PostgreSQL URL:

```dotenv
LIFE_TEST_DATABASE_URL=postgresql://<test-user>:<encoded-password>@<test-host>:5432/life_integration_test?schema=public
```

Do not copy the working `DATABASE_URL` into `.env.test`.
Do not configure `LIFE_TEST_DATABASE_URL` to a production or shared database.
`.env.test` is local-only and must not be committed.

## 3. Run the guarded integration command

From `C:\Users\pc\Desktop\life`:

```powershell
npm.cmd run build
npm.cmd run test:postgres
```

The existing runner in `scripts/test-postgres.mjs`:

1. Loads `.env.test`.
2. Requires `LIFE_TEST_DATABASE_URL`.
3. Requires a PostgreSQL URL.
4. Requires a database name ending in `_test` or `-test`.
5. Rejects production and staging names.
6. Verifies `current_database()` before any migration.
7. Applies repository migrations only to the verified disposable database.
8. Runs `tests/postgres.integration.mjs`.
9. Cleans up test-created users by its generated test prefix.

No integration command should be run until the database identity and disposable
status are confirmed. If the variable is absent, integration testing is
`BLOCKED`, not a pass.

## 4. Expected coverage

The PostgreSQL integration suite covers the existing authentication and
persistence surfaces, including registration, login, sessions, profile CRUD,
saved-chart persistence, ownership isolation, validation, and rollback behavior.
It does not establish astrological accuracy.

## 5. Cleanup and reporting

After testing, remove or rotate the disposable credentials and delete the
disposable database when it is no longer needed. Report only pass/fail/block
status and sanitized database identity; never report connection strings,
passwords, cookies, or user credentials.
