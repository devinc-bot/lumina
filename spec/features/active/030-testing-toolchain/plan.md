# Testing Toolchain Plan

## Architecture

Use two runners with distinct responsibilities:

- Vitest runs TypeScript unit and lightweight integration tests across `apps/` and `packages/`.
- Playwright runs browser-level smoke tests against the three frontend applications.

Keep one root `vitest.config.ts` rather than loading the frontend Vite configurations. This avoids
initializing TanStack Start and Tailwind plugins for API and package tests. The default environment is
Node. A React test opts into jsdom with a file-level Vitest environment annotation, keeping DOM
emulation out of every use-case, mapper, validator, and repository test.

Keep one root `playwright.config.ts` with one Chromium project per frontend. Each project owns its
`baseURL` and test selection. Playwright's `webServer` array starts `web`, `dashboard`, and `admin`
with deterministic public environment values and reuses existing local servers outside CI.

## Minimal Dependencies

Add exact development versions at the workspace root:

- `vitest`: test runner, assertions, spies, and module mocks.
- `@playwright/test`: E2E runner and Chromium automation.
- `@testing-library/react`: user-oriented React component queries and rendering.
- `jsdom`: DOM implementation used only by component tests.

Continue using `@nestjs/testing`, which is already installed by `apps/api`. Do not add Supertest,
MSW, Testing Library `jest-dom`, `user-event`, a coverage provider, or a database container in this
iteration.

Before installation, confirm current compatible releases against Node 24, Vite 7, React 19, and each
package's peer dependency contract. Pin the selected versions exactly per `STYLEGUIDE.md`.

## Vitest Configuration

Add a root `vitest.config.ts` that:

- Includes `apps/**/*.test.{ts,tsx}` and `packages/**/*.test.{ts,tsx}`.
- Excludes `e2e/`, build output, Playwright output, and generated route trees.
- Uses `node` as the default environment.
- Restores mocks and unstubs globals and environment variables after tests.
- Loads a deterministic test environment setup before modules are evaluated.
- Keeps Vitest globals disabled so test dependencies remain explicit.

Add a small setup file under a root `test/` directory. It supplies safe placeholders for the API
environment contract and must not read `apps/api/.env`. It must only define values needed during test
module imports and must never contain credentials or production resources.

Component test files opt into jsdom with `@vitest-environment jsdom`. They import React Testing
Library directly and perform explicit cleanup through a small DOM-specific setup or local hook. Do
not introduce a provider-heavy custom render helper until a real component test needs shared
providers.

## Existing Test Migration

Migrate all existing files from `node:test` and `node:assert/strict` to explicit Vitest imports:

- `test` remains the test declaration.
- Node strict assertions become Vitest `expect` matchers.
- Promise rejection assertions become `rejects` matchers.
- Manual `fetch`, logger, and environment replacements become `vi.stubGlobal`, `vi.spyOn`, and
  `vi.stubEnv` where applicable.

Thirteen API files currently use experimental `mock.module('@repo/db', ...)` followed by dynamic
imports. Replace these with hoist-safe Vitest module mocks. Mutable fake state used by mock factories
must be created with `vi.hoisted` or an equally explicit Vitest-supported pattern, then reset between
tests. Preserve the existing hand-written fake behavior rather than introducing another mocking
library.

Migrate by workspace so each step remains reviewable:

1. Shared packages (`common`, `db`, and `validators`).
2. API tests without module mocks.
3. API tests with module mocks and global state.
4. Dashboard and admin tests.
5. A representative frontend component test using React Testing Library.

Once every workspace uses Vitest, remove `tsx --test`, `--experimental-strip-types`,
`--experimental-test-module-mocks`, and all manually maintained file lists from test scripts.

## Script Contract

Add root commands with one clear purpose:

- `pnpm test`: run all Vitest tests once.
- `pnpm test:watch`: run Vitest in watch mode.
- `pnpm test:e2e`: run Playwright headlessly.
- `pnpm test:e2e:ui`: run Playwright UI mode for local development.

Workspace `test` scripts may remain as thin Vitest path filters when package-scoped execution is
useful. They must not duplicate configuration or enumerate individual files.

Keep tests separate from `pnpm check` so developers can run static checks and test suites
independently. CI runs both explicitly.

## Playwright Configuration

Place E2E specifications under root `e2e/` with app-specific files or directories. Configure:

- Chromium only.
- Projects named `web`, `dashboard`, and `admin`.
- Base URLs on ports 3001, 3002, and 3003 respectively.
- Three `webServer` entries using existing app development commands.
- Required non-secret `VITE_API_URL` values and `VITE_DASHBOARD_URL` for `web`.
- `reuseExistingServer: !process.env.CI`.
- Retries only in CI.
- Trace retention on the first retry or failure.
- HTML output that does not automatically open during headless execution.

