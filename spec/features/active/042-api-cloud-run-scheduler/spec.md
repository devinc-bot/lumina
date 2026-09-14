# Spec 042 - API Cloud Run and Scheduler Jobs

## Context and Objective

Prepare the NestJS API to run on Google Cloud Run with scale-to-zero, while moving
in-process Nest `@Cron` / `@Interval` work that must survive idle periods onto a
single HTTP job endpoint invoked by Google Cloud Scheduler. Operators need a secure,
idempotent job surface, health/readiness probes, safe database pooling under
multi-instance scale-out, English operational documentation, and **GitHub Actions**
that deploy the API to Cloud Run from the `staging` and `main` branches.

**Cost constraint (confirmed):** each environment uses **one** Cloud Scheduler job that
runs about **three times per month** (days 1, 11, and 21) so Scheduler stays within
the free-tier job budget and Cloud Run cold starts stay rare. All former Nest jobs
(including purchase-reservation expiry) run in that single invocation.

**Target topology (confirmed 2026-09-11):** one GCP project; two Cloud Run API
services (`staging` + `production`) with separate secrets/SAs/Scheduler jobs per
environment; deploys from git branches `staging` → staging service and `main` →
production service. Staging/production **API** leaves the VPS; frontends move to
Cloudflare under a **separate** feature (046), not this iteration’s apply scope.

## Users / Actors

- Platform operators deploying and operating the API on GCP.
- Cloud Scheduler (service account) invoking the internal job endpoint.
- Existing API clients (`web`, `dashboard`, `admin`, Mercado Pago webhooks) — unchanged
  contracts except that production jobs no longer depend on a permanently awake Nest process.
- GitHub Actions (OIDC to GCP) building and deploying API/migrator images.

## User Stories

- H1: As an operator, I want the API container to run correctly on Cloud Run so that
  instances can scale to zero and restart without orphaned connections.
- H2: As an operator, I want all scheduled hygiene and reservation-expiry work to run
  via one Cloud Scheduler invocation so that work continues under scale-to-zero without
  exceeding free-tier Scheduler usage.
- H3: As an operator, I want the internal job endpoint protected with Google identity
  (OIDC) so that anonymous internet callers cannot trigger inventory or cleanup work.
- H4: As a developer, I want local `pnpm dev` and a manual job HTTP trigger so that I can
  exercise the same job code path without Cloud Scheduler.
- H5: As an operator, I want migrations to remain a separate one-shot step so that
  concurrent Cloud Run instances never race on schema changes.
- H6: As an operator, I want pushes to `staging` / `main` to deploy the matching Cloud Run
  API environment so that branch promotion matches the runtime topology.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN the API process starts, THE SYSTEM SHALL listen on `0.0.0.0` using
  `process.env.PORT` (validated configuration; local default remains 3000).
- RF-2: WHEN the process receives SIGTERM/SIGINT, THE SYSTEM SHALL shut down Nest
  gracefully and close the PostgreSQL pool (existing shutdown hooks retained or extended
  only if gaps are found).
- RF-3: THE SYSTEM SHALL expose `GET /api/health/` (liveness) and `GET /api/health/ready`
  (readiness including a cheap database connectivity check) without requiring job auth.
- RF-4: WHEN Cloud Scheduler (or a local operator) sends an authorized `POST` to the
  single internal scheduled-jobs route, THE SYSTEM SHALL run the full aggregated job
  pipeline and return HTTP 2xx only if every step succeeds, or an appropriate error on
  failure, with structured logs including job name, step name, status, and duration.
- RF-5: THE SYSTEM SHALL expose exactly one Cloud Scheduler–facing internal job endpoint
  that, in one request and in a fixed order, runs: purchase reservation expiry; stale
  pending-order cleanup; API error retention cleanup; user registration token cleanup;
  owner registration token cleanup; password reset token cleanup; account session
  cleanup; and staff invitations cleanup. Domain outbox publish remains out of scope
  (removed in feature 043). Individual Nest `@Cron` / `@Interval` wrappers MAY remain
  for local development only.
