# API on Google Cloud Run

Canonical runbook for the **Nest API (+ migrator)** on Google Cloud Run (scale-to-zero).

For the copy/paste PowerShell bootstrap sequence used for staging, see
[CLOUD_RUN_BOOTSTRAP.md](./CLOUD_RUN_BOOTSTRAP.md). It also documents how to review and safely
disable unused Google APIs.

**Topology:** one GCP project, two environments (staging + production). Each environment has its
own Cloud Run service, migrator Job, Cloud Scheduler job, Neon database, and Secret Manager
secrets.

**Branch mapping**

| Git branch | GitHub Environment | Cloud Run target |
| ---------- | ------------------ | ---------------- |
| `staging`  | `staging`          | Staging API      |
| `main`     | `production`       | Production API   |

Frontends (`web`, `dashboard`, `admin`) are **not** hosted on Cloud Run. They target
**Cloudflare** (feature **046**). See [`SERVICES.md`](./SERVICES.md) for the full provider
inventory and [`OPERATIONS.md`](./OPERATIONS.md) for the deploy index.

**Scheduler model (feature 042):** one Cloud Scheduler job **per environment** calls
`POST /api/internal/jobs/run` on cron `0 0 1,11,21 * *` (00:00 UTC on days 1, 11, and 21 —
about three times per month). That single request runs purchase-reservation expiry and all
hygiene cleanups. Abandoned checkout holds may linger until the next tick; that tradeoff is
intentional for free-tier / cost constraints. See `apps/api/src/modules/jobs/JOBS.md`.

This file is English-only. Prefer the GitHub Actions workflow for routine releases; keep the
manual `gcloud` / `docker` sections below as bootstrap and fallback. Deploy shell helpers live in
`deploy/scripts/cloud-run/`; the workflow orchestrates them and does not embed deploy logic inline.

## Suggested resource names (one project)

| Resource                          | Staging                            | Production                 |
| --------------------------------- | ---------------------------------- | -------------------------- |
| Cloud Run service                 | `lumina-api-staging`               | `lumina-api`               |
| Migrator Job                      | `lumina-api-migrator-staging`      | `lumina-api-migrator`      |
| Scheduler job                     | `lumina-internal-jobs-run-staging` | `lumina-internal-jobs-run` |
| Runtime SA (**required**)         | `lumina-api-runtime-staging@…`     | `lumina-api-runtime@…`     |
| Scheduler SA (**required**)       | `lumina-scheduler-staging@…`       | `lumina-scheduler@…`       |
| Deploy SA (**required** separate) | `lumina-api-deploy-staging@…`      | `lumina-api-deploy@…`      |

Prefer **per-environment runtime and scheduler service accounts** so IAM and OIDC allowlists stay
isolated. A shared runtime SA with per-environment Secret Manager secrets is acceptable if you
document which secrets bind to which service; still keep **separate scheduler SAs** so each
environment’s `INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS` stays narrow.

**Mandatory:** use a **separate deploy SA per GitHub Environment** (`GCP_SERVICE_ACCOUNT`). Do not
share one project-wide deploy SA across staging and production. Staging Environment variables can
be edited without production approval; a shared deploy SA with Cloud Run admin would let a staging
misconfiguration point `SERVICE_NAME` at the production service and bypass the production gate.
Scope each deploy SA (or WIF attribute conditions) so it can only update that environment’s
Cloud Run service and migrator Job names.

## Prerequisites

| Area        | Required state                                                                            |
| ----------- | ----------------------------------------------------------------------------------------- |
| GCP project | Billing enabled; APIs: Cloud Run, Artifact Registry, Cloud Scheduler, IAM, Secret Manager |
| Tools       | `gcloud`, Docker (Buildx), authenticated to the target project                            |
| Neon        | Pooled `DATABASE_URL` for the API; direct `DATABASE_MIGRATION_URL` for the migrator only  |
| Images      | Built from `apps/api/Dockerfile` targets `runtime` (API) and `migrator`                   |
| GitHub      | Environments `staging` and `production` (production requires manual approval reviewers)   |

## GitHub Actions overview

Workflow: [`.github/workflows/deploy-api-cloud-run.yml`](../.github/workflows/deploy-api-cloud-run.yml).

