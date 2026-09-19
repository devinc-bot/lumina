# Spec 030 - Testing Toolchain

## Context and Objective

The monorepo currently runs 40 TypeScript tests through several `node:test` commands, including an
API command that manually lists test files and currently omits two valid tests. The frontends have no
component test environment, there is no automated browser suite, and the root workspace has no
single test command. This feature establishes a modern, minimal testing toolchain based on Vitest and
Playwright while preserving the behavior of the existing tests and avoiding optional infrastructure
until a concrete test requires it.

## Users / Actors

- Developers who write and run tests across the monorepo.
- Reviewers who need consistent verification commands and readable failures.
- Continuous integration jobs that validate changes without development secrets.

## User Stories

- H1: As a developer, I want one Vitest command to run unit and integration tests across all
  workspaces so that I do not maintain different test runners or explicit test-file lists.
- H2: As a frontend developer, I want a minimal React Testing Library setup so that I can verify
  component behavior from the user's perspective when a component test is warranted.
- H3: As a developer, I want Playwright smoke tests for every frontend so that browser startup and
  stable public routes are validated consistently.
- H4: As a reviewer, I want deterministic test commands that do not consume local secrets so that
  results are reproducible locally and in CI.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a developer runs the root unit test command, THE SYSTEM SHALL discover and execute every
  Vitest test under `apps/` and `packages/` without an explicit file list.
- RF-2: WHEN the existing `node:test` suite is migrated, THE SYSTEM SHALL preserve its tested behavior
  and SHALL include the two API test files omitted by the current API script.
- RF-3: WHEN a unit test mutates modules, globals, timers, or environment variables, THE SYSTEM SHALL
  restore the affected test state before another test executes.
- RF-4: WHEN an API unit test imports environment-dependent modules, THE SYSTEM SHALL provide
  deterministic non-secret test values without loading a developer `.env` file.
- RF-5: WHEN a React component test is executed, THE SYSTEM SHALL provide a scoped jsdom environment
  and React Testing Library utilities without changing the default Node environment for non-DOM
  tests.
- RF-6: WHEN a developer runs the root E2E command, THE SYSTEM SHALL start or reuse the required
  frontend servers and execute Chromium smoke tests against `web`, `dashboard`, and `admin`.
- RF-7: IF an E2E test fails, THEN THE SYSTEM SHALL retain a useful Playwright trace or report while
  keeping successful local runs free of generated artifacts.
- RF-8: WHILE tests run in CI, THE SYSTEM SHALL use a supported Node version, install only the
  required Chromium browser, and execute unit tests separately from E2E tests.
- RF-9: THE SYSTEM SHALL expose concise root commands for one-shot unit tests, unit watch mode, E2E
  tests, and interactive E2E development.
- RF-10: THE SYSTEM SHALL keep Vitest and Playwright test discovery disjoint.

## Non-Functional Requirements

- Dependencies MUST use exact versions and the pnpm lockfile MUST remain committed.
- Vitest MUST run with Node 20 or newer; Node 24 is the target local and CI baseline.
- Unit tests MUST default to a Node environment; jsdom MUST be enabled only for component tests that
  need DOM APIs.
- The first Playwright suite MUST use Chromium only and MUST avoid database mutation, seeded accounts,
  third-party network calls, and authentication setup.
- Test configuration and fixtures MUST contain no credentials or production endpoints.
- Existing tests MUST remain independently readable and MUST not be rewritten beyond what the runner
  migration requires.

## Edge Cases

- Vitest module mocks are hoisted, unlike the current `mock.module` and dynamic-import sequence.
- API modules may validate a broad environment contract at import time.
- Tests that replace `fetch`, logger methods, or `process.env` can leak state when files execute in
  parallel.
- A developer may already have one or more frontend development servers running.
- Frontend startup can be slower on a cold dependency or Vite cache.
- Playwright reports, traces, and test results can be generated after interrupted or failed runs.
- Source-reading frontend tests remain valid unit tests even though they do not render React.

## Out of Scope

- MSW, Cypress, Jest, Testcontainers, and Vitest Browser Mode.
- Coverage thresholds, a coverage provider, mutation testing, and visual regression snapshots.
- Cross-browser or mobile Playwright projects beyond desktop Chromium.
- Authenticated, payment, invitation, check-in, or other database-backed E2E journeys.
- Provisioning, migrating, seeding, or cleaning an E2E database.
- Replacing all existing source-reading tests with rendered component tests.
- A global custom React render helper, provider harness, or API mocking layer before tests require one.

## Definition of Done

- All existing tests pass through Vitest and no workspace invokes `node:test`.
- Vitest discovers all 40 tests present at proposal time, including the two previously omitted API
  files, plus any integration smoke test added by this feature.
- One representative React component test proves the scoped jsdom and React Testing Library setup.
- Playwright runs one stable Chromium smoke scenario for each frontend.
- Root one-shot, watch, E2E, and interactive E2E commands are documented and verified.
- Type-check, lint, format check, Vitest, and Playwright pass with non-secret test configuration.
- Generated Vitest and Playwright output is ignored by Git.

## Open Questions

None. Authenticated and database-backed E2E coverage is intentionally deferred to a later feature.
