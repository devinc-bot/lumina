# Plan 044 - DRY Client Auth Session Stack

## Approach

Extract parameterized factories into `@repo/common` in the same style as
`createAccountSessionsClient` / `createLegalDocumentsClient`. Apps keep thin wrappers
for `CLIENT_APP`, cookie name, env/`API_URL`, and admin-only guards.

## Confirmed Decisions

- Cookie names stay exactly as today (no rename).
- `@repo/common` stays free of React/Zustand/i18n dependencies; messages injected.
- Zustand `session.store` and `useSession` remain per-app in this feature.
- RequireSession / RequireAdminSession / RequireGuest UI not merged here.
- One task per apply turn unless the user authorizes a batch.

## Technical Design

| Factory / constant                                                              | Inputs                                             | Outputs                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| `SESSION_DURATION_MS`                                                           | —                                                  | shared max-age                             |
| `ACCESS_TOKEN_COOKIE_NAME` by `CLIENT_APP` (optional map) or caller passes name | `CLIENT_APP` or string                             | cookie name                                |
| `createAuthStorage`                                                             | `cookieName`, `maxAgeMs?`                          | save/get/clear/getAccessTokenSync          |
| `createSessionCleanup`                                                          | `clearAuthSession`                                 | register + `clearLocalSession`             |
| `createSessionService`                                                          | `api`, `app`, `clearAuthSession`, `messages`       | fetch/refresh/logout + `SessionFetchError` |
| `createQueryFactoryAuthOptions` (or inline helper)                              | `app`, token getters, `clearLocalSession`, `isSsr` | options fragment for `new QueryFactory`    |

## Migration Notes

- Prefer updating imports to `@repo/common` directly where clean; thin re-export files
  allowed temporarily to keep `~/` paths stable for a task.
- Do not change API contracts or Nest session endpoints.

## Verification

- Existing session/auth infrastructure tests in web/dashboard/admin.
- Type-check `@repo/common` and the three apps (or affected packages).
- Manual smoke: login + refresh + logout on one app after QueryFactory task.
- Quality review after each applied task (or after batch if authorized).
