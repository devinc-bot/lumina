# Tasks 046 - Cloudflare Frontends

- [x] T1: Resolve staging scope and product decisions in `spec.md` (Cloudflare
  Workers, one account, successful-CI trigger, and all three frontends).
- [x] T2: Complete `plan.md` with the Cloudflare Workers technical approach,
  deployment configuration, DNS/TLS, API CORS alignment, and verification strategy.
- [x] T3: Add pinned Cloudflare Worker build dependencies and Worker configuration for
  `web`.
- [x] T4: Add pinned Cloudflare Worker build dependencies and Worker configuration for
  `dashboard`.
- [x] T5: Add pinned Cloudflare Worker build dependencies and Worker configuration for
  `admin`.
- [x] T6: Add the staging GitHub Actions deployment workflow, using the GitHub
  `staging` Environment for the Cloudflare credentials and public build inputs.
- [x] T7: Update staging API/frontend environment documentation, including the
  `dash-staging.lumina-events.com` CORS and `VITE_DASHBOARD_URL` change, and replace
  custom API-domain references with the native Cloud Run service URL.
- [x] T8: Document staging Worker creation, DNS/TLS, deployment, and verification
  under `deploy/`.
- [ ] T9: Verify the three Worker builds and staging deployment behavior without
  exposing credentials or bundling non-public values.
