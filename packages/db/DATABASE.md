# Database

`@repo/db` owns PostgreSQL persistence on Neon.

## Structure

- Schemas: `src/schema/`
- Repositories: `src/repositories/`
- Migrations: `src/migrations-postgresql/`
- Runtime client: `src/client.ts`
- Seeds: `src/seed/`

Schemas use Drizzle `pgTable`. Tables use internal integer `id` foreign keys and public UUID `documentId` values. Use `documentId` in API and JWT contracts.

All API database access belongs in repositories. NestJS services import repository functions from `@repo/db`; they do not query `db` directly.

## Connections

| Variable                 | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `DATABASE_URL`           | Pooled Neon URL for application runtime                            |
| `DATABASE_POOL_MAX`      | Max connections in the runtime `pg` Pool (default `10`)            |
| `DATABASE_MIGRATION_URL` | Direct Neon URL for migrations, seeds, and administrative commands |

`@repo/db` reads injected process variables first. For host development, it loads
`packages/db/.env` only when either database URL is absent. Set `DATABASE_ENV_FILE` to use another
local environment file. Container deployments should inject both database URLs and should not copy
an environment file into the image.

## Commands

Run from `packages/db`.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:seed:development
pnpm db:seed:production
pnpm db:studio
```

`db:seed:production` creates roles and the configured admin account. `db:seed:development` additionally creates non-production fixtures. Both are idempotent.

`db:migrate` requires only `DATABASE_MIGRATION_URL`, applies committed migrations, exits when
complete, and never runs a seed. The deployment migrator container runs the same Drizzle command.

## Checkout data retention

Checkout retention runs in dry-run mode by default. Before enabling an apply run, operators must review
the reported aggregate counts, take a managed database backup, and obtain legal/accounting approval.
No job log may include purchase IDs, provider identifiers, credentials, or webhook payloads.

To place a purchase under hold, an authorized operator updates `purchases.legal_hold_at`; to release it,
the operator clears that timestamp after the dispute or legal review has closed. A hold prevents
reservation deletion, webhook payload minimization, and buyer dissociation for that purchase.
The operator must record the actor, timestamp, and external case reference in the authorized operational
system; do not store hold reasons, customer data, or case evidence in the database or job logs.

## Isolated database tests

Preview owner accounts missing an organization with `pnpm db:repair:owner-organizations`.
Use `pnpm db:repair:owner-organizations --apply` to provision those organizations and memberships.
The command uses `DATABASE_MIGRATION_URL`, reports counts only, preserves all existing memberships,
and can be repeated safely. Owners without an account link are excluded.

`DATABASE_TEST_URL` is reserved for an isolated, migrated PostgreSQL database used by database
integration tests. Its database name must end in `_test` and it must differ from the runtime and
migration URLs. It must never point to runtime, staging, or production data. Tests skip their
database integration coverage when this variable is absent.

Use `@repo/validators` before persistence and keep API DTOs and enums in `@repo/types`.
