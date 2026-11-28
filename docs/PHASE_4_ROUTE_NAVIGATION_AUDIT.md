# Phase 4 Route and Navigation Audit

## Inventory

The App Router contains 38 page routes, 62 API route files, and two metadata routes (`/robots.txt` and `/sitemap.xml`). Dynamic route parameters are shown in brackets. This inventory records route paths, not HTTP methods.

### Public pages and account flows

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/verification` — public release-status checklist; run details are sanitized and reviewer approvals are separate and authenticated.
- `/terms-and-conditions`
- `/privacy-policy`
- `/disclaimer`
- `/refund-policy`
- `/references`
- `/blogs`
- `/blogs/[slug]`
- `/developers`
- `/developer/login`
- `/developer/signup`
- `/super-login` — sign-in only; does not create or promote accounts.
- `/api/docs`

### Authenticated user workspace and services

- `/dashboard`
- `/dashboard/assistant`
- `/dashboard/questions` — same assistant workspace as `/dashboard/assistant`.
- `/studio`
- `/kp-astrology` — authenticated redirect to the KP section at `/studio#kp`.
- `/ank-jyotish`
- `/palmistry`
- `/tarot-reading`
- `/life-timeline`
- `/marriage-timing`
- `/remedies`

### Role-protected pages

- Developer only: `/developers/dashboard`
- Admin or Super Admin: `/admin`, `/admin/api`, `/admin/scripts`
- Super Admin only: `/super-admin`, `/super-admin/seo`, `/super-admin/database`, `/super-admin/blogs`, `/super-admin/api`

### API routes

- Authentication: `/api/auth/forgot-password`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`, `/api/auth/reset-password`
- Profiles and charts: `/api/profiles`, `/api/profiles/[profileId]`, `/api/saved-charts`, `/api/saved-charts/[chartId]`, `/api/charts`, `/api/charts/sensitivity`, `/api/kundalis`, `/api/kundalis/[kundaliId]`, `/api/kundalis/[kundaliId]/original`, `/api/transits`
- Reading and assistant history: `/api/astrology-readings`, `/api/astrology-readings/[readingId]`, `/api/assistant/questions`, `/api/assistant/questions/[questionId]`, `/api/dashboard/astrology-summary`
- Palmistry: `/api/palmistry`, `/api/palmistry/hands`, `/api/palmistry/hands/original`, `/api/palmistry/legacy/assign`, `/api/palmistry/original`, `/api/palmistry/questions`, `/api/palmistry/readings`
- Verification and legal: `/api/verification`, `/api/verification/approvals`, `/api/legal/acceptance`
- Developer and platform: `/api/developer/test`, `/api/platform/accounts`, `/api/platform/grants`, `/api/platform/keys`, `/api/platform/keys/[keyId]`, `/api/platform/permissions`, `/api/platform/products`, `/api/platform/products/[productId]`, `/api/platform/usage`
- Admin: `/api/admin/scripts`, `/api/admin/scripts/[scriptId]`, `/api/admin/users`
- Super Admin: `/api/super-admin/audit-logs`, `/api/super-admin/blogs`, `/api/super-admin/blogs/[postId]`, `/api/super-admin/database`, `/api/super-admin/database/export`, `/api/super-admin/database/import`, `/api/super-admin/health`, `/api/super-admin/kundali-reports`, `/api/super-admin/kundali-reports/[reportId]`, `/api/super-admin/overview`, `/api/super-admin/seo`, `/api/super-admin/seo/audit`, `/api/super-admin/seo/export`, `/api/super-admin/users`, `/api/super-admin/users/[userId]/role`
- Public/service endpoints: `/api/health`, `/api/locations`, `/api/openapi.json`, `/api/site-scripts`

## Navigation findings and changes

- Literal internal links resolve to an App Router or metadata route; the route-link test covers them.
- `/dashboard` is the authenticated service hub. Its responsive menu and section navigation already support English, Hindi, and Hinglish.
- The service catalog now links only to existing Vedic/Kundali, KP, Numerology, Palmistry, and Tarot workspaces. Search matches translated labels and descriptions plus service keywords.
- The same service destinations are available from Numerology/Tarot navigation; Chart Studio and Palmistry now include a direct dashboard link. The existing KP redirect and dashboard assistant alias remain unchanged.
- Numerology can load the signed-in user's saved birth profiles and reuse the selected date of birth. It does not treat a profile label as a personal name or silently copy profile time/location into a calculation that does not use them.
- Standard Admins no longer see the Super Admin overview link in the script manager. Server-side Admin and Super Admin route checks remain authoritative.
- `/verification` is a direct-access public status page rather than a dashboard service; its public API omits private process output, and authenticated reviewer approvals remain separately protected.
- Password reset and account verification are workflow routes; `/super-login` is a restricted sign-in entry. Metadata/API routes are not user navigation destinations.
- No duplicate service pages were added. The previously duplicated assistant page aliases remain compatible.

## External-link policy

Visible external source/catalog links are HTTPS-only and are rendered only for these exact approved hosts: `archive.org`, `datacenter.iers.org`, `download.geonames.org`, `github.com`, `raw.githubusercontent.com`, `saravali.github.io`, `ssd-api.jpl.nasa.gov`, `ssd.jpl.nasa.gov`, `www.astro.com`, `www.iana.org`, and `www.lakshminarayanlenasia.com`.

The developer portal's `https://your-deployment-host` strings are code examples, not clickable destinations. Blog canonical URLs are metadata, not visible navigation; sitemap generation rejects cross-origin canonical URLs.
