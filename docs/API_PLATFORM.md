# LIFE API platform

## Local API base URL

Use `http://localhost:3000` for local development. Use HTTPS for all non-local deployments.

The supported scopes are exact method-and-path identifiers:

- `GET /api/health`
- `GET /api/locations`
- `POST /api/charts`
- `POST /api/transits`
- `GET /api/developer/test`

The chart, location and transit routes use the existing LIFE calculation handlers. No saved-chart, birth-profile, account, or other private record API is exposed through API keys.

## Roles and access

- A Super Admin creates products and assigns product grants to Developer accounts. A Super Admin separately grants Admins per-product scopes, quota ceilings, and the ability to manage keys.
- An Admin may issue, disable, revoke, or rotate keys only for an account with an active product grant and within that Admin's explicit scope and quota ceilings.
- A Developer can manage keys only for their own account and only within an active product grant.
- Keys are limited to Developer-role accounts. Removing that role or disabling the product or account grant stops key authentication.
- The current `User` schema has no separate suspended/disabled account-status property; role and grant state are the available account authorization checks.

## Key storage and usage

Set `API_KEY_PEPPER` to a secret with at least 32 UTF-8 bytes before enabling key creation or authentication. Store it in the server's secret manager only; do not use a client-visible `NEXT_PUBLIC_` variable. The app generates random key material; it stores only a keyed HMAC-SHA-256 digest, public key ID, and non-secret prefix. The full key is returned once at creation or rotation, is never placed in audit details, and cannot be retrieved later.

API keys are passed as `Authorization: Bearer <key>`. The secret is accepted only by the protected API routes and is not logged. Verification uses a constant-time digest comparison. Per-key and per-account, per-product minute/day/month windows are reserved transactionally in PostgreSQL. Revocation, expiry, product disablement, grant changes, role changes, missing scopes and exhausted limits are checked before a protected operation runs. Usage exports omit the key digest and secret.

Do not put API keys in front-end source, query parameters, browser storage, logs, screenshots or issue reports. The API docs key input exists only in component memory for that browser tab.

## Safe local authentication check

After an authorized Super Admin has configured a product, developer grant, and key with the `GET /api/developer/test` scope, verify it without sending personal chart data:

```powershell
curl.exe http://localhost:3000/api/developer/test `
  -H "Authorization: Bearer <YOUR_ONE_TIME_KEY>"
```

The endpoint returns the authenticated key ID, allowed scopes, key/account limits and remaining quota. Expected errors use JSON `{ "error": "...", "code": "..." }`: `401` for missing, invalid, inactive or expired keys; `403` for disabled access or missing scope; `429` for rate/quota exhaustion; and `503` when API key storage or secret configuration is unavailable.

Other real examples use existing handlers:

```powershell
curl.exe "http://localhost:3000/api/locations?q=Lahore" `
  -H "Authorization: Bearer <YOUR_ONE_TIME_KEY>"
```

```powershell
curl.exe -X POST http://localhost:3000/api/charts `
  -H "Authorization: Bearer <YOUR_ONE_TIME_KEY>" `
  -H "Content-Type: application/json" `
  -d '{"localDate":"1990-05-15","localTime":"10:30","timeZone":"Asia/Kolkata","latitude":19.076,"longitude":72.8777}'
```

The chart example uses fictional values and computes a chart using the existing local engine. The API key must have the matching endpoint scope. `GET /api/health` remains publicly readable; an API key can optionally authenticate to consume and inspect quota.

## Database rollout

The additive migration is `prisma/migrations/20261027120000_api_platform/migration.sql`. It adds product, account-grant, Admin-permission, hashed-key, usage-window and audit tables; it is **not applied** by this development task. Do not apply it to the live Supabase database until an authorized operator has reconciled the unknown migration ledger from actual deployment records and backups, and tested the migration against a disposable staging database. No seed product or demo credential is installed.

## Limitations

Usage and quota windows require PostgreSQL and the migration above. API management returns an explicit service error until that approved schema rollout exists. User status is currently represented by role and grant state, not an independent account lock. Admin permissions are scoped by product, not by a configurable per-account subset beyond the Super Admin-created account grant.