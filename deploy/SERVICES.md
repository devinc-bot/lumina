# Lumina service inventory

External platforms and managed services used by the monorepo. Target topology for
**staging / production**: Nest API on Google Cloud Run; `web`, `dashboard`, and `admin` on
**Cloudflare**. Local development still runs the apps on the laptop (`pnpm dev`).

## Application hosting

| Service / surface                  | Provider                  | Role                                                      | Environments                                       | Notes                                                   |
| ---------------------------------- | ------------------------- | --------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Nest API (`apps/api`)              | Google Cloud Run          | Public HTTP API, webhooks, health, internal jobs endpoint | Staging + production (separate Cloud Run services) | Scale-to-zero; see [`CLOUD_RUN.md`](./CLOUD_RUN.md)     |
| API migrator                       | Google Cloud Run **Jobs** | One-shot Drizzle migrations                               | Per environment                                    | Uses `DATABASE_MIGRATION_URL` only; not the API service |
| Public web (`apps/web`)            | Cloudflare                | Attendee-facing site                                      | Staging + production                               | Feature **046**; not Cloud Run                          |
| Owner dashboard (`apps/dashboard`) | Cloudflare                | Owner / staff panel                                       | Staging + production                               | Feature **046**                                         |
| Admin (`apps/admin`)               | Cloudflare                | Provisioned-admin ops UI                                  | Staging + production                               | Feature **046**                                         |

## Data and storage

| Service        | Provider      | Role                                           | Notes                                                                                                    |
| -------------- | ------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| PostgreSQL     | Neon          | Primary database                               | Separate DB per environment; pooled `DATABASE_URL` for API, direct `DATABASE_MIGRATION_URL` for migrator |
| Object storage | Cloudflare R2 | Uploads (avatars, event/location images, etc.) | Via API `files` module; `R2_*` runtime vars                                                              |

## Messaging and identity

| Service                | Provider                        | Role                                        | Notes                                                  |
| ---------------------- | ------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Transactional email    | Amazon SES (v2)                 | Registration, password reset, invites, etc. | Prefer `sa-east-1`; keys optional if default AWS chain |
| OAuth (Google Sign-In) | Google Cloud / Google Identity  | Social login for users/owners               | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on API     |
| Job auth (OIDC)        | Google (Cloud Scheduler SA JWT) | Authorize `POST /api/internal/jobs/run`     | Nest verifies issuer, audience, allowlisted SA email   |

## Payments

| Service             | Provider     | Role                                       | Notes                                |
| ------------------- | ------------ | ------------------------------------------ | ------------------------------------ |
| Checkout / webhooks | Mercado Pago | Ticket purchases and payment notifications | Access token + webhook secret on API |

## Google Cloud platform (API control plane)

| Service                            | Role                                       | Notes                                     |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------- |
| Artifact Registry                  | Store API + migrator container images      | Pushed by GitHub Actions                  |
| Secret Manager                     | API / migrator secrets at runtime          | Bound into Cloud Run; not GitHub          |
| Cloud Scheduler                    | Cron for internal jobs (~3×/month per env) | OIDC → Nest; cron `0 0 1,11,21 * *`       |
| IAM + Workload Identity Federation | GitHub Actions → GCP without SA JSON keys  | Separate deploy SA per GitHub Environment |
| Cloud Logging                      | API / Job logs                             | `gcloud run services logs read …`         |

## CI / source

| Service             | Provider | Role                                               | Notes                                                                                                                               |
| ------------------- | -------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Source + CI         | GitHub   | Repo, PR CI, API deploy workflow                   | Branches `staging` / `main`; workflow [`.github/workflows/deploy-api-cloud-run.yml`](../.github/workflows/deploy-api-cloud-run.yml) |
| GitHub Environments | GitHub   | Staging / production deploy config + prod approval | WIF secrets + Cloud Run name vars                                                                                                   |

## Local-only (not production hosting)

| Service                             | Role                                               |
| ----------------------------------- | -------------------------------------------------- |
| Local PostgreSQL (Compose / Docker) | Dev database when not using Neon locally           |
| `pnpm dev` app processes            | API :3000, web :3001, dashboard :3002, admin :3003 |

## Related docs

| Doc                                 | Content                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| [`CLOUD_RUN.md`](./CLOUD_RUN.md)    | API + migrator + Scheduler on GCP                                                  |
| [`OPERATIONS.md`](./OPERATIONS.md)  | Deploy index (Cloud Run API, Cloudflare frontends)                                 |
| [`env/README.md`](./env/README.md)  | Env contracts and secret classes                                                   |
| `apps/api/src/modules/jobs/JOBS.md` | Job catalog (Scheduler vs Nest crons)                                              |
| Feature **046**                     | Cloudflare frontends (spec under `spec/features/active/046-cloudflare-frontends/`) |
