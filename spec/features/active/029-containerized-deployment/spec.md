# Containerized Deployment

## Status

In Progress

## Intent

Provide reproducible containerized deployment for `api`, `web`, `dashboard`, and `admin` without
making routine releases depend on duplicated workflows or a manually maintained VPS checkout.
Development runs on the host against developer-managed PostgreSQL. Staging and production run on
separate VPS hosts, use separate cloud resources such as Neon databases, and deploy immutable
container images through a cached, migration-gated release process.

## Scope

### In Scope

- Production images for all four applications and a one-shot database migration image.
- A multi-stage API Dockerfile, a shared parameterized frontend Dockerfile that still produces
  independent `web`, `dashboard`, and `admin` images, and a secret-safe root `.dockerignore`.
- A standalone VPS Compose configuration.
- Host development configuration for connecting to a developer-managed PostgreSQL instance.
- An HTTPS reverse proxy on each staging and production VPS.
- Immutable images published to GHCR and selected by commit-based references.
- Cached image builds in CI and publication.
- One release workflow that automatically publishes and deploys validated staging commits and uses
  protected approval for production.
- A versioned deployment bundle containing the Compose, proxy, and release-script control plane.
- Separate staging and production configuration, secrets, domains, and Neon databases.
- Build-time public `VITE_*` configuration for frontend images.
- Explicit migrations, health checks, deployment rollback, and operational documentation.

### Non-Goals

- Kubernetes, Docker Swarm, multi-host orchestration, or automatic VPS failover.
- Hosting staging or production PostgreSQL on a VPS.
- Provisioning VPS hosts, DNS zones, Neon projects, or third-party provider accounts.
- Runtime frontend configuration in the initial delivery.
- Combining the three frontend applications into one runtime image.
- Replacing the VPS, Compose, Caddy, GHCR, or SSH deployment architecture.
- Automatic staging or production seeds.
- Changing application business behavior or the database schema.
- Automatically reversing database migrations during rollback.

## Requirements

### R1. Images

The repository MUST build independent production images for `api`, `web`, `dashboard`, and `admin`
using the monorepo root as build context. Frontend images MUST use one shared parameterized build
definition. The API Dockerfile MUST also expose an explicit one-shot database migration target.

Long-running production containers MUST use production application output, run as a non-root user,
support graceful termination, and expose only their service port to the internal Compose network.
All development, CI, and containerized application surfaces MUST use the same active Node.js LTS
major version.

### R2. Development Database

Host development MUST support connecting to a developer-managed PostgreSQL instance through
`DATABASE_URL` and `DATABASE_MIGRATION_URL`. The repository MUST NOT provision or reset a local
database as part of normal application startup.

Database migrations and development fixtures MUST be explicit operations. Normal startup MUST NOT
erase data or run seeds.

### R3. Environment Isolation

Staging and production MUST run on separate VPS hosts, with independent Compose projects, runtime
configuration, secrets, domains, and Neon databases. Both MUST run production artifacts with
`NODE_ENV=production`.

Only the reverse proxy MUST publish public application ports on either VPS. Application containers
MUST remain on an internal network.

### R4. Configuration

Frontend `VITE_*` values MUST be validated and supplied at build time as public configuration.
Staging and production frontend images MUST be built separately when their public URLs differ.

API and database credentials MUST be injected at runtime and MUST NOT enter image layers. The API
MUST use Neon's pooled `DATABASE_URL`; migrations MUST use the direct
`DATABASE_MIGRATION_URL`. Missing required variables MUST fail clearly during the relevant build or
startup operation.

### R5. Database Operations

Migrations MUST execute as a one-shot job before application rollout. A failed migration MUST stop
the release without replacing the currently running application containers. Application startup
MUST NOT execute migrations or seeds.

Development seeds MUST be opt-in. Staging and production MUST NOT run seeds automatically.

### R6. Publication and Deployment

