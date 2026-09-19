## 1. Database Schema

- [x] 1.1 Add and export the PostgreSQL legal documents enum, table, and inferred types; verify OpenSpec, formatting, lint, and the database package type check without generating a migration
- [x] 1.2 Add and export account legal acceptances with account and legal document relationships, timestamp, and duplicate prevention; verify without generating a migration

## 2. Admin Authoring Surface

- [x] 2.1 Add the localized protected Admin legal documents route, sidebar entry, organization and web tab groups, and four independent transient rich editors; verify OpenSpec, Admin tests and type check, lint, and formatting without adding persistence actions

## 3. Persistence and publishing

- [x] 3.1 Generate and review a timestamp-prefixed PostgreSQL migration for legal documents and account legal acceptances
- [x] 3.2 Add shared types, validators, and `API_ROUTES` for Admin list/get, save-draft, and publish of a legal document type
- [x] 3.3 Add repositories and Nest Admin-authenticated use cases: load current draft + last published per type, upsert unpublished draft, publish immutable version
- [x] 3.4 Wire Admin editors to load persisted content and expose **Guardar** / **Publicar** with Spanish copy, without a version-history browser

## 4. Registration acceptance (web and dashboard)

- [x] 4.1 Unauthenticated GET of the latest published legal document by type (`/public/:type`); never return drafts (no schema change)
- [x] 4.2 Persist `account_legal_acceptances` on email user/owner confirmation; reject if a published document is missing; backfill unused-token retries
- [x] 4.3 Persist acceptances on Google new-account from register; refuse Google login that would create an account
- [x] 4.4 Web register: checkboxes, information dialogs, and Google gating for web terms and privacy
- [x] 4.5 Dashboard register: checkboxes, information dialogs, and Google gating for dashboard terms and privacy

## 5. Reacceptance after a new publish (existing accounts)

- [x] 5.1 Stale-acceptance contracts, validators, `API_ROUTES`, and i18n error
- [x] 5.2 Repository: current published vs account acceptances; stale types for `user` / `owner`
- [x] 5.3 Authenticated pending GET + accept POST for current published rows of stale types
- [x] 5.4 API allow-list after JWT for stale `user`/`owner`; skip admin, staff, anonymous
- [x] 5.5 Web dedicated `/legal-acceptance` + redirect of other authenticated routes
- [x] 5.6 Dashboard dedicated page + redirect for owners
