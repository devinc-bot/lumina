# Plan 033 - API Rate Limiting

## Approach

Add two NestJS guard layers without changing how JWT and roles are attached today.

1. `ApiThrottlerGuard` registered as `APP_GUARD` in `CommonModule`. It extends `@nestjs/throttler` `ThrottlerGuard`, tracks `request.ip`, applies named profiles from `RATE_LIMIT_POLICY`, and emits 429 with retry headers.
2. `UserRateLimitGuard` used only on sensitive handlers, listed after `JwtAuthGuard` (and `RolesGuard` when present). It consumes `@nestjs/throttler` in-memory storage with a `user.sub` tracker so the access token is not verified twice.

Distributed enforcement stays at Caddy/CDN/WAF until a later Redis (or equivalent) storage adapter exists. Each API process keeps its own counters, isolated by handler and tracker key.

## Configuration

Create a typed `RATE_LIMIT_POLICY` map (profile name → `{ limit, ttlMs }`) sourced from validated env:

- `RATE_LIMIT_PUBLIC_LIMIT` / `RATE_LIMIT_PUBLIC_TTL_MS`
- `RATE_LIMIT_AUTHENTICATED_LIMIT` / `RATE_LIMIT_AUTHENTICATED_TTL_MS`
- Equivalent pairs for `login`, `authSensitive`, `authConfirm`, `refresh`, `purchase`, `qr`, `checkIn`, `geo`, `sse`

Validation: positive integers; omit → spec defaults. Update:

- `apps/api/src/config/env.schema.ts` and `env.schema.test.ts`
- `test/setup.ts` (explicit values so tests are deterministic)
- `deploy/env/{development,staging,production}.runtime.env.example`
- `deploy/env/README.md` and `deploy/OPERATIONS.md` as needed

## Nest integration

- Add `@nestjs/throttler` `6.5.0` to `apps/api` with an exact pin.
- Register `ThrottlerModule.forRootAsync(...)` in `AppModule` (or `CommonModule` if that keeps the policy colocated) using `RATE_LIMIT_POLICY`.
- Register `ApiThrottlerGuard` via `APP_GUARD` next to the existing `APP_FILTER`.
- Small decorators: `@ApiRateLimit(profile)`, `@UserRateLimit(profile)`, plus `@SkipThrottle()` on excluded routes.
- `ApiThrottlerGuard` must not parse `X-Forwarded-For` itself; `main.ts` already sets `trust proxy` from `TRUST_PROXY_HOPS`.
- On 429, set `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Throw `HttpException` with `TranslationService.translateError(RATE_LIMIT_ERROR_CODE.TOO_MANY_REQUESTS)` so `HttpExceptionFilter` keeps the current envelope.

## Route annotations

| Area                                               | IP profile                                      | User profile |
| -------------------------------------------------- | ----------------------------------------------- | ------------ |
| Default (no annotation)                            | `public`                                        | —            |
| Authenticated general controllers                  | `authenticated`                                 | —            |
| Login + Google OAuth                               | `login`                                         | —            |
| Register request, legacy register, forgot-password | `authSensitive`                                 | —            |
| Register confirm, reset-password                   | `authConfirm`                                   | —            |
| Refresh                                            | `refresh`                                       | —            |
| `POST /api/orders`                                 | `purchase`                                      | `purchase`   |
| Purchased-ticket QR                                | `qr`                                            | `qr`         |
| Create check-in                                    | `checkIn`                                       | `checkIn`    |
| Geo IP locate                                      | `authenticated` or skip IP override; user `geo` | `geo`        |
| Public event SSE and purchase SSE                  | `sse`                                           | —            |
| Health, readiness, Mercado Pago webhook            | skip                                            | —            |

Logout stays on the public/authenticated IP default (not a sensitive mutation). Invitation preview/accept stay on `public` unless review tightens them.

`UserRateLimitGuard` order on sensitive routes: `@UseGuards(JwtAuthGuard, RolesGuard?, UserRateLimitGuard)`.

## Geo migration

Remove `GeoRateLimitService` and its `GeoModule` provider. `LocateByIpUseCase` stops calling the in-memory map; the shared guards enforce the Geo budget. Keep `GEO_ERROR_CODE.RATE_LIMITED` unused or map Geo 429s to the generic `rateLimit.TOO_MANY_REQUESTS` so clients share one envelope. Prefer the generic key for the new guards; do not change daily auth domain codes.

## i18n

Add `RATE_LIMIT_ERROR_CODE.TOO_MANY_REQUESTS = 'rateLimit.TOO_MANY_REQUESTS'` in `packages/i18n` and Spanish/English copy. Run `pnpm check:i18n`.

Suggested copy:

- es: `Demasiadas solicitudes. Esperá un momento e intentá de nuevo.`
- en: `Too many requests. Please wait a moment and try again.`

## Persistence

No repository or schema changes. Daily registration (`USER_REGISTRATION_MAX_ATTEMPTS_PER_DAY` / `OWNER_REGISTRATION_MAX_ATTEMPTS_PER_DAY` = 10) and password reset (`PASSWORD_RESET_MAX_ATTEMPTS_PER_DAY` = 10) remain.

## Verification

- Schema: defaults, coerce, reject non-positive limit/TTL.
- `ApiThrottlerGuard`: tracker is `request.ip`; isolation by handler; window expiry; headers; skip list.
- `UserRateLimitGuard`: tracker is `user.sub` after JWT; does not call `jwtService.verify`; isolation from IP counters.
- Overrides: login, auth sensitive/confirm, refresh, purchase, QR, check-in, Geo, SSE.
- Exclusions: health, readiness, webhook.
- Filter still forwards 429 `message`.
- Daily auth limits still fire with existing codes.
- `pnpm test`, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, `pnpm --filter @repo/api build`, `git diff --check`.

## Confirmed Decisions

- Two in-process layers: global IP throttler + post-JWT user guard on sensitive routes only.
- No global JWT guard and no second JWT verification.
- In-memory storage with TTL eviction; no Redis in this feature.
- Persist daily registration/recovery limits.
- Exclude health/readiness and Mercado Pago webhook from memory limits.
- Cluster-wide protection remains at the edge until shared storage exists.
