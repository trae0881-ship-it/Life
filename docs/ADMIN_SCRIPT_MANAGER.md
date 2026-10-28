# Admin script manager

The manager is available at `/admin/scripts` to authenticated `ADMIN` and `SUPER_ADMIN` accounts. All management endpoints repeat this authorization check server-side. Mutations require a same-origin `Origin` header, validate request size, syntax-check JavaScript without sanitizing or rewriting it, and write an actor/action/timestamp audit event in the same database transaction.

Custom JavaScript is privileged, unsandboxed, and XSS-capable. It can act with the visitor's browser permissions. Only run code reviewed and approved by the site owner; never put secrets in snippets. Enabled snippets are intentionally visible to browsers at the page where they execute. The management API itself requires an admin session.

Entries can be site-wide or target an exact URL path. They are inserted after React hydration into `HEAD`, at the beginning of `BODY`, or at its end. On client-side route changes, active managed script elements are removed and matching page scripts are inserted for the new path. Script side effects are not reversible by removing the element. Identical enabled snippet content is emitted once per route, and disabled entries are not returned by the runtime endpoint.

Automatic injection is disabled unless the public, non-secret build-time flag `NEXT_PUBLIC_LIFE_MANAGED_SCRIPTS_ENABLED` is exactly `true`. Enable it only in a build made after the migration is approved and applied; changing this `NEXT_PUBLIC_` flag requires a rebuild.

## Database rollout

The additive migration `prisma/migrations/20261027111700_admin_script_manager/migration.sql` creates the script and audit tables and their enums/indexes. It has **not** been applied by this implementation. Before enabling the manager in any shared environment, an authorized operator must verify the database's migration history and backups, apply this migration through the approved deployment process, and verify the resulting schema. Do not mark historical migrations as applied or run this against the live database without explicit authorization.

Until the migration is applied, the management/runtime APIs return an explicit `503` response. The application does not create tables or fall back to local-file persistence.
