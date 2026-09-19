# Containerized Deployment Plan

## Architecture

Use the monorepo root as build context with two maintained build definitions:

- `apps/api/Dockerfile` provides the `api`, `migrator`, and database-tool targets.
- `deploy/Dockerfile.frontend` accepts a validated application name and port and produces independent
  `web`, `dashboard`, and `admin` runtime images.

Use a Debian slim Node 22 base and the repository-pinned pnpm version. Copy workspace manifests
before source files, install filtered dependencies with `pnpm install --frozen-lockfile`, cache the
pnpm store with BuildKit, preserve workspace package resolution, and copy only deployed runtime
artifacts into non-root production stages.

Compose is provided only for deployment:

- `docker-compose.yml`: a standalone VPS stack with immutable images, internal-only application ports,
  restart policies, migration job, and reverse proxy.

Host development uses a developer-managed PostgreSQL instance and the database environment contract;
the repository does not provision a local database with Compose.

Caddy is the initial VPS reverse proxy because it provides a small declarative configuration and
automatic TLS. Its configuration remains replaceable without changing application images.

## Environment Matrix

| Concern          | Development                  | Staging               | Production               |
| ---------------- | ---------------------------- | --------------------- | ------------------------ |
| Host             | Developer machine            | Dedicated staging VPS | Dedicated production VPS |
| Database         | Developer-managed PostgreSQL | Staging Neon          | Production Neon          |
| `NODE_ENV`       | `development`                | `production`          | `production`             |
| API database URL | Local service URL            | Pooled Neon URL       | Pooled Neon URL          |
| Migration URL    | Local service URL            | Direct Neon URL       | Direct Neon URL          |
| Frontend URLs    | Local values                 | Staging build values  | Production build values  |
| Secrets          | Uncommitted local env        | Staging VPS env       | Production VPS env       |
| Public ports     | Documented app ports         | 80 and 443            | 80 and 443               |
| Images           | Host development processes   | Immutable GHCR images | Immutable GHCR images    |
| Seeds            | Explicit development command | Never automatic       | Never automatic          |

`VITE_API_URL` is a build input for every frontend. `web` also requires
`VITE_DASHBOARD_URL`. These values are public configuration, not secrets.

## Runtime Preparation

The current API and database commands require physical `.env` files, and the API production command
uses `tsx`. Replace those assumptions with container-safe process environment loading and a verified
production start command that runs built output with runtime dependencies only.

The current workspace packages export TypeScript source directly, so the API's production dependency
set still requires the production `tsx` loader for those package exports. The image excludes the API
source tree and runs compiled `dist/main.js`; removing `tsx` completely requires a separate change to
publish JavaScript outputs from shared packages or bundle the API. Nest's stock webpack builder is not
a drop-in replacement because the workspace package exports and module resolution require additional
build architecture.

The TanStack Start applications currently produce `dist/client` and a Fetch-compatible
`dist/server/server.js`. Run that output through a small `srvx` Node adapter rather than shipping
Vite and its build plugins in the runtime image. Do not serve only static client assets because the
applications use SSR and server functions.

All long-running services bind to `0.0.0.0`, handle `SIGTERM`, and expose a health-checkable route or
process contract. API readiness includes database connectivity; liveness remains lightweight.

## Image Strategy

- Add `.dockerignore` before source copies to exclude `.env*`, credentials, VCS metadata,
  dependencies, local build output, and volumes.
- Build every app independently and copy only that app plus shared packages after dependency install.
- Add OCI source and revision labels.
- Publish environment-qualified commit tags and record resolved digests.
- Never deploy `latest`.
- Pass only validated public frontend values as build arguments.
- Keep all secrets in runtime configuration on the target VPS.
- Use GitHub Actions Buildx cache for CI and trusted release builds, with environment and image scope
  included in cache keys where build-time public values differ.

Staging and production frontend images are separate because their public URLs are embedded at build
time. API and migrator images may share a digest when their build inputs are identical.

## Database Migration Design

The `migrator` target contains committed Drizzle migrations and the minimum tooling needed to apply
them. Deployment invokes the service explicitly as a one-shot operation.

The job:

