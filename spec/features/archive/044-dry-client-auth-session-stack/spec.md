# Spec 044 - DRY Client Auth Session Stack

## Context and Objective

Web, dashboard, and admin each ship near-identical client auth/session plumbing:
access-token cookie storage, session cleanup registry, session fetch/refresh/logout
service, Zustand store, `useSession` hook, and QueryFactory auth options. Only cookie
names and `CLIENT_APP` differ in the core path. This feature extracts parameterized
factories into `@repo/common` (following `createLegalDocumentsClient` /
`createAccountSessionsClient`) so behavior cannot drift across apps while preserving
per-app cookies, refresh payloads, SSR rules, and admin-only role gating.

## Users / Actors

- Maintainers changing auth/session client code.
- End users of web, dashboard, and admin (no intentional UX change).

## User Stories

- H1: As a maintainer, I want one shared auth-storage/session-service implementation so
  cookie and refresh bugs are fixed once.
- H2: As a buyer/owner/admin, I want login, refresh, logout, and session restore to keep
  working with the same cookie names and app-scoped refresh bodies.
- H3: As an admin operator, I want admin role gating on require-session flows to remain
  unchanged.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: THE SYSTEM SHALL provide `createAuthStorage({ cookieName, maxAgeMs? })` in
  `@repo/common` that exposes `saveAuthSession`, `getAuthSession`, `getAccessTokenSync`,
  and `clearAuthSession` using existing cookie helpers.
- RF-2: THE SYSTEM SHALL keep access-token cookie names exactly
  `app.web.auth.token`, `app.dashboard.auth.token`, and `app.admin.auth.token`.
- RF-3: THE SYSTEM SHALL provide `createSessionCleanup({ clearAuthSession })` that
  registers a store-clear callback and clears cookies + store via `clearLocalSession`.
- RF-4: THE SYSTEM SHALL provide `createSessionService({ api, app, clearAuthSession,
messages })` for `fetchSession`, `refreshAuthSession`, and `logoutAuthSession`, with
  injectable i18n message getters (no `@repo/i18n` dependency in `@repo/common`).
- RF-5: WHEN configuring QueryFactory refresh on the client, THE SYSTEM SHALL send
  `{ app: CLIENT_APP.* }` matching the current app and SHALL omit refresh wiring under
  SSR (`import.meta.env.SSR`).
- RF-6: THE SYSTEM SHALL centralize `SESSION_DURATION_MS` in `@repo/common`.
- RF-7: WHILE apps migrate, THE SYSTEM SHALL keep exported function names used by
  existing imports/tests (`saveAuthSession`, `clearLocalSession`, `fetchSession`, etc.)
  via thin wrappers or updated imports in the same task.
- RF-8: THE SYSTEM SHALL NOT change web/dashboard/admin product routing or admin role
  checks as part of this extract (`RequireAdminSession`, `isAdminSession`, guest
  redirects remain app-owned unless a later optional task explicitly extracts UI).

## Non-Functional Requirements

- No new runtime dependencies; do not add React/Zustand peers to `@repo/common`.
- Zustand store and `useSession` remain per-app (or deferred) unless a later task
  introduces an agreed home with correct peers.
- Preserve existing Spanish/English i18n keys for session errors.
- High test importance for storage/service/QueryFactory wiring regressions (auth).

## Edge Cases

- SSR: no refresh registration; cookie reads no-op / null as today.
- 401 on session fetch: clear local auth session as today.
- Wrong `CLIENT_APP` on refresh/logout would break server cookie binding — factories must
  take `app` as a required parameter.
- Live sessions must survive the extract (cookie names unchanged).

## Out of Scope

- HttpOnly access-token migration / BFF auth redesign.
- Merging RequireGuest / SessionLoading / SessionError UI across apps.
- User/owner registration pipeline DRY (separate feature).
- API auth module changes.
- Checkout polling / Cloud Run scheduler (042).

## Definition of Done

- Factories live in `@repo/common` and all three apps use them for storage, cleanup,
  session service, and QueryFactory auth options.
- Cookie names and `CLIENT_APP` refresh payloads unchanged.
- Focused tests/type-check on touched packages pass; quality review complete.
- Tasks applied incrementally and archived only after verification.

## Open Questions

- None blocking if store/hook stay per-app for this feature (recommended default).
- Optional follow-up (not required for Done): shared store factory / `useSession` once a
  package home with React+Zustand peers is chosen.
