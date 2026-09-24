# Tasks 046 - Cloudflare Frontends

- [x] T11: Assign distinct local Worker inspector ports to web (9231), dashboard
      (9232), and admin (9233); verify concurrent startup and configuration checks.
      Verified concurrent Vite startup and all six HTTP/inspector listeners; type-check,
      focused formatting, and diff checks passed. Lint reported an existing dashboard
      `no-console` warning. No automated tests added (low-importance configuration change).

- [x] T1: Resolve staging scope and product decisions in `spec.md` (Cloudflare
      Workers, one account, successful manually dispatched CI trigger, and all three frontends).
- [x] T2: Complete `plan.md` with the Cloudflare Workers technical approach,
      deployment configuration, DNS/TLS, API CORS alignment, and verification strategy.
- [x] T3: Add pinned Cloudflare Worker build dependencies and Worker configuration for
      `web`.
- [x] T4: Add pinned Cloudflare Worker build dependencies and Worker configuration for
      `dashboard`.
- [x] T5: Add pinned Cloudflare Worker build dependencies and Worker configuration for
      `admin`.
- [x] T6: Add the staging GitHub Actions deployment workflow, using the GitHub
      `staging` Environment for the Cloudflare credentials and public build inputs; deployment
      follows a successful manually dispatched CI run for `staging`.
- [x] T7: Update staging API/frontend environment documentation, including the
      `dash-staging.lumina-events.com` CORS and `VITE_DASHBOARD_URL` change, and replace
      custom API-domain references with the native Cloud Run service URL.
- [x] T8: Document staging Worker creation, DNS/TLS, deployment, and verification
      under `deploy/`.
- [ ] T9: Verify the three Worker builds and staging deployment behavior without
      exposing credentials or bundling non-public values.
- [ ] T10: Migrate staging Cloud Run regional resources to `us-east1`, activate
      `api-staging.lumina-events.com`, update API/OAuth/webhook/OIDC configuration, and verify
      same-site Google session refresh from `staging-dash.lumina-events.com`.
