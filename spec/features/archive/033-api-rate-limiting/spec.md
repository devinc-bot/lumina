# Spec 033 - API Rate Limiting

## Context and Objective

The NestJS API has no global HTTP rate limiter. Login, refresh, catalog, checkout, QR issuance, check-in, and public SSE can be abused from a single IP, while Geo uses a process-local bucket that never evicts abandoned keys. This change adds in-process rate limiting with `@nestjs/throttler` 6.5.0: a global IP guard plus a user-scoped guard on sensitive authenticated operations, without introducing Redis or changing authentication architecture.

## Users / Actors

- Anonymous clients of the public catalog, auth, invitation, and event SSE endpoints.
- Authenticated customers, owners, staff, and admins calling the API.
- Operators who configure limits through validated environment variables.
- Mercado Pago, which delivers many legitimate webhook events from a shared provider IP.

## User Stories

- H1: As an operator, I want default and overridable request budgets per route class so that abuse is contained without a code change for every tuning.
- H2: As a legitimate client, I want a localized 429 with retry guidance when I exceed a budget so that I can wait and continue.
- H3: As a paying customer or staff member, I want purchase, QR, and check-in operations limited per account so that a stolen or shared token cannot flood those flows from many IPs.
- H4: As an operator, I want health, readiness, and Mercado Pago webhooks excluded from the in-memory limiter so that probes and payment events are not dropped.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an HTTP request reaches a non-excluded handler, THE SYSTEM SHALL consume one unit of the applicable IP profile keyed by `request.ip` (Express `trust proxy` via `TRUST_PROXY_HOPS`).
- RF-2: THE SYSTEM SHALL apply `RATE_LIMIT_POLICY` profiles from validated environment variables, using the defaults in the Initial Limits table when those variables are omitted.
- RF-3: WHEN a handler is annotated with a named IP profile, THE SYSTEM SHALL use that profile instead of the default public profile for the IP counter of that handler.
- RF-4: WHEN a sensitive authenticated handler is annotated for user limiting and `JwtAuthGuard` has already populated `user.sub`, THE SYSTEM SHALL consume one unit of the matching user profile keyed by `user.sub` without verifying the JWT a second time.
- RF-5: IF either the IP or user budget for the handler is exhausted, THEN THE SYSTEM SHALL reject the request with HTTP 429, `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`, and a message from `rateLimit.TOO_MANY_REQUESTS`.
- RF-6: THE SYSTEM SHALL keep the existing `HttpExceptionFilter` envelope (`statusCode`, `timestamp`, `path`, `message`) for 429 responses.
- RF-7: THE SYSTEM SHALL exclude `GET /api/health`, `GET /api/health/ready`, and `POST /api/mercado-pago/webhook` from in-memory throttling. The webhook SHALL remain protected by signature, anti-replay window, and idempotency.
- RF-8: THE SYSTEM SHALL keep persisted daily registration and password-recovery counters as an additional defense. Those domain 429 messages SHALL remain `auth.USER_REGISTRATION_RATE_LIMITED` and `auth.PASSWORD_RESET_RATE_LIMITED`.
- RF-9: WHEN Geo IP locate is requested, THE SYSTEM SHALL apply the Geo profile through the shared limiter and SHALL NOT use `GeoRateLimitService`.
- RF-10: THE SYSTEM SHALL isolate counters by handler and by tracker key so that exhausting login does not exhaust catalog, and one IP or user does not consume another key's budget.
- RF-11: WHEN a window elapses, THE SYSTEM SHALL expire the in-memory bucket and allow a new full budget.
- RF-12: THE SYSTEM SHALL document that in-memory counters are per API process until shared storage exists, and that cluster-wide protection remains at Caddy/CDN/WAF.

## Non-Functional Requirements

- Pin `@nestjs/throttler` at `6.5.0` with no version range.
- Do not add Redis, shared storage, repository methods, or database migrations.
- Do not introduce a global JWT guard; keep per-endpoint `JwtAuthGuard` / `RolesGuard`.
- User-facing 429 copy is localized in Spanish and English through `@repo/i18n`.
- Limits are configured only through `@repo`/API env validation; do not duplicate numeric rules in prose outside `RATE_LIMIT_POLICY`.
- Geo's previous 30 requests / 60_000 ms budget is preserved as the Geo default.

## Edge Cases

- Missing `request.ip` after proxy configuration: reject or fail closed for the IP layer (do not fall back to an unverified `X-Forwarded-For` parse).
- User-limit annotation on a handler without `user.sub`: do not run the user counter (IP layer still applies).
- Multiple API instances: each process has independent counters.
- Abandoned buckets: storage expiration from `@nestjs/throttler` must reclaim them.
- Concurrent requests that cross the limit: at most the configured budget succeeds inside the window.
- SSE: each stream open counts as one request against the SSE IP profile; the connection is not re-counted per heartbeat.
- Legacy immediate register routes remain subject to the auth-sensitive IP profile in addition to any future removal of those routes.
- Google OAuth start/callback use the login IP profile.

## Out of Scope

- Redis or other shared throttler storage.
- Changing JWT verification, role guards, or session metadata IP resolution.
- Replacing daily persisted registration/recovery limits.
- Rate limiting inside Caddy/CDN/WAF configuration (remains the distributed control).
- Client UI for 429 beyond existing generic error handling.
- Rate limiting Mercado Pago webhook by IP in this iteration.
- Changing repositories or the database schema.

## Definition of Done

- Env schema tests cover defaults and invalid limit/TTL values.
- Guard tests cover `request.ip` tracking, `user.sub` tracking after JWT, expiration, counter isolation, 429 headers/body, exclusions, and profile overrides.
- i18n tests or `pnpm check:i18n` cover `rateLimit.TOO_MANY_REQUESTS`.
- Daily registration and recovery limits still return their existing domain 429s.
- `pnpm test`, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, the API build, and `git diff --check` pass.

## Initial Limits

TTL values are milliseconds. Duplicate purchase/QR/check-in rows are the IP layer and the user layer with the same budget. These defaults are approved for this iteration; operators override them with env vars.

| Profile         | Applied to                                                                                   | Tracker     | Limit | TTL (ms) |
| --------------- | -------------------------------------------------------------------------------------------- | ----------- | ----- | -------- |
| `public`        | Default for non-excluded handlers, including public catalog and public organization profile  | IP          | 120   | 60000    |
| `authenticated` | Authenticated general handlers (settings, session, dashboard reads, owner CRUD, admin reads) | IP          | 240   | 60000    |
| `login`         | `POST /api/auth/login`, Google OAuth start/callback                                          | IP          | 10    | 900000   |
| `authSensitive` | Register request, legacy register, forgot-password                                           | IP          | 5     | 900000   |
| `authConfirm`   | Register confirm, reset-password                                                             | IP          | 20    | 900000   |
| `refresh`       | `POST /api/auth/refresh`                                                                     | IP          | 30    | 60000    |
| `purchase`      | Create order / start payment                                                                 | IP and user | 10    | 60000    |
| `qr`            | Issue purchased-ticket QR                                                                    | IP and user | 20    | 60000    |
| `checkIn`       | Create check-in                                                                              | IP and user | 60    | 60000    |
| `geo`           | `GET /api/geo/ip-locate`                                                                     | user        | 30    | 60000    |
| `sse`           | Public event SSE and purchase SSE open                                                       | IP          | 20    | 60000    |

Excluded: `GET /api/health`, `GET /api/health/ready`, `POST /api/mercado-pago/webhook`.

## Open Questions

None.
