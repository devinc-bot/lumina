# Testing Toolchain Tasks

Complete one independently reviewable task at a time. Mark a task complete only after its listed
verification passes.

## Baseline and Configuration

- [x] **T1. Record the test baseline and add the root Vitest contract**
  - Record every existing test file and the current runnable test result before migration.
  - Add exact pinned Vitest, React Testing Library, and jsdom development dependencies.
  - Add the root Vitest configuration with Node defaults, disjoint discovery, and mock restoration.
  - Add deterministic non-secret API test environment values without reading a developer `.env`.
  - Add root one-shot and watch commands.
  - Verify Vitest can run a minimal Node test and a scoped jsdom React test.

## Shared Packages

- [x] **T2. Migrate shared package tests to Vitest**
  - Migrate tests in `packages/common`, `packages/db`, and `packages/validators`.
  - Replace Node assertions with Vitest expectations without changing tested behavior.
  - Normalize package-scoped test scripts without explicit file lists.
  - Verify each package independently and through the root unit command.

## API

- [x] **T3. Migrate API tests without module mocks**
  - Migrate API tests that do not use experimental `mock.module`.
  - Replace manual global, logger, fetch, and environment mutation with Vitest-supported stubs or
    spies where applicable.
  - Preserve current NestJS testing patterns and use the existing `@nestjs/testing` dependency.
  - Verify test state is restored and repeated execution is deterministic.

- [x] **T4. Migrate API module mocks and complete discovery**
  - Replace all experimental `mock.module('@repo/db', ...)` usage with hoist-safe `vi.mock` factories.
  - Reset mutable fake state between tests.
  - Remove dynamic imports that exist only to support Node's module mocking when Vitest no longer
    requires them.
  - Replace the API's manual test-file list with automatic Vitest discovery.
  - Verify every API test passes, including the two files omitted by the previous command.

## Frontends

- [x] **T5. Migrate existing dashboard and admin tests**
  - Migrate the existing source-reading and pure frontend tests to Vitest.
  - Keep these tests in the default Node environment.
  - Add thin package-scoped test commands for `dashboard` and `admin`.
  - Verify the migrated tests through package and root commands.

- [x] **T6. Establish the React component test pattern**
  - Add one representative component behavior test using React Testing Library.
  - Opt the test into jsdom without changing the global Vitest environment.
  - Ensure DOM cleanup runs between tests without enabling Vitest globals.
  - Avoid a custom provider render helper unless the selected component requires one.
  - Verify the component test and a Node frontend test can run in the same suite.

## End-to-End

- [x] **T7. Add the minimal Playwright configuration**
  - Add an exact pinned `@playwright/test` development dependency.
  - Configure Chromium projects for `web`, `dashboard`, and `admin`.
  - Configure frontend server startup, non-secret public environment values, local server reuse,
    CI-only retries, and failure traces.
  - Add headless and UI-mode root commands.
  - Ignore Playwright reports and result artifacts.
  - Verify Playwright can start and stop all three frontend servers from a clean state.

- [x] **T8. Add one public smoke test per frontend**
  - Verify a stable public or guest route for `web`, `dashboard`, and `admin`.
  - Use accessible selectors and avoid CSS implementation details.
  - Keep tests independent from API startup, database state, seeded accounts, and external services.
  - Verify all projects together and each project independently.

## CI and Documentation

- [x] **T9. Integrate the suites into CI**
  - Extend the CI workflow established by feature 029, or add the minimal workflow if it remains
    absent when this task starts.
  - Use Node 24 and the repository-pinned pnpm version.
  - Run static checks and Vitest before Playwright.
  - Install Chromium and its system dependencies without installing other browsers.
  - Upload Playwright diagnostics only on failure.
  - Verify a clean CI checkout succeeds without local `.env` files or secrets.

- [x] **T10. Remove obsolete runner usage and verify acceptance**
  - Remove all `node:test`, `node:assert`, experimental test flags, and manual test-file lists.
  - Document the four root testing commands and the boundary between Vitest and Playwright.
  - Run type-check, lint, format check, the complete Vitest suite, and all Playwright projects.
  - Confirm generated output is ignored and no optional out-of-scope testing dependency was added.
  - Record evidence that every requirement and Definition of Done item passes.
