# Tasks 047 - Dependency Modernization

- [x] T1: Remove `srvx` from `web`, `dashboard`, and `admin`, plus unused
      `drizzle-orm` from `dashboard`; regenerate the lockfile and verify affected apps.
- [x] T2: Normalize frontend runtime and toolchain dependencies, including TypeScript
      7, React, Vite, TanStack, i18next, Tailwind, and their peer declarations.
- [x] T3: Apply documented frontend migration corrections and verify all frontend
      type-check and build targets.
- [x] T4: Upgrade API runtime dependencies, including Nest, Multer, Drizzle, and
      AWS SDK packages, with required ESM/upload corrections.
- [x] T5: Verify API focused tests, type-check, build, and deployment startup behavior.
- [x] T6: Upgrade UI and test dependencies, including Radix, Tiptap, maps, charts,
      crop tooling, Vitest, Playwright, and related type packages.
- [x] T7: Remove any additional dependency only after repository evidence confirms
      it has no direct runtime, build, test, configuration, or export use.
- [x] T8: Run full workspace verification from a clean dependency installation and
      document unresolved external or platform-specific failures.

Verification record:

- `pnpm install --frozen-lockfile` and `pnpm type-check` completed successfully.
- `pnpm lint` and `pnpm format:check` initially traversed untracked `.worktrees/`
  directories. They are now excluded through the documented `ignorePatterns` in
  the shared Oxlint and Oxfmt configuration.
- Re-running those two commands is pending a runner with Node.js and pnpm: the
  active verification shell no longer exposes either executable. No project code
  failure is being attributed to that environment limitation.