| Trigger                                        | Behavior                                                       |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Successful manually dispatched CI on `staging` | Deploy CI's verified commit to GitHub Environment `staging`    |
| Successful manually dispatched CI on `main`    | Deploy CI's verified commit to GitHub Environment `production` |

`workflow_run` starts this workflow only after the named `CI` workflow (types, lint, format, unit,
and end-to-end checks) completes successfully on `staging` or `main`; it checks out and deploys
CI's `head_sha`, not the default-branch SHA. GitHub requires this workflow file on the default
branch before it can receive `workflow_run` events. Auth uses **Workload Identity Federation** via
`google-github-actions/auth` (no SA JSON keys in the repo). Its single `deploy` job uses
`environment:` so production can require reviewers.

Deploy order: build/push API + migrator images → update migrator Job → `execute --wait` →
`gcloud run deploy` API → database-readiness probe → Scheduler OIDC-target verification.

### Required GitHub Environment secrets

Configure these on **both** `staging` and `production` Environments (values differ per env):

| Secret                           | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `GCP_PROJECT_ID`                 | Target GCP project id                   |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full WIF provider resource name         |
| `GCP_SERVICE_ACCOUNT`            | Deploy SA email impersonated by Actions |

### Required GitHub Environment variables

| Variable                      | Purpose                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `GCP_REGION`                  | e.g. `southamerica-east1`                                                               |
| `AR_REPO`                     | Artifact Registry Docker repository id (e.g. `lumina`)                                  |
| `SERVICE_NAME`                | Cloud Run service (`lumina-api-staging` / `lumina-api`)                                 |
| `MIGRATOR_JOB_NAME`           | Migrator Job name                                                                       |
| `RUNTIME_SERVICE_ACCOUNT`     | Required Cloud Run service / Job runtime SA email                                       |
| `SCHEDULER_JOB_NAME`          | Required Cloud Scheduler job name                                                       |
| `SCHEDULER_SERVICE_ACCOUNT`   | Required Scheduler OIDC service-account email                                           |
| `INTERNAL_JOBS_OIDC_AUDIENCE` | Required HTTPS audience; exactly matches Scheduler and the runtime Secret Manager value |

### One-time GCP + GitHub setup (operator)

1. Enable APIs listed in Prerequisites; create Artifact Registry Docker repo `$AR_REPO`.
2. Create **per-env** runtime, scheduler, and **deploy** SAs; grant each runtime SA Secret Manager
   accessor only on that environment’s secrets. `RUNTIME_SERVICE_ACCOUNT` and
   `SCHEDULER_SERVICE_ACCOUNT` are mandatory GitHub Environment variables; the workflow rejects a
   missing value before authenticating to GCP.
3. Create a Workload Identity Pool + GitHub OIDC provider. Bind **each** deploy SA so only the
   matching GitHub Environment (or branch) can impersonate it. Prefer attribute conditions such as
   `assertion.environment == "staging"` / `"production"`. Grant each deploy SA permission to push
   to Artifact Registry and to deploy/update **only** that environment’s Cloud Run service and
   migrator Job, plus read access to only that environment’s Cloud Scheduler job so the workflow
   can verify its URI and OIDC configuration (avoid project-wide admin roles on a shared SA).
4. Create GitHub Environments `staging` and `production`. On `production`, require reviewers.
5. Set the Environment **secrets** and **variables** in the tables above
   (`GCP_SERVICE_ACCOUNT` = that env’s deploy SA).
6. Bootstrap each environment once with the manual sections below (including `--set-secrets` and
   Scheduler). Set `API_PUBLIC_URL` and `INTERNAL_JOBS_OIDC_AUDIENCE` to the native Cloud Run
   service URL in both GitHub Environment variables and the runtime Secret Manager value. After
   that, CI mainly updates images and re-runs the migrator while verifying the Scheduler URI,
   audience, and SA.

### Secrets on subsequent deploys

Apply full Secret Manager bindings **once** with `--set-secrets` during bootstrap (or when adding
a new secret). Routine CI runs `gcloud run deploy` / `gcloud run jobs deploy` with a new `--image`
and non-secret env updates **without** `--set-secrets` / `--clear-secrets`. Omitting those flags
keeps existing secret env bindings on the service or Job. Prefer `--update-env-vars` in CI so
other plain env vars are not wiped. If you pass `--set-secrets` or `--set-env-vars`, you replace
the whole secrets or plain-env set respectively—avoid that in CI unless intentional.

