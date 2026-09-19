# Containerized Deployment Tasks

Complete one independently reviewable task at a time. Mark a task complete only after its listed
verification passes.

## Runtime and Environment

- [x] **T1. Define environment contracts**
  - Add sanitized development, staging, and production examples.
  - Separate public frontend build inputs from runtime secrets.
  - Document pooled API and direct migration database URLs.
  - Set `NODE_ENV=production` for staging and production.
  - Verify examples contain no credentials and missing values fail clearly.

## Database and Migrations

- [x] **T2. Make database configuration container-safe**
  - Allow migrations and runtime repositories to use injected process environment without a required
    checked-out `.env` file.
  - Preserve current local environment loading when explicitly requested for host development.
  - Verify configuration against local PostgreSQL and injected test values.

- [x] **T3. Add the one-shot migration contract**
  - Provide a migration command that exits after applying committed Drizzle migrations.
  - Use `DATABASE_MIGRATION_URL` and never run seeds.
  - Verify empty, already-migrated, and controlled-failure databases.

## API

- [x] **T4. Prepare the API production runtime**
  - Replace the development-loader production command with a verified built-output command.
  - Bind to the configured container interface and add graceful shutdown.
  - Add or confirm liveness and database readiness checks.
  - Verify startup, health, environment validation, and `SIGTERM` behavior.

## Frontends

- [x] **T5. Prepare the `web` production runtime**
  - Verify the TanStack Start production server entry point, SSR, and server functions.
  - Add a stable production command.
  - Validate build-time `VITE_API_URL` and `VITE_DASHBOARD_URL`.
  - Verify health and embedded public values.

- [x] **T6. Prepare the `dashboard` production runtime**
  - Establish the verified TanStack Start production build and start contract.
  - Validate build-time `VITE_API_URL`.
  - Verify health, SSR, server functions, and environment separation.

- [x] **T7. Prepare the `admin` production runtime**
  - Establish the verified TanStack Start production build and start contract.
  - Validate build-time `VITE_API_URL`.
  - Verify health, SSR, server functions, and environment separation.

## Container Images

- [x] **T8. Add secure multi-target images**
  - Add `.dockerignore` before broad source copies.
  - Add app-specific dependency/build/runtime stages for `api`, `web`, `dashboard`, and `admin`, plus
    an API `migrator` target.
  - Copy workspace manifests before sources and cache the pnpm store with BuildKit.
  - Run TanStack Start server output without Vite build tooling in the runtime image.
  - Use frozen dependencies, non-root runtime users, and minimal runtime contents.
  - Add development targets only where watch mode needs them.
  - Build and smoke-test every target independently.

## Local Development

- [x] **T9. Establish the developer-managed database contract**
  - Keep application development on the host and connect through explicit database URLs.
  - Do not provision or reset PostgreSQL during normal startup.
  - Make migrations and development seeds explicit commands.
  - Verify restart preserves developer-managed data and no seed runs automatically.

## VPS Runtime

- [x] **T10. Add the VPS Compose overlay and reverse proxy**
  - Reference immutable image variables instead of local builds.
  - Add Caddy host routing and TLS configuration.
  - Publish only ports 80 and 443 and keep application services internal.
  - Apply restart policies only to long-running services.
  - Render and inspect independent staging and production configurations.

- [x] **T11. Add deployment and rollback scripts**
  - Pull and record selected immutable image references.
  - Run the one-shot migration before application reconciliation.
  - Leave the active release unchanged when pull or migration fails.
  - Restore the previous compatible image set during application rollback.
  - Verify successful, failed-migration, unhealthy-release, and rollback paths without logging
    secrets.

## CI and Publication

- [x] **T12. Complete container validation in CI**
  - Run repository checks and existing tests.
  - Build every production target with valid non-secret frontend build arguments.
  - Use Buildx cache without allowing untrusted jobs to write trusted release cache state.
  - Render the deployment Compose configuration.
  - Ensure untrusted pull requests cannot access publication or deployment credentials.

- [x] **T13. Publish immutable GHCR images**
  - Publish environment-qualified commit tags and capture resolved digests.
  - Build frontend images with the selected environment's public `VITE_*` values.
  - Use least-privilege workflow permissions and vulnerability reporting.
  - Verify no deployment configuration references `latest`.

## Environment Deployments

- [x] **T14. Add staging deployment**
  - Target only the staging VPS, domains, secrets, and Neon database.
  - Set `NODE_ENV=production` and run migrations before rollout.
  - Verify every public route and record deployed image references.
  - Confirm no seed command runs.

- [x] **T15. Add protected production deployment**
  - Require a manual action or protected-environment approval.
  - Target only the production VPS, domains, secrets, and Neon database.
  - Run migrations before rollout and abort on failure.
  - Verify public health, record deployed image references, and confirm no seed runs.

## Release Simplification

- [x] **T17. Consolidate frontend image definitions**
  - Replace the three duplicated frontend Dockerfiles with one parameterized build definition.
  - Continue producing independent `web`, `dashboard`, and `admin` runtime images and ports.
  - Add OCI source and revision labels to all published image targets.
  - Build and smoke-test every frontend with its required public configuration.

- [x] **T18. Add cached, deterministic image builds**
  - Use `docker/build-push-action` and scoped GitHub Actions cache in CI and release builds.
  - Supply explicit non-secret `VITE_*` test values in CI.
  - Preserve frozen dependencies and ensure public build values cannot cross environment caches.
  - Verify cold and warm builds produce valid images without exposing runtime secrets.

- [x] **T19. Replace publication and deployment workflows with one release workflow**
  - Automatically release staging only after successful CI on the staging branch.
  - Publish all image digests and combine them into one release manifest.
  - Require a recorded successful staging deployment before production promotion.
  - Require protected production Environment approval and reuse the same release implementation.
  - Remove the superseded publication and environment-specific deployment workflows.

- [x] **T20. Deploy a versioned control-plane bundle**
  - Package Compose, Caddy, and deployment scripts from the selected commit with a checksum.
  - Transfer and execute the bundle from `/opt/app/releases/<commit-sha>/`.
  - Keep runtime secrets outside the bundle and preserve current/previous image state.
  - Verify deployment works without a repository checkout and rejects a corrupted bundle.

## Documentation and Acceptance

- [x] **T22. Align project execution with Node.js 24 LTS**
  - Use Node 24 in GitHub Actions and all application Docker build and runtime stages.
  - Declare the Node 24 major for local development and package consumers.
  - Verify all Node-version declarations resolve to the same LTS major.

- [x] **T16. Add the operations guide**
  - Document prerequisites, DNS and TLS, VPS layout, environment files, GHCR access, development,
    migrations, deployments, rollback, Neon recovery, secret rotation, and troubleshooting.
  - Explain frontend rebuild requirements and why staging uses `NODE_ENV=production`.
  - Cross-check every documented command against the implemented configuration.

- [ ] **T21. Update operations documentation and verify all acceptance scenarios**
  - Replace the manual publish/deploy instructions with automatic staging and protected production
    promotion.
  - Run repository checks and all container validation.
  - Verify developer-managed database startup and persistence without automatic provisioning.
  - Rehearse staging deployment, migration failure, and compatible image rollback.
  - Verify CI gating, production promotion gating, cache isolation, and versioned bundle execution.
  - Inspect VPS port exposure and image/secret handling.
  - Record evidence that every requirement and acceptance scenario passes.
  - **Remaining manual evidence:** staging/production GitHub Environment credentials and VPS access
    are required to verify live releases, protected approval, VPS port exposure, and cloud resource
    isolation. Keep this task unchecked until that evidence is recorded.
