# Plan 046 - Cloudflare Frontends

## Approach

Draft only until Open Questions are resolved. Expected shape: build TanStack Start /
Vite apps in CI, publish to Cloudflare, wire `VITE_API_URL` (and related) to the
matching Cloud Run service URLs from feature 042, update `deploy/` docs, and narrow
or retire VPS frontend services from feature 029.

## Confirmed Decisions

- Frontends → Cloudflare; API → Cloud Run (042).
- Branch model aligns with `staging` / `main`.

## Open work

Fill technical approach (Pages vs Workers, wrangler, Actions, DNS) after clarifications.
Do not implement until this plan is reviewed with a completed `tasks.md`.