## Manual fallback: parameterized env vars

Export either staging or production names, then run the sections below.

**Staging example**

```bash
export PROJECT_ID=your-gcp-project
export REGION=southamerica-east1
export AR_REPO=lumina
export SERVICE_NAME=lumina-api-staging
export MIGRATOR_JOB_NAME=lumina-api-migrator-staging
export SCHEDULER_JOB_NAME=lumina-internal-jobs-run-staging
export RUNTIME_SA=lumina-api-runtime-staging@${PROJECT_ID}.iam.gserviceaccount.com
export SCHEDULER_SA=lumina-scheduler-staging@${PROJECT_ID}.iam.gserviceaccount.com
export API_IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/api:$(git rev-parse --short HEAD)
export MIGRATOR_IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/migrator:$(git rev-parse --short HEAD)
```

**Production example**

```bash
export PROJECT_ID=your-gcp-project
export REGION=southamerica-east1
export AR_REPO=lumina
export SERVICE_NAME=lumina-api
export MIGRATOR_JOB_NAME=lumina-api-migrator
export SCHEDULER_JOB_NAME=lumina-internal-jobs-run
export RUNTIME_SA=lumina-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com
export SCHEDULER_SA=lumina-scheduler@${PROJECT_ID}.iam.gserviceaccount.com
export API_IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/api:$(git rev-parse --short HEAD)
export MIGRATOR_IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/migrator:$(git rev-parse --short HEAD)
```

## 1–2) Build and push

From the repository root:

```bash
gcloud artifacts repositories describe "$AR_REPO" \
  --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" --project="$PROJECT_ID"

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

docker build -f apps/api/Dockerfile --target runtime -t "$API_IMAGE" .
docker build -f apps/api/Dockerfile --target migrator -t "$MIGRATOR_IMAGE" .
docker push "$API_IMAGE"
docker push "$MIGRATOR_IMAGE"
```

## 3) Migrator Job (before API traffic)

Always migrate **before** sending traffic to a revision that needs schema changes.
Do not put `DATABASE_MIGRATION_URL` on the API service.

```bash
gcloud run jobs deploy "$MIGRATOR_JOB_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$MIGRATOR_IMAGE" \
  --service-account="$RUNTIME_SA" \
  --max-retries=0 \
  --task-timeout=900s \
  --set-secrets='DATABASE_MIGRATION_URL=…:latest'

gcloud run jobs execute "$MIGRATOR_JOB_NAME" \
  --project="$PROJECT_ID" --region="$REGION" --wait
```

On later image-only updates, omit `--set-secrets` so the existing binding is preserved.

## 4) Deploy Cloud Run (API)

- Allow unauthenticated invocation for product HTTP (browsers, Mercado Pago, health).
- Job routes are protected in Nest with Google OIDC (not whole-service Cloud Run IAM).
- `min-instances=0` (scale-to-zero).
- Prefer `--timeout=320s` (or higher) so it matches the Scheduler attempt deadline below.

```bash
gcloud run deploy "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$API_IMAGE" \
  --service-account="$RUNTIME_SA" \
  --allow-unauthenticated \
  --min-instances=0 \
  --port=3000 \
  --timeout=320s \
  --set-env-vars='NODE_ENV=production,ENABLE_IN_PROCESS_SCHEDULERS=false,DATABASE_POOL_MAX=10' \
  --set-secrets='DATABASE_URL=…:latest,JWT_SECRET=…:latest,INTERNAL_JOBS_OIDC_AUDIENCE=…:latest,INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS=…:latest'
  # Add the rest of the runtime contract from deploy/env/*.runtime.env.example
```

```bash
export SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')
```

Use the native `SERVICE_URL` as `API_PUBLIC_URL` and `INTERNAL_JOBS_OIDC_AUDIENCE`. Cloud Scheduler
calls the same native URL, and its OIDC token audience must exactly match the GitHub Environment
variable and runtime Secret Manager binding. If the service is recreated and its URL changes,
update all three values together before scheduling calls or deploying frontends.