- Receives `DATABASE_MIGRATION_URL` at runtime.
- Uses the direct Neon endpoint in staging and production.
- Has no restart policy.
- Exits zero only after pending migrations succeed.
- Never runs seeds or starts application services.

Development uses the same contract against local PostgreSQL. `db:push` remains development-only and
is not part of deployment.

## Deployment Flow

### CI

1. Run type-check, lint, format checks, and existing tests.
2. Build every production target with explicit non-secret test `VITE_*` inputs.
3. Render the staging and production VPS Compose configurations.
4. Exercise deployment-script tests without cloud credentials.
5. Prevent untrusted pull requests from accessing publication, deployment credentials, or trusted
   release cache write paths.

The CI workflow has a read-only `contents` permission and contains no registry or deployment
credentials. It runs repository checks and existing tests before building all runtime and migrator
targets with Buildx cache. It renders each Compose contract and runs the self-contained deployment
script suite. Database integration tests continue to use their existing explicit test setup; the
deployment Compose file does not provision PostgreSQL.

`.github/workflows/release.yml` owns publication and deployment. A successful `CI` run on the main
staging branch triggers a staging release automatically. A manual production dispatch selects a
commit SHA, verifies that GitHub records a successful staging deployment for it, and then enters the
protected `production` Environment approval gate. The workflow reads the selected Environment's
public frontend variables and secrets only in the jobs that need them.

The release matrix publishes each target to GHCR with the `${environment}-${commit-sha}` tag,
captures its digest, uploads Trivy results, and combines all digests into one `release-images.env`
artifact. No `latest` tag or runtime secret is used.

### Staging

1. Receive a successful CI completion for the staging branch and commit.
2. Build and publish frontend, API, and migrator images using the staging Environment.
3. Resolve digests and assemble the deployment bundle from the same commit.
4. Transfer the bundle and image manifest to a commit-addressed directory on the staging VPS.
5. Pull the selected images and run the migration job against staging Neon.
6. Reconcile application and proxy services, verify public health, and record the deployment.

### Production

1. Select a commit with a successful recorded staging deployment.
2. Verify the staging promotion gate before publication.
3. Require protected production approval.
4. Build and publish environment-specific frontend, API, and migrator images.
5. Transfer the matching deployment bundle and digest manifest to the production VPS.
6. Run migrations, reconcile services, verify public health, and record the deployment.

## Deployment Bundle

The release packages `docker-compose.yml`, `deploy/Caddyfile`, and `deploy/scripts/` from the selected
commit into a checksum-addressed archive. The VPS extracts it under
`/opt/app/releases/<commit-sha>/`; deployment commands run from that immutable directory. Restricted
runtime environment files remain under `/etc/app/`, while current and previous image manifests
remain under `/var/lib/app/<environment>/`.

The bundle is uploaded before any pull or migration. A failed transfer, checksum verification, pull,
or migration leaves active services unchanged. Old bundles may be pruned only after they are no
longer referenced by current or previous release state.

## VPS Layout and Security

Each VPS runs an independent Compose project and reverse proxy. Only Caddy publishes ports 80 and 443. The API and frontend services use an internal network; the migration service runs only when
invoked.

Runtime environment files live outside the repository with restricted permissions. The deployment
identity has only the SSH and GHCR read permissions it needs. Containers do not mount the Docker
socket, use privileged mode, or print environment values. Operational documentation covers SSH
hardening, firewall policy, security updates, log rotation, disk monitoring, and image cleanup.

## Rollback and Recovery

If pulling images or running migrations fails, leave the active application services unchanged.

If health checks fail after rollout, redeploy the previously recorded compatible image digests and
verify public health again. Do not run automatic down migrations. Before a destructive migration,
create or verify a Neon recovery point and assess backward compatibility. Use a forward corrective
migration or Neon recovery when the previous application is incompatible with the migrated schema.

Deployment scripts receive the environment-specific Compose selection file, validate digest-pinned
references, pull without reconciling active containers, run migrations, and only then reconcile the
long-running services with Compose health waits. They atomically record current and previous image
sets under `/var/lib/app/<environment>/`. Rollback applies the previous image set without
executing migrations. A self-contained shell test replaces Docker with a command double to verify
successful, failed-pull, failed-migration, unhealthy-release, and rollback behavior without logging
environment values.

