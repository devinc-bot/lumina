# API Jobs Catalog

In-process Nest schedulers owned by `JobsModule` live under
`apps/api/src/modules/jobs/schedulers/`. This catalog is the source of truth for
stable names, purpose, and how production vs local scheduling differs.

## Production (Cloud Scheduler) — feature 042

| Name  | Schedule                           | What it does                                                                                                                       |
| ----- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `run` | `0 0 1,11,21 * *` (UTC; ~3×/month) | Single HTTP `POST /api/internal/jobs/run`: purchase reservation expiry (batch 100), then all hygiene cleanups below, sequentially. |

Operators accept that abandoned reservation holds may persist until the next run.

## Auth (OIDC)

Production Cloud Scheduler must send a Google OIDC Bearer token. Configure:

- `INTERNAL_JOBS_OIDC_AUDIENCE` — Cloud Run service URL (or custom audience)
- `INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS` — comma-separated scheduler SA emails

Local DX: leave **both** empty so the Nest guard bypasses auth. Setting only one → 401
(fail closed). Never leave both empty in production (`NODE_ENV=production` rejects that
at startup).

```bash
# Local (OIDC env empty)
curl -X POST http://localhost:3000/api/internal/jobs/run

# Staging/production (identity token for the Scheduler SA)
curl -X POST "https://api.example.com/api/internal/jobs/run" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token --audiences=https://api.example.com)"
```

## Local Nest schedules (development DX)

| Name                                | Local schedule              | What it does                                                                                                |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `expire-purchase-reservations`      | Every minute                | Finds up to 100 expired active inventory reservations and releases each (purchase + reservation → expired). |
| `cleanup-stale-pending-orders`      | 1st of month, midnight      | Deletes stale pending legacy orders older than the start of the previous month.                             |
| `cleanup-api-error-records`         | Daily midnight              | Deletes API error records older than 30 days.                                                               |
| `cleanup-user-registration-tokens`  | Daily midnight              | Deletes expired user registration tokens.                                                                   |
| `cleanup-owner-registration-tokens` | Daily midnight              | Deletes expired owner registration tokens.                                                                  |
| `cleanup-password-reset-tokens`     | Daily midnight              | Deletes expired password-reset tokens.                                                                      |
| `cleanup-account-sessions`          | Every 14 days (`@Interval`) | Deletes expired or revoked account sessions older than 7 days.                                              |
| `cleanup-staff-invitations`         | Daily midnight              | Deletes expired and cancelled staff invitations.                                                            |

Catalog names are kebab-case documentation identifiers. Nest class names remain PascalCase
(e.g. `PurchaseExpiryScheduler`) unless a later feature renames them. In production,
`ENABLE_IN_PROCESS_SCHEDULERS=false` by default (and in production). Set
`ENABLE_IN_PROCESS_SCHEDULERS=true` locally if you want Nest `@Cron` / `@Interval`
triggers; Cloud Scheduler calls `run` instead.
