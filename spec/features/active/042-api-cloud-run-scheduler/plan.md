# Plan 042 - API Cloud Run and Scheduler Jobs

## Approach

Reuse the existing production Dockerfile, health module, Zod env validation, migrator
image target, and repository job logic. Extract callable use-cases from Nest schedulers
in `modules/jobs`, expose **one** aggregated endpoint under
`POST /api/internal/jobs/run`, protect it with Google OIDC suitable for Cloud Scheduler,
disable in-process crons in production, document GCP ops, and add **GitHub Actions** that
deploy the API to Cloud Run from `staging` / `main`.

**Phase 1 (done):** Nest job HTTP + OIDC + pool + `CLOUD_RUN.md` (manual gcloud).
**Phase 2 (this proposal):** Dual-env docs in one GCP project + Actions deploy; Cloudflare
frontends deferred to feature 046.

## Confirmed Decisions

- Deploy scope: **API (+ migrator) on Cloud Run**; staging/production API is not Compose.
- Frontends: **Cloudflare** (feature 046) — not implemented in 042.
- GCP topology: **one project**, services e.g. `lumina-api-staging` / `lumina-api`,
  migrator jobs and Scheduler jobs per environment; distinct secrets/SAs.
- Branches: `staging` → staging Cloud Run; `main` → production Cloud Run.
- Tests: Nest job/OIDC coverage already delivered (high). Actions/docs = low automated
  test importance (verify YAML + dry-run docs; no `test-engineer` unless auth logic
  changes).
- Spec-first: this folder remains source of truth; review Phase 2 before apply.
- Prerequisite **043** / **045**: done.
- Job authentication (**B**): public Cloud Run + Nest OIDC on `/api/internal/jobs/*`.
- Scheduler (**A**): one HTTP pipeline per environment; cron `0 0 1,11,21 * *`.
- GCP auth from GitHub: **Workload Identity Federation** (no SA JSON in repo).

## Architecture

```text
GitHub (branch staging | main)
        |
        v
GitHub Actions + WIF → Artifact Registry → Cloud Run Job (migrator) → Cloud Run service
                                                                              |
Cloud Scheduler (per-env SA, OIDC) ──POST /api/internal/jobs/run─────────────┘
                                                                              |
                                                                         Neon (per-env DB)
```

Suggested naming (one `PROJECT_ID`):

| Env        | Git branch | Cloud Run service    | Scheduler job                      | Migrator job                  |
| ---------- | ---------- | -------------------- | ---------------------------------- | ----------------------------- |
| Staging    | `staging`  | `lumina-api-staging` | `lumina-internal-jobs-run-staging` | `lumina-api-migrator-staging` |
| Production | `main`     | `lumina-api`         | `lumina-internal-jobs-run`         | `lumina-api-migrator`         |

GitHub Environments `staging` / `production` hold env-specific vars (service names,
Scheduler name/SA, stable API OIDC audience, and runtime SA) and WIF provider config.
**Production** Environment requires manual reviewers before deploy; staging does not. Trigger:
successful `CI` workflow completion after a push to the matching branch; the deploy workflow
checks out the verified workflow-run SHA. CI also validates pull requests without deploying.

## Internal Job Catalog

Unchanged from Phase 1 — see prior table. One Scheduler job **per environment**.

## Configuration Additions (expected)

Unchanged Nest env contract. Actions need (not in Nest):

| Item                     | Role                                                       |
| ------------------------ | ---------------------------------------------------------- |
| WIF provider + deploy SA | `gcloud` from Actions without JSON keys                    |
| GitHub Environment vars  | `PROJECT_ID`, `REGION`, service/job names, AR repo         |
| Secret Manager           | Per-env `DATABASE_URL`, JWT, OIDC audience/allowlist, etc. |

## Documentation / CI

- Update `deploy/CLOUD_RUN.md`: dual-env table, branch mapping, two Scheduler jobs,
  Actions overview + manual fallback `gcloud` commands.
- Update `deploy/OPERATIONS.md`: API path = Cloud Run; VPS Compose no longer the API
  control plane for staging/prod; pointer to 046 for Cloudflare frontends.
- Add `.github/workflows/` deploy workflow(s) for API Cloud Run (after CI succeeds: build/push,
  migrate, deploy, readiness, and Scheduler OIDC-target checks). Keep existing `ci.yml` as the
  sole verification workflow.
- Do **not** reintroduce `cloud-run-*.sh` helpers.

## Verification

- Phase 1 Nest tests remain green if touched.
- `pnpm type-check` / lint / format on touched files.
- Manual: workflow dry-run or staging push after WIF is configured in GCP/GitHub
  (operator-owned secrets; document required console steps).

## Risks

- Misconfigured audience/SA list locks out Scheduler — fail closed (already).
- Wrong Environment secrets → staging talking to prod Neon — mitigate with naming +
  Environment isolation + required production approval.
- Migrator skipped on schema change — workflow must order migrate → deploy.
- Free-tier: two Scheduler **definitions** (staging + prod) still low monthly
  invocation count if cadence stays 3×/month each.
- Cloudflare cutover (046) may leave temporary dual frontend hosting — out of 042.
