# Plan 046 - Cloudflare Frontends

## Technical Approach

Deploy the three TanStack Start SSR applications as independent Cloudflare Workers:
`lumina-web-staging`, `lumina-dashboard-staging`, and `lumina-admin-staging`. Each app
will use `@cloudflare/vite-plugin` before `tanstackStart()` and an app-local Wrangler
configuration with Node.js compatibility and `@tanstack/react-start/server-entry` as the
Worker entry. This preserves SSR; Cloudflare Pages static hosting is not suitable.

The existing Dockerfiles and `deploy/tanstack-start-server.mjs` are not part of this
staging task. Workers build from the workspace source, using only intentional public
`VITE_*` environment variables supplied by the GitHub `staging` Environment.

## Architecture Decisions

| Decision       | Choice                                                                                          | Rationale                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Hosting unit   | One Worker per app                                                                              | Independent domains, failures, and re-runs; no cross-app routing layer.        |
| SSR runtime    | TanStack Start Cloudflare Vite integration                                                      | Keeps current server rendering rather than converting the apps to static SPAs. |
| Deploy trigger | `workflow_run` after successful manually dispatched `CI` on `staging`                           | Deploys the exact verified `head_sha`, matching the API workflow.              |
| Credentials    | GitHub `staging` Environment secret `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID` | Keeps Cloudflare credentials out of the repository and production scope.       |
| Public config  | GitHub `staging` Environment variables                                                          | `VITE_*` values are compiled into client output and must contain no secrets.   |

## Deployment Flow

```text
manual CI run on staging -> CI succeeds -> Deploy Frontends workflow
  -> checkout CI head_sha -> install frozen lockfile
  -> deploy web Worker -> deploy dashboard Worker -> deploy admin Worker
  -> Cloudflare custom hostnames/TLS -> browser -> Cloud Run API
```

The workflow uses separate jobs or a matrix so a failed app can be re-run independently.
Its `concurrency` group is staging-specific and does not cancel an active deploy. It
receives `VITE_API_URL` from the native staging Cloud Run service URL stored in the
GitHub `staging` Environment; `web` additionally receives
`VITE_DASHBOARD_URL=https://dash-staging.lumina-events.com`. `VITE_SUPPORT_EMAIL` is
required by `web` and `dashboard`.

Before enabling the workflow, update the Cloud Run staging runtime configuration from
`DASHBOARD_URL=https://dashboard-staging.lumina-events.com` to
`DASHBOARD_URL=https://dash-staging.lumina-events.com`. The API derives its required
CORS allowlist from `WEB_URL`, `DASHBOARD_URL`, and `ADMIN_URL`; its URL validation must
allow those Cloudflare origins alongside the native Cloud Run API origin. Use the same native
service URL for `API_PUBLIC_URL`, OAuth/webhook
configuration, Scheduler OIDC audience, and `VITE_API_URL`; confirm it is healthy
before the frontend release.

## File Changes

| File                                                       | Action | Description                                                                                      |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `apps/{web,dashboard,admin}/package.json`                  | Modify | Add pinned Cloudflare build/deploy dependencies and deploy scripts.                              |
| `apps/{web,dashboard,admin}/vite.config.ts`                | Modify | Add the Cloudflare SSR Vite plugin.                                                              |
| `apps/{web,dashboard,admin}/wrangler.jsonc`                | Create | Name each staging Worker and configure compatibility, Node support, and Start entry.             |
| `pnpm-lock.yaml`                                           | Modify | Lock the new dependencies.                                                                       |
| `.github/workflows/deploy-frontends-cloudflare.yml`        | Create | Deploy the verified staging SHA with Environment-scoped configuration.                           |
| `deploy/CLOUDFLARE.md`                                     | Create | One-time account, DNS/TLS, secrets, deployment, and verification runbook.                        |
| `deploy/env/staging.build.env.example`                     | Modify | Record the staging public build origins.                                                         |
| `deploy/env/staging.runtime.env.example`                   | Modify | Record the native API and three Cloudflare frontend origins.                                     |
| `deploy/CLOUD_RUN_BOOTSTRAP.md` / `deploy/CLOUD_RUN.md`    | Modify | Align the dashboard origin and native Cloud Run API/OIDC, OAuth, and webhook URLs.               |
| `apps/api/src/config/env.schema.ts` / `env.schema.test.ts` | Modify | Permit Cloudflare frontend origins with the native Cloud Run API origin and cover that contract. |
| `apps/api/package.json`                                    | Modify | Remove the no-longer-used `tldts` dependency.                                                    |

## Verification Strategy

- Run each Worker build with its required staging `VITE_*` variables.
- Run type-check, lint, format check, and `git diff --check`.
- In Cloudflare, verify each Worker has its custom hostname and active TLS.
- Load each public hostname; confirm SSR responses, static assets, and a browser API
  request succeeds without a CORS failure.
- Verify `${VITE_API_URL}/api/health/ready` before publishing.

## Rollout

No database migration or feature flag is required. Configure the Cloudflare account,
Workers, hostnames, API CORS origin, and GitHub staging Environment first. The workflow
is enabled only after those prerequisites are present. Production remains out of scope.

## Open Questions

- [ ] Record the native staging Cloud Run service URL as GitHub `staging` Environment
      variable `VITE_API_URL` and confirm `${VITE_API_URL}/api/health/ready` returns HTTP
      200 before T6 enables automated deployment.