## Affected Areas

| Path                                        | Planned change                                                |
| ------------------------------------------- | ------------------------------------------------------------- |
| `.dockerignore`                             | Exclude secrets and unnecessary build context                 |
| `deploy/Dockerfile.frontend`                | Centralize parameterized frontend build and runtime stages    |
| `apps/{web,dashboard,admin}/Dockerfile`     | Remove duplicated frontend build definitions after migration  |
| `apps/api/Dockerfile`                       | Add independent API, migrator, and database-tool targets      |
| `deploy/tanstack-start-server.mjs`          | Run built TanStack Fetch handlers and static client assets    |
| `docker-compose.yml`                        | Define immutable VPS services, migration job, and networks    |
| `deploy/Caddyfile`                          | Route environment hostnames and terminate TLS                 |
| `deploy/env/*.example`                      | Document sanitized environment contracts                      |
| `deploy/scripts/`                           | Add migration-gated deployment and rollback commands          |
| `apps/api/package.json`                     | Establish a production runtime command                        |
| `apps/api/src/main.ts`                      | Add container binding and graceful shutdown as needed         |
| `apps/api/src/modules/common/`              | Add or extend health endpoints as needed                      |
| `apps/{web,dashboard,admin}/package.json`   | Establish production server commands                          |
| `apps/{web,dashboard,admin}/vite.config.ts` | Configure verified production server output as needed         |
| `packages/db/package.json`                  | Expose a container-safe migration command                     |
| `packages/db/src/config/env.server.ts`      | Prefer injected environment over a required local file        |
| `.github/workflows/ci.yml`                  | Validate cached builds with explicit public test inputs       |
| `.github/workflows/release.yml`             | Publish and deploy staging or protected production releases   |
| `.github/workflows/publish-images.yml`      | Remove after release workflow replacement                     |
| `.github/workflows/deploy-*.yml`            | Remove duplicated environment-specific deployment workflows   |
| `deploy/OPERATIONS.md`                      | Document automatic staging and protected production promotion |

Paths may be consolidated during implementation when that reduces duplication without changing the
requirements.

## Verification Strategy

### Static and Build Verification

- Run `pnpm check` and existing tests.
- Build every production Docker target with cold and warm Buildx cache runs.
- Render Compose configuration for each VPS environment.
- Inspect build contexts and image history for secret files or values.

### Runtime Verification

- Connect host development to an explicit developer-managed database without provisioning or reset.
- Verify graceful termination and health checks for every long-running service.
- Confirm only Caddy publishes application ports in VPS configuration.
- Verify a deployment uses the selected commit's bundle even when no repository checkout exists on
  the VPS.

### Migration Verification

- Apply all migrations to an empty local PostgreSQL database.
- Re-run migration and confirm an already-migrated database succeeds.
- Force a controlled migration-job failure and verify rollout is blocked.
- Confirm normal startup and cloud deployment never execute seeds.

### Environment and Rollback Verification

- Build staging-like and production-like frontend images with distinct URLs and inspect the output.
- Confirm missing required build or runtime values fail clearly.
- Verify staging and production configurations cannot select each other's inputs.
- Confirm successful CI automatically starts staging release and failed CI does not.
- Confirm production rejects a commit without a successful staging deployment and pauses for
  protected approval when the gate passes.
- Deploy release A, deploy a schema-compatible release B, restore A's image references, and verify
  health.

## Risks

| Risk                                     | Mitigation                                                        |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Secrets enter image layers               | Add `.dockerignore` first and inspect image history               |
| Frontend URL points to wrong environment | Build and validate environment-specific frontend images           |
| TanStack Start runtime is incomplete     | Verify SSR and server functions with production output            |
| Migration races across replicas          | Use one explicit migration job before rollout                     |
| API scheduled jobs duplicate             | Keep one API replica initially or add coordination before scaling |
| Neon connection limits are exceeded      | Review pool size against the selected plan and replica count      |
| Rollback is schema-incompatible          | Require compatible migrations and Neon recovery planning          |
| VPS failure causes downtime              | Keep hosts separate and document restore; HA remains out of scope |
