# Spec 046 - Cloudflare Frontends

## Context and Objective

Deploy `web`, `dashboard`, and `admin` to Cloudflare Workers so staging frontends are
served at the edge while the Nest API runs on Cloud Run (feature 042). This staging
iteration owns Worker hosting, build/publish, DNS/TLS at Cloudflare, and env wiring
(`VITE_*` → Cloud Run API URLs). It does not re-implement the API Cloud Run control
plane or deploy production.

## Users / Actors

- Platform operators publishing frontend apps.
- End users of `web`, `dashboard`, and `admin`.

## User Stories

- H1: As an operator, I want the three frontends deployed to Cloudflare after CI succeeds
  for a push to `staging` so that the staging release matches the API environment.
- H2: As an operator, I want every staging frontend to use the matching Cloud Run
  API origin so clients never mix environments.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN CI succeeds for a push to `staging`, THE SYSTEM SHALL serve
  `web`, `dashboard`, and `admin` through separate Cloudflare Workers.
- RF-2: THE SYSTEM SHALL build the staging frontends with the public API and
  cross-application URLs that correspond to the staging environment.
- RF-3: THE SYSTEM SHALL map the staging Workers to `staging.lumina-events.com`,
  `dash-staging.lumina-events.com`, and `admin-staging.lumina-events.com` with
  Cloudflare-managed TLS.

## Non-Functional Requirements

- No secrets in frontend bundles beyond intentional public `VITE_*` values.
- Use GitHub Actions after successful CI for a push to `staging`, aligned with the Cloud Run staging
  branch model.
- English ops docs under `deploy/`.

## Edge Cases

- One Worker deployment may fail after another has succeeded; operators must be able
  to re-run only the failed frontend deployment.
- Cache invalidation after deploy.

## Out of Scope

- Nest API / Cloud Scheduler / OIDC jobs (042).
- Production Workers, domains, and GitHub Environment configuration.
- Rewriting product UI.
- Terraform unless separately approved.

## Definition of Done

- Spec/plan/tasks approved; all three staging frontends live on Cloudflare Workers;
  DNS/TLS, API/CORS configuration, and deployment verification are recorded.

## Open Questions

- [NEEDS CLARIFICATION] Record the native staging Cloud Run service URL in the GitHub
  `staging` Environment before the Worker deployment is enabled.

### Resolved decisions

- Target host for staging/production frontends: **Cloudflare** (confirmed 2026-09-11
  with 042 Phase 2 decisions). API remains on Cloud Run.
- This iteration deploys staging only: `web` at `https://staging.lumina-events.com`,
  `dashboard` at `https://dash-staging.lumina-events.com`, and `admin` at
  `https://admin-staging.lumina-events.com` (confirmed 2026-09-17).
- Cloudflare Workers is the hosting product because all three TanStack Start apps use
  SSR; static-only Cloudflare Pages is not suitable.
- Use one Cloudflare account and three staging Workers. Production will be planned as
  a separate follow-up.
- Publish after successful CI for a push to the `staging` branch. Include all three
  frontends in this iteration.
- The API uses its native Cloud Run service URL, not a custom API domain (confirmed
  2026-09-17).
