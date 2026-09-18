# Deploy operations

Index for staging / production operations. This file does **not** host the API or frontends.

| Surface                                 | Where it runs                                    | Runbook                                                            |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Nest API (+ migrator, Scheduler jobs)   | Google Cloud Run                                 | [`CLOUD_RUN.md`](./CLOUD_RUN.md)                                   |
| Frontends (`web`, `dashboard`, `admin`) | Cloudflare                                       | Feature **046** — `spec/features/active/046-cloudflare-frontends/` |
| Provider inventory                      | —                                                | [`SERVICES.md`](./SERVICES.md)                                     |
| Env contracts / secrets classes         | Secret Manager (API); build inputs for frontends | [`env/README.md`](./env/README.md)                                 |

## Branch → environment (API)

| Git branch | GitHub Environment | Cloud Run                                              |
| ---------- | ------------------ | ------------------------------------------------------ |
| `staging`  | `staging`          | Staging API service                                    |
| `main`     | `production`       | Production API service (Environment approval required) |

Routine API releases: GitHub Actions workflow
[`.github/workflows/deploy-api-cloud-run.yml`](../.github/workflows/deploy-api-cloud-run.yml)
(WIF; no SA JSON in the repo). Bootstrap secrets, Scheduler, and first Cloud Run bindings once via
[`CLOUD_RUN.md`](./CLOUD_RUN.md).

## Neon

Staging and production use **separate** Neon databases. Prefer the Cloud Run migrator Job for schema
changes. Before destructive migrations, create or confirm a Neon recovery point. Rollbacks of
application images do not roll the database backward.

## Related

- Job catalog (Scheduler vs local Nest crons): `apps/api/src/modules/jobs/JOBS.md`
- Rate limits / CORS / mail SES checklist: [`env/README.md`](./env/README.md)
