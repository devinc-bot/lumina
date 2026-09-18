# Tasks 042 - API Cloud Run and Scheduler Jobs

## Phase 1 — Nest + manual ops (done)

- [x] T1: Confirm Open Questions (job auth **B**, Scheduler option **A** = one endpoint + `0 0 1,11,21 * *`, min-instances/SSE/outbox superseded by 043) and lock them in `spec.md` / `plan.md` before coding. **Done 2026-09-11.**
- [x] T2: Add `@repo/common` `API_ROUTES` for the **single** Scheduler-facing job (`run`); extend API env schema for OIDC audience/allowed SAs, in-process scheduler toggle, and DB pool max. **Done 2026-09-11.**
- [x] T3: Extract/reuse existing cleanup + expiry use-cases; add internal jobs module/controller — one `POST .../run` (sequential steps: expiry then hygiene, structured logs); wire production to disable in-process `@Cron`/`@Interval` while keeping local DX; update `JOBS.md` for production packaging. **Done 2026-09-11.**
- [x] T4: Implement production OIDC guard for internal job routes (fail closed); document local invoke path without weakening production auth. **Done 2026-09-11.**
- [x] T5: Make PostgreSQL `Pool` `max` configurable for Cloud Run multi-instance; keep graceful `pool.end()` on shutdown. **Done 2026-09-11.**
- [x] T6: Add/adjust focused automated tests (authz, success/error, aggregated step behavior including expiry, purchase-expiry idempotency) via test-engineer workflow. **Done 2026-09-11.** (gaps filled: duplicate-run expiry idempotency + controller OIDC guard wiring; 100 jobs-related tests green)
- [x] T7: Add `deploy/CLOUD_RUN.md` (doc + inline `gcloud`/`docker`; no helper scripts — free-tier ops); update `deploy/env` examples/README for new vars; leave VPS Compose scripts unchanged. **Done 2026-09-11.**
- [x] T8: Run affected verification (`api` tests, type-check, lint, format check); quality-reviewer pass; fix findings. **Done 2026-09-11.** (100 jobs-related tests + type-check green; review: no blockers; scripts removed per docs-only ops)

## Phase 2 — Dual-env + GitHub Actions (proposed; review before apply)

- [x] T9: Resolve remaining Open Questions (push vs dispatch; production approval) and lock in `spec.md` / `plan.md`. **Done 2026-09-12** (assumed: push+verify+dispatch; prod Environment approval required).
- [x] T10: Update `deploy/CLOUD_RUN.md` (+ `OPERATIONS.md` pointers) for one GCP project / two services, branch → env mapping, two Scheduler jobs, WIF/Actions overview, manual `gcloud` fallback. **Done 2026-09-12.**
- [x] T11: Add GitHub Actions workflow(s) to build/push API+migrator, run migrator job, deploy Cloud Run for `staging` and `main` via Workload Identity Federation + GitHub Environments (no SA JSON in repo). **Done 2026-09-12.**
- [x] T12: Verify workflow YAML / docs (lint, format); quality-reviewer on the Phase 2 diff; document operator GCP/GitHub one-time setup steps. **Done 2026-09-12** (no blockers; mitigated shared deploy-SA bypass in docs; health probe added; format checked).
- [x] T13: Harden the API Cloud Run release gate: run verification before GCP authentication, require runtime/Scheduler deployment variables, probe database readiness, and verify the Scheduler URI/OIDC audience/SA after rollout. **Done 2026-09-14.**
- [x] T14: Trigger Cloud Run deployment only after successful CI, using the verified workflow-run SHA and no manual bypass. **Done 2026-09-14.**
