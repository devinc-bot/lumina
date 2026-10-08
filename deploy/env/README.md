# Deployment Environment Contracts

Each environment has two separate configuration files:

- `<environment>.runtime.env.example` is runtime-only configuration for the API. Copy it to a
  restricted file on the matching host and replace every `REPLACE_*` marker with the environment's
  actual value.
- `<environment>.migrator.env.example` contains only `DATABASE_MIGRATION_URL` for the one-shot
  migration job. It must not be provided to the API container.
- `<environment>.vps.env.example` is a legacy Compose host pin file (optional / historical). Staging
  and production hosting is Cloud Run (API) + Cloudflare (frontends).
- `<environment>.build.env.example` contains public frontend build inputs. Supply it only while
  building the `web`, `dashboard`, and `admin` apps. These values are embedded in frontend output
  and must never contain credentials.

Never commit populated files. For the **API** on Cloud Run (staging/production), the runtime
contract is satisfied via Secret Manager — see [`../CLOUD_RUN.md`](../CLOUD_RUN.md). Frontends
target Cloudflare (feature **046**); see [`../OPERATIONS.md`](../OPERATIONS.md) and
[`../SERVICES.md`](../SERVICES.md).

`DATABASE_URL` is the pooled URL used by the API at runtime. `DATABASE_MIGRATION_URL` is the direct
database URL used only by the migration job. In development both URLs point to the local PostgreSQL
service. Staging and production must use separate Neon databases.

Staging runs with `NODE_ENV=production` because it executes production artifacts. Its provider
credentials, domains, and database URLs remain distinct from production.

## Required Build Inputs

Every frontend requires `VITE_API_URL`. The `web` application also requires `VITE_DASHBOARD_URL`.
Both `web` and `dashboard` require `VITE_SUPPORT_EMAIL`. The examples contain the exact variable
names expected by each app's environment validation. Configure those values as GitHub Environment
variables for the `staging` and `production` environments when building frontend images for an
environment. They are public build inputs, not GitHub secrets.

For local frontend development, copy the root `.env.local.example` to `.env.local` and set the
values once for all three apps. The Vite configs load this workspace-root file; `VITE_API_URL` is
shared by `web`, `dashboard`, and `admin`. `VITE_DASHBOARD_URL` and `VITE_SUPPORT_EMAIL` are only
used by the apps that require them. Keep `.env.local` local and use it only for frontend
configuration; API credentials belong in the API's own runtime configuration. Set an optional
`SERVER_API_URL` override directly in the server process environment.

## Runtime Secrets

The following runtime values are secrets and must not be supplied as Docker build arguments:

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `AWS_ACCESS_KEY_ID` (when set; must be paired with `AWS_SECRET_ACCESS_KEY`)
- `AWS_SECRET_ACCESS_KEY` (when set; must be paired with `AWS_ACCESS_KEY_ID`)
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_MARKETPLACE_CLIENT_SECRET`
- `MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Leave both AWS key variables empty to use the AWS default credential provider chain (for example an
IAM role). When either key is set, both must be set together.

`GOOGLE_CLIENT_ID`, `AWS_REGION`, `MAIL_DOMAIN`, `MAIL_REPLY_TO`, `R2_ACCOUNT_ID`, `R2_BUCKET`, and
public URLs are not credentials, but they remain runtime configuration because the API validates and
uses them. `MAIL_DOMAIN` produces `no-reply@<domain>` for automated mail and
`support@<domain>` for support mail. `MAIL_REPLY_TO` is optional for no-reply-only deployments and
is required only for support mail; it routes support replies to the configured inbox and is not SES
inbound receiving. Replace `MAIL_FROM` with `MAIL_DOMAIN` together in local and deployed runtime
configuration; there is no fallback to `MAIL_FROM`.

`CORS_ALLOWED_ORIGINS` is optional. The API always allows `WEB_URL`, `DASHBOARD_URL`, and `ADMIN_URL`;
set this variable as a comma-separated list only when additional origins are required.

`RATE_LIMIT_*_LIMIT` and `RATE_LIMIT_*_TTL_MS` pairs are optional runtime configuration, not secrets.
Each omitted pair uses the API schema default. Counters are per API process until shared storage
exists; keep edge rate limiting on Caddy, the CDN, or a WAF for cluster-wide protection.

## Internal jobs / Cloud Run (feature 042)

## Mercado Pago marketplace

`MERCADOPAGO_MARKETPLACE_ENABLED` is a rollout flag. Keep it `false` until the marketplace
application, OAuth callback, webhook signature, and separate seller/buyer sandbox flow have been
validated. For Cloud Run, `MERCADOPAGO_MARKETPLACE_ENABLED`,
`MERCADOPAGO_MARKETPLACE_CLIENT_ID`, `MERCADOPAGO_OAUTH_REDIRECT_URI`, and
`MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY_VERSION` are GitHub Environment variables passed directly
to Cloud Run. The client secret and encryption key are bound from Secret Manager. Seller
access/refresh tokens are persisted encrypted and must never be configured as environment
variables. Each owner records their Mercado Pago settlement option in Lumina so quotes can estimate
the provider fee. See
[`docs/mercado-pago-marketplace-runbook.md`](../../docs/mercado-pago-marketplace-runbook.md).

These runtime variables configure Nest in-process schedulers and the Cloud Scheduler OIDC surface.
They belong in API runtime files (and Secret Manager on Cloud Run), not in frontend build env.

| Variable                                      | Notes                                                                                                                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_JOBS_OIDC_AUDIENCE`                 | Expected Google OIDC JWT audience. When Cloud Scheduler targets the native Cloud Run URL, use that exact native URL here and in Cloud Scheduler. Empty only for local DX; required non-empty in production. |
| `INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS` | Comma-separated Scheduler SA emails allowed to call `POST /api/internal/jobs/run`. Empty only for local DX; required in production.                                                                         |
| `ENABLE_IN_PROCESS_SCHEDULERS`                | `true`/`false` (default `false`). Use `true` only for local Nest cron DX — keep `false` on Cloud Run.                                                                                                       |
| `DATABASE_POOL_MAX`                           | Per-process `pg` pool max (default `10`). Keep low under Cloud Run scale-out with Neon.                                                                                                                     |

Canonical API staging/production runbook: [`../CLOUD_RUN.md`](../CLOUD_RUN.md) (Cloud Run + Actions).
Deploy index and frontend target (Cloudflare): [`../OPERATIONS.md`](../OPERATIONS.md),
[`../SERVICES.md`](../SERVICES.md).

## Amazon SES (transactional mail)

1. In the SES console (`sa-east-1`), verify `MAIL_DOMAIN` so SES can send from both
   `no-reply@<domain>` and `support@<domain>`.
2. Until production access is approved, verify each smoke/test recipient (or remain in the SES sandbox).
3. Prefer an IAM task/instance role in deployed environments; use explicit AWS keys only for
   local/dev when needed (both empty = default credential chain; both set together).
4. Provision and monitor the inbox in `MAIL_REPLY_TO` before sending support mail. A mailbox for
   `support@<domain>` is unnecessary for replies routed with Reply-To, but direct mail to that
   address needs separate receiving configuration.
5. Configure receiving infrastructure to reject or discard messages sent to `no-reply@<domain>` if
   those replies are unattended; the sender header alone cannot prevent replies.
6. After env is set, run `pnpm --filter @repo/api mail:smoke` in development.

## Local Compose (optional)

`docker-compose.yml` may still be used for local stacks. Staging/production API deploy and rollback
live in [`../CLOUD_RUN.md`](../CLOUD_RUN.md). Frontend hosting is Cloudflare (feature **046**).