- RF-6: WHILE `NODE_ENV=production` (or an explicit disable flag), THE SYSTEM SHALL NOT
  rely on Nest `@Cron` / `@Interval` for the migrated jobs so scale-to-zero cannot skip
  them. Local development MAY keep in-process schedulers and/or call the same HTTP
  endpoint manually.
- RF-7: WHEN an unauthorized caller invokes the internal job route, THE SYSTEM SHALL
  reject the request (401/403) without running the job. Production job auth SHALL use
  Google OIDC (Cloud Scheduler service-account JWT verified in Nest: issuer, audience,
  and allowlisted SA email). Cloud Run SHALL remain publicly invokable for product
  routes, webhooks, and health; IAM “require authentication” on the whole service is
  not used for this iteration.
- RF-8: WHEN Scheduler retries or concurrent instances invoke the aggregated job, THE
  SYSTEM SHALL remain safe for ticket inventory on the expiry step (reuse existing
  transactional `releaseReservationOnce` semantics; add claim/`SKIP LOCKED` only if
  required by observed races). Cleanup steps SHALL remain idempotent.
- RF-9: THE SYSTEM SHALL validate required runtime configuration at startup via the
  existing Zod env schema (extended only for new job-auth / pool settings).
- RF-10: THE SYSTEM SHALL document a Cloud Run deployment path for the API and migrator
  images. Docs SHALL describe **two** environments in **one** GCP project (staging +
  production services, secrets, SAs, and **one Scheduler job each** with cron
  `0 0 1,11,21 * *`). Docs SHALL map git branch `staging` → staging service and
  `main` → production service.
- RF-11: WHEN the pool configuration is set for Cloud Run, THE SYSTEM SHALL allow
  operators to cap PostgreSQL connections per instance via environment configuration so
  horizontal scale-out does not exhaust Neon.
- RF-12: WHEN code is pushed to `staging` or `main`, THE SYSTEM SHALL provide a GitHub
  Actions workflow that builds/pushes API (+ migrator) images to Artifact Registry and
  deploys the matching Cloud Run service (after migrator when schema changes require it),
  authenticating to GCP without committing long-lived service-account JSON keys to the
  repository (prefer Workload Identity Federation).

## Non-Functional Requirements

- Security: no secrets in images or Git; no long-lived GCP SA JSON in the repo; prefer
  Google OIDC for Scheduler → API job routes and GitHub → GCP; separate staging vs
  production secrets/SAs even inside one GCP project.
- Compatibility: local `pnpm dev` / `pnpm dev:api` continues to work. Feature 029 VPS
  Compose remains documentation for any residual VPS ops until frontends move (046);
  staging/production **API** path is Cloud Run + Actions, not Compose API.
- Observability: Nest `Logger` with structured job fields; no new logging library unless
  a clear Cloud Run gap appears.
- Performance: the aggregated HTTP handler must finish within Cloud Run request
  timeouts; purchase expiry batch size stays bounded (100).
- Cost: one Scheduler job definition **per environment**; ~three executions per month
  each.
- Tests: high importance for Nest job/OIDC behavior (already delivered). Workflow YAML
  is low automated-test importance (lint/docs review + manual dry-run).

## Edge Cases

- Duplicate Scheduler deliveries on the same calendar day.
- Abandoned checkout reservations may remain `active` until the next scheduled run
  (up to ~10 days) — accepted tradeoff for free-tier cadence (option A).
- Cold start: Scheduler hit may pay cold-start latency; jobs must tolerate it.
- Migration job must not run inside every Cloud Run instance boot.
- In-memory rate-limit counters remain per-instance (already true on VPS replicas).
- If one step fails mid-pipeline, later steps do not run; Scheduler retry re-runs the
  full pipeline (idempotent steps).
