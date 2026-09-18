# Spec 046 - Cloudflare Frontends

## Context and Objective

Move `web`, `dashboard`, and `admin` off the VPS Compose path (feature 029) onto
Cloudflare so staging/production frontends are served at the edge while the Nest API
runs on Cloud Run (feature 042). This feature owns frontend hosting, build/publish,
DNS/TLS at Cloudflare, and env wiring (`VITE_*` → Cloud Run API URLs). It does not
re-implement the API Cloud Run control plane.

## Users / Actors

- Platform operators publishing frontend apps.
- End users of `web`, `dashboard`, and `admin`.

## User Stories

- H1: As an operator, I want frontends deployed to Cloudflare from the same branch
  model (`staging` / `main`) so that promotion matches the API topology.
- H2: As an operator, I want staging and production frontend configs to point at the
  matching Cloud Run API URLs so clients never mix environments.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a staging or production frontend release is published, THE SYSTEM SHALL
  serve `web`, `dashboard`, and `admin` from Cloudflare (exact product — Pages,
  Workers static assets, or equivalent — chosen in Open Questions).
- RF-2: THE SYSTEM SHALL build frontends with environment-specific public API/base
  URLs for staging vs production.
- RF-3: THE SYSTEM SHALL document DNS/TLS and the retire path for VPS Caddy frontend
  hosts once cutover is complete.

## Non-Functional Requirements

- No secrets in frontend bundles beyond intentional public `VITE_*` values.
- Prefer GitHub Actions aligned with 042 branch model.
- English ops docs under `deploy/`.

## Edge Cases

- Partial cutover (one app on Cloudflare, others still on VPS) during migration.
- Cache invalidation after deploy.

## Out of Scope

- Nest API / Cloud Scheduler / OIDC jobs (042).
- Rewriting product UI.
- Terraform unless separately approved.

## Definition of Done

- Spec/plan/tasks approved; frontends live on Cloudflare for staging and production;
  VPS frontend path documented as retired or removed; verification recorded.

## Open Questions

- [NEEDS CLARIFICATION] Cloudflare product: **Pages**, **Workers + assets**, or other?
- [NEEDS CLARIFICATION] One Cloudflare account/project with staging+prod, or separate?
- [NEEDS CLARIFICATION] Deploy trigger: push to `staging`/`main`, or manual dispatch?
- [NEEDS CLARIFICATION] Keep `admin` on Cloudflare in the same iteration as `web` /
  `dashboard`?
- [NEEDS CLARIFICATION] Decommission timeline for feature 029 VPS frontend Compose
  services after cutover?

### Resolved decisions

- Target host for staging/production frontends: **Cloudflare** (confirmed 2026-09-11
  with 042 Phase 2 decisions). API remains on Cloud Run.
