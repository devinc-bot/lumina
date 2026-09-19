# Spec 047 - Dependency Modernization

## Context and Objective

Lumina needs its direct dependencies kept current while preserving a reproducible
workspace and the behavior of its API, SSR frontends, UI package, and test tooling.
This change updates supported direct dependencies in reviewable migration slices and
removes dependencies only when repository evidence confirms they are unused.

## Users / Actors

- Developers maintaining the monorepo and its CI pipeline.
- Platform operators deploying the API and Cloudflare Workers.

## User Stories

- H1: As a developer, I want supported direct dependencies and lockfile entries so
  that local development and CI use maintained tooling.
- H2: As a maintainer, I want unused dependencies removed so that installs and
  deployed bundles do not include unnecessary packages.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a direct dependency is updated, THE SYSTEM SHALL use the exact latest
  compatible version recorded in `pnpm-lock.yaml`.
- RF-2: WHEN an upgrade introduces documented breaking behavior, THE SYSTEM SHALL
  apply the required source or configuration migration before verification.
- RF-3: WHEN a direct dependency has no runtime, build, test, configuration, or
  package-export use, THE SYSTEM SHALL remove it from its declaring manifest.
- RF-4: THE SYSTEM SHALL keep production, development, peer, and workspace
  dependency declarations mutually compatible.

## Non-Functional Requirements

- Do not use broad semver ranges or blind package-manager update commands.
- Preserve generated files and unrelated in-progress workspace changes.
- Validate every migration slice with the most specific available checks.

## Edge Cases

- A package can be required transitively but not imported directly; it must not be
  declared directly unless a manifest, build tool, or package export requires it.
- Major upgrades may require independent migration slices and must not be merged
  solely because a newer version exists.

## Out of Scope

- New product features or changes to product behavior unrelated to a documented
  dependency migration.
- Updating indirect-only dependencies by hand.
- Replacing the package manager or runtime deployment topology.

## Definition of Done

- Each planned update slice has a reproducible lockfile, documented compatibility
  corrections, and passing applicable verification.
- Removed dependencies have repository evidence of no direct use.
- CI can install with `pnpm install --frozen-lockfile`.

## Open Questions

- [NEEDS CLARIFICATION] Whether all major migrations should ship as chained pull
  requests or be promoted together only after every slice has passed CI.