- Accidental deploy of `main` credentials to the staging service — mitigate with
  distinct GitHub Environments and distinct Cloud Run service names / secret ids.

## Out of Scope

- Migrating `web`, `dashboard`, or `admin` to Cloudflare (feature **046**).
- Replacing or deleting all of feature 029 VPS Compose/Caddy/GHCR in this iteration
  (document API departure; frontend cutover is 046).
- Introducing Terraform/Pulumi.
- Pub/Sub / Cloud Tasks workers (propose later only if a job exceeds HTTP timeout).
- Changing Mercado Pago webhook contracts or checkout business rules beyond expiry
  scheduling transport.
- Lazy/on-request reservation expiry (option B) — deferred unless operators reopen.
- More frequent purchase-expiry Scheduler cadence (option C) — deferred.
- Realtime/SSE/outbox (removed in feature 043).
- Two separate GCP projects (rejected in favor of one project / two services).

## Definition of Done

- Acceptance criteria above are implemented and covered by focused API tests where
  applicable (RF-1–RF-11 Nest/docs already largely done; RF-12 Actions + dual-env docs).
- The single internal job endpoint runs the full pipeline; Cloud Run does not depend on
  Nest in-process crons for those jobs.
- English ops doc covers dual-env naming, branch mapping, build, Artifact Registry,
  Cloud Run, secrets, IAM, **one Scheduler job per environment**, Actions, manual
  probe, logs, rollback, migrator-before-traffic, and the inventory-hold tradeoff.
- GitHub Actions deploys staging/production API without SA JSON in git.
- Feature review complete for this phase.

## Open Questions

- None remaining for Phase 2 apply (defaults locked below).

### Resolved decisions

- **Job authentication (B):** Public Cloud Run service + Nest OIDC guard on
  `/api/internal/jobs/*`. Confirmed for apply. A private second “jobs-only” Cloud Run
  service remains out of scope unless operators later prefer IAM-only isolation.
- **Scheduler consolidation (option A, confirmed 2026-09-11):** Prefer **one** Cloud
  Scheduler job and **one** HTTP endpoint that runs purchase-reservation expiry plus all
  hygiene cleanups together. Cadence: `0 0 1,11,21 * *` (~every 10 days / 3× month) to
  stay within free-tier constraints. Operators accept that abandoned reservation holds
  may persist until the next run. **Per environment** (staging and production each get
  their own Scheduler job targeting that environment’s service URL).
- **Cloud Run `min-instances` for SSE:** Superseded by 043 — SSE/outbox removed;
  `min-instances` for sticky streams is not applicable. Default scale-to-zero (`0`).
- **Outbox publisher strategy:** Superseded by 043 — realtime outbox publisher removed;
  no Scheduler job for domain outbox.
- **Ops delivery (confirmed 2026-09-11):** Phase 1 = doc + inline `gcloud`/`docker` (no
  `cloud-run-*.sh`). Phase 2 = **docs + GitHub Actions** (option B) for branch deploys.
- **GCP topology (confirmed 2026-09-11):** **One GCP project**, two Cloud Run services +
  two Scheduler jobs; separate staging vs production credentials (secrets / SAs /
  GitHub Environment secrets), not two GCP projects.
- **API vs frontends (confirmed 2026-09-11):** Staging/production API on Cloud Run;
  frontends on **Cloudflare** (feature 046). VPS is not the long-term frontend host.
- **RF-12 trigger (updated 2026-09-12):** On **push** to `staging` / `main` with
  API-related **path filters**, a single deploy job runs (WIF secrets + Environment vars).
  Also allow `workflow_dispatch`. Full monorepo `ci.yml` stays separate (not a deploy gate).
- **Production approval (assumed 2026-09-12):** **Yes** — GitHub Environment `production`
  must require manual reviewers before the production deploy job. Staging Environment has
  no required reviewers.