CI MUST validate every production image with valid non-secret test build inputs before publication.
CI and publication MUST use Buildx cache storage scoped so untrusted sources cannot write to trusted
release caches. Deployments MUST select immutable commit-based image references and MUST NOT depend
on `latest`.

After CI succeeds on the staging branch, the release workflow MUST automatically build, publish,
and deploy staging. Production MUST use the same release implementation, require protected
environment approval, and accept only a commit with a successful recorded staging deployment. Each
deployment MUST record the selected image references for rollback.

The release MUST transfer a versioned bundle containing the matching Compose file, Caddy
configuration, and deployment scripts. Deployment MUST execute from that bundle rather than from a
mutable checkout maintained independently on the VPS.

### R7. Rollback

Application rollback MUST restore the previously recorded compatible image set. Database state
MUST NOT be reversed automatically. Destructive migrations MUST have an explicit Neon recovery or
forward-correction procedure before production execution.

### R8. Security and Operations

Secrets MUST NOT be committed, copied into images, passed as frontend build arguments, or printed
in logs. VPS credentials MUST have restricted filesystem permissions. Containers MUST NOT use
privileged mode, host networking, or the host Docker socket.

VPS deployments MUST expose only HTTP and HTTPS through the reverse proxy. SSH exposure and host
hardening are operational prerequisites documented by this feature.

### R9. Documentation and Verification

English documentation MUST cover prerequisites, environment setup, local development, automated
staging releases, protected production promotion, migrations, rollback, secret rotation, and
troubleshooting.

Verification MUST cover repository checks, cached image builds, migration success and failure,
rendered VPS configuration, versioned bundle execution, reverse-proxy routing, environment
separation, release gating, and compatible application rollback.

## Acceptance Scenarios

### Development database connection

Given PostgreSQL is available to the developer and the documented database variables are configured
When the developer starts the applications
Then the API can connect using `DATABASE_URL`
And migrations can connect using `DATABASE_MIGRATION_URL`
And no database is provisioned or reset automatically.

### Persistent development data

Given the developer-managed PostgreSQL contains local development data
When the applications are stopped and restarted
Then the existing data remains available
And no seed runs automatically.

### Staging isolation

Given staging image references and staging secrets are configured
When the staging release runs on the staging VPS
Then migrations target only the staging Neon database
And production resources and credentials are not used
And the applications are served through the staging reverse proxy.

### Production approval

Given validated production images exist for a commit
When no protected production approval has been granted
Then the production VPS remains unchanged.

### Automatic staging release

Given CI succeeds for a commit on the staging branch
When the CI workflow completes
Then the release workflow publishes immutable staging images
And deploys their resolved digests to the staging VPS
And records the successful staging deployment for later promotion.

### Production promotion gate

Given a commit has no successful recorded staging deployment
When an operator requests its production release
Then production deployment is rejected before image publication or VPS mutation.

### Versioned deployment control plane

Given a release changes Compose, Caddy, or deployment scripts
When that release is deployed
Then the VPS executes the files from the selected commit's deployment bundle
And does not depend on the contents of a pre-existing repository checkout.

### Migration failure

Given the migration job exits unsuccessfully
When a staging or production release reaches the migration step
Then application rollout stops
And the currently running release remains selected
And the failure is reported without exposing credentials.

### Frontend environment separation

Given staging and production use different public URLs
When frontend images are built for both environments
Then each image contains only its environment's validated public values
And changing those values requires rebuilding the affected image.

### No automatic cloud seed

Given a staging or production release completes
When its migration and application steps are inspected
Then no seed command has executed.

### Application rollback

Given a schema-compatible release is unhealthy after rollout
When the operator selects the previously recorded image references
Then the previous application release becomes healthy
And database state is not automatically reversed.

### VPS network exposure

Given a VPS deployment is running
When its published application ports are inspected externally
Then only the reverse proxy exposes HTTP and HTTPS
And application container ports remain internal.
