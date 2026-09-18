# Cloudflare Workers Frontends

Staging deploys `web`, `dashboard`, and `admin` as the Workers
`lumina-web-staging`, `lumina-dashboard-staging`, and `lumina-admin-staging`.

## GitHub Environment

Configure the `staging` Environment with secret `CLOUDFLARE_API_TOKEN` and variables
`CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL`, and `VITE_SUPPORT_EMAIL`. Set
`VITE_DASHBOARD_URL=https://dash-staging.lumina-events.com`. `VITE_API_URL` is the
native Cloud Run service URL.

Create a scoped API token in the Cloudflare account that owns `lumina-events.com`: grant
**Account / Workers Scripts / Edit** and restrict it to that account. Add only the zone-level
permission Cloudflare requests when attaching the three custom hostnames; do not use the global
API key. Store the token only as `CLOUDFLARE_API_TOKEN` in the GitHub Environment.

## First deployment

The workflow creates or updates each Worker from its app-local `wrangler.jsonc`. Run it once from
the `staging` branch after `VITE_API_URL` is a healthy native Cloud Run URL. Then, in the
Cloudflare dashboard, attach the custom hostnames below to their named Workers. Cloudflare manages
the certificates when the zone is active in the account.

## Custom domains

Attach these Cloudflare-managed TLS hostnames after the first Worker deploy:

- `staging.lumina-events.com` → `lumina-web-staging`
- `dash-staging.lumina-events.com` → `lumina-dashboard-staging`
- `admin-staging.lumina-events.com` → `lumina-admin-staging`

The `Deploy Frontends` workflow runs after successful CI on `staging` and deploys the
verified SHA. Confirm each hostname loads, its assets resolve, and browser API calls to
`VITE_API_URL` do not fail CORS.

## Retry, cache, and rollback

Each frontend has an independent GitHub Actions job. Re-run only `deploy-web`,
`deploy-dashboard`, or `deploy-admin` from the failed workflow job. A Worker deployment publishes
new hashed assets; do not add broad cache rules for HTML or `/assets/*`. If a custom cache rule
causes stale content, purge that hostname's cache from Cloudflare after the deployment.

To roll back, re-run the corresponding deployment job for the last verified staging commit. Keep
the Cloud Run API URL unchanged unless that service was independently rolled back.