Order for a full release: build/push → **migrate** → deploy/revise API → confirm Scheduler URI.

## 5) Env + Secret Manager

Same contract as `deploy/env/<environment>.runtime.env.example`. Prefer Secret Manager for
secrets. Cloud Run–specific vars:

| Variable                                      | Notes                                                    |
| --------------------------------------------- | -------------------------------------------------------- |
| `INTERNAL_JOBS_OIDC_AUDIENCE`                 | Native Cloud Run URL; must exactly match Scheduler       |
| `INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS` | Scheduler SA email(s) for **this** environment           |
| `ENABLE_IN_PROCESS_SCHEDULERS`                | `false` on Cloud Run                                     |
| `DATABASE_POOL_MAX`                           | Per-instance pool cap (default `10`); keep low with Neon |

Production rejects empty OIDC audience / allowlist at API startup. Keep staging and production
secret ids distinct even though they share one GCP project.

## 6) IAM

```bash
# Staging (example)
gcloud iam service-accounts create lumina-api-runtime-staging --project="$PROJECT_ID" || true
gcloud iam service-accounts create lumina-scheduler-staging --project="$PROJECT_ID" || true

# Production (example)
gcloud iam service-accounts create lumina-api-runtime --project="$PROJECT_ID" || true
gcloud iam service-accounts create lumina-scheduler --project="$PROJECT_ID" || true
```

1. **Runtime SA**: Cloud Run service / migrator job identity; grant Secret Manager accessor as needed.
2. **Scheduler SA**: mints OIDC tokens for internal jobs (per environment).
3. Do **not** require Cloud Run invoker IAM on the whole service for this iteration.
4. Nest verifies issuer (Google), audience, and allowlisted email (`email_verified`).
5. For manual probes, grant yourself `roles/iam.serviceAccountTokenCreator` on `SCHEDULER_SA`.

## 7) One Cloud Scheduler job per environment

Create or update the job for the environment whose `SERVICE_URL` / `SCHEDULER_*` you exported.
Set `INTERNAL_JOBS_OIDC_AUDIENCE` to that native service URL and persist that exact value in the
runtime Secret Manager binding before creating the job:

```bash
URI="${SERVICE_URL%/}/api/internal/jobs/run"
SCHEDULE='0 0 1,11,21 * *'

if gcloud scheduler jobs describe "$SCHEDULER_JOB_NAME" \
  --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$SCHEDULER_JOB_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --schedule="$SCHEDULE" \
    --time-zone=UTC \
    --uri="$URI" \
    --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SA" \
    --oidc-token-audience="$INTERNAL_JOBS_OIDC_AUDIENCE" \
    --attempt-deadline=320s
else
  gcloud scheduler jobs create http "$SCHEDULER_JOB_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --schedule="$SCHEDULE" \
    --time-zone=UTC \
    --uri="$URI" \
    --http-method=POST \
    --oidc-service-account-email="$SCHEDULER_SA" \
    --oidc-token-audience="$INTERNAL_JOBS_OIDC_AUDIENCE" \
    --attempt-deadline=320s
fi
```

Repeat with production exports so both environments have a Scheduler job.

## 8) Manual probe

```bash
TOKEN=$(gcloud auth print-identity-token \
  --impersonate-service-account="$SCHEDULER_SA" \
  --include-email \
  --audiences="$INTERNAL_JOBS_OIDC_AUDIENCE")

curl -sS -X POST "${SERVICE_URL%/}/api/internal/jobs/run" \
  -H "Authorization: Bearer ${TOKEN}"
```

Local DX: leave both `INTERNAL_JOBS_OIDC_*` empty and
`curl -X POST http://localhost:3000/api/internal/jobs/run`. See `JOBS.md`.

## 9) Logs

```bash
gcloud run services logs read "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" --limit=50
```

Look for `job=run step=... status=completed duration_ms=...`.

## 10) Rollback revision

```bash
gcloud run revisions list --service="$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID"
gcloud run services update-traffic "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" \
  --to-revisions=REVISION_NAME=100
```

## 11) Inventory tradeoff

Reservation expiry runs only with the ~10-day Scheduler job. Re-run the manual probe in §8
during incidents if stock must be released immediately.