The initial smoke tests verify that each application serves a stable public or guest route and
renders an app-specific accessible landmark or heading. Selectors should use roles, labels, or stable
visible behavior rather than CSS classes or implementation details. If a route currently depends on
an unavailable API, assert the stable shell or guest state without intercepting network requests.

Do not start the NestJS API or a database in this feature. Full-stack journeys require explicit data
isolation, CORS, seed, account, and cleanup contracts and belong in a later SDD feature.

## CI Integration

Integrate with the repository's GitHub Actions work from feature 029 rather than creating a competing
quality workflow. If the workflow does not exist when this feature is applied, add one minimal CI
workflow or coordinate the dependency before completing the CI task.

The test jobs use Node 24 and the repository-pinned pnpm version:

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Run `pnpm check` and `pnpm test`.
3. Install Chromium and its system dependencies with Playwright's supported command.
4. Run `pnpm test:e2e` in a separate step or job.
5. Upload Playwright reports and traces only when E2E execution fails.

Do not install Firefox or WebKit. Cache pnpm dependencies through the existing CI pattern; do not
cache `node_modules` or Playwright result directories.

## Affected Areas

| Path                                           | Planned change                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `package.json`                                 | Add pinned test dependencies and root test commands                     |
| `pnpm-lock.yaml`                               | Lock the selected test tool versions                                    |
| `vitest.config.ts`                             | Define root discovery, Node defaults, exclusions, and state restoration |
| `test/`                                        | Add deterministic non-secret test environment setup                     |
| `playwright.config.ts`                         | Define Chromium projects, app servers, URLs, retries, and traces        |
| `e2e/`                                         | Add one public smoke test for each frontend                             |
| `.gitignore`                                   | Ignore Playwright and optional test output                              |
| `apps/api/package.json`                        | Replace the explicit Node test command with Vitest                      |
| `apps/api/src/**/*.test.ts`                    | Migrate assertions, mocks, globals, and environment handling            |
| `apps/{web,dashboard,admin}/package.json`      | Add or normalize scoped Vitest commands                                 |
| `apps/{dashboard,admin}/test/*.test.ts`        | Migrate existing frontend tests to Vitest                               |
| `apps/{web,dashboard,admin}/**/*.test.tsx`     | Prove the scoped RTL/jsdom component pattern                            |
| `packages/{common,db,validators}/package.json` | Normalize package test commands                                         |
| `packages/{common,db,validators}/**/*.test.ts` | Migrate existing package tests to Vitest                                |
| `.github/workflows/ci.yml`                     | Run Vitest and Chromium E2E in the established CI workflow              |

## Verification Strategy

### Migration Verification

- Record the baseline count and result of all currently runnable tests before changing the runner.
- Confirm Vitest discovers every migrated file automatically.
- Confirm the two API tests omitted by the current explicit command execute successfully.
- Run workspace-scoped commands while migrating, then run the root suite.
- Repeat module-mock-heavy API files to detect leaked state or order dependence.

### Frontend Verification

- Run the representative React test and verify it has DOM APIs.
- Run a non-DOM frontend test and verify it remains in the Node environment.
- Confirm React Testing Library cleanup prevents DOM leakage between tests.

### E2E Verification

- Run all projects from a clean state and let Playwright start all three frontends.
- Run against already-running local servers and confirm they are reused.
- Run each project independently by project name.
- Force one controlled failure and verify the configured trace/report is produced.
- Confirm successful runs leave no tracked artifacts.

### Repository Verification

- Run `pnpm type-check`.
- Run `pnpm lint`.
- Run `pnpm format:check`.
- Run `pnpm test`.
- Run `pnpm test:e2e` after installing Chromium.
- Run CI with a clean checkout and no developer `.env` files.

## Risks

| Risk                                                       | Mitigation                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `vi.mock` hoisting changes fake initialization             | Use hoist-safe state and migrate mock-heavy files as a separate task       |
| API tests depend on ignored local environment              | Load deterministic placeholders before imports and prohibit `.env` loading |
| Global mutations leak across tests                         | Use Vitest stubs/spies and automatic restoration                           |
| jsdom slows all unit tests                                 | Keep Node as default and opt in per component test                         |
| Frontend Vite plugins interfere with package tests         | Use a dedicated root Vitest config instead of app Vite configs             |
| E2E startup is flaky on cold machines                      | Configure explicit server URLs and bounded startup timeouts                |
| E2E smoke assertions depend on changing copy               | Prefer stable roles and app-shell behavior over exact marketing text       |
| Feature 029 also owns CI configuration                     | Extend its workflow or coordinate before editing the same CI path          |
| Structural frontend tests provide weak behavioral evidence | Preserve them during migration; improve only when related UI changes occur |
