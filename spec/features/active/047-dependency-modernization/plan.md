# Plan 047 - Dependency Modernization

## Technical Approach

Deliver the work as independent migration slices rather than a blind all-at-once
upgrade. The current workspace already contains direct-version changes that must be
normalized with their consumers and lockfile. Each slice will review official
documentation, make only required code/configuration corrections, install through
pnpm, and run focused verification before moving to the next slice.

The root `packageManager` field pins pnpm 12.4.2 exactly. Existing `pnpm/action-setup` steps
resolve that version from the root manifest, keeping local Corepack and CI package-manager
selection aligned. The pin omits an integrity suffix to retain compatibility with Corepack versions
that accept only a semver version in this field.

`setup.sh` provides a repeatable shell setup path: it installs and selects the Node.js LTS through
`nvm`, clears Corepack's cache, installs the pinned pnpm version globally, and reports the active
pnpm version. It requires a Bash environment with the Unix `nvm` implementation, such as Git Bash
or WSL; it does not run in stock PowerShell with nvm-windows. `.gitattributes` preserves LF line
endings for the script on Windows workstations.

pnpm 12 reads workspace-level package extensions and peer dependency rules from
`pnpm-workspace.yaml`, so those settings move from the legacy root manifest field. The seven-day
minimum-release-age policy remains enabled; dependencies blocked by it are re-resolved to older,
eligible versions rather than adding policy exceptions. Strict mode prevents pnpm from adding
minimum-release-age exclusions automatically when an ineligible lockfile is encountered.

The root workspace catalog owns the shared React, Zod, TypeScript, and Node type versions.
Workspace manifests use the `catalog:` protocol, preventing those version declarations from
drifting while retaining exact resolved versions.

The `db` and `types` packages intentionally form a source-level dependency cycle. The root
type-check command disables recursive task ordering only for `tsc --noEmit`, where neither package
produces an artifact for the other to consume; build and other recursive tasks retain graph ordering.

## Migration Slices

| Slice               | Scope                                                 | Key risks                                       | Verification                                          |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Cleanup             | Remove proven-unused direct dependencies              | Accidental removal of build-time use            | Manifest/lockfile install and affected builds         |
| Frontend toolchain  | TypeScript, Vite, React, TanStack, i18n, Tailwind     | Vite 8 and typed i18n compatibility             | Type-check and builds for all frontends               |
| API runtime         | Nest, Multer, Drizzle, AWS SDK                        | Nest 12 ESM and upload compatibility            | API tests, type-check, build, health startup          |
| UI and test tooling | Radix, Tiptap, charts, maps, crop, Vitest, Playwright | Public component APIs and test runtime changes  | UI build, component tests, Storybook where applicable |
| React Compiler lint | `web`, `dashboard`, `admin`, and `ui` React warnings  | Pagination resets and browser/SDK subscriptions | Focused tests, workspace lint, type-check             |

## Compatibility Decisions

- TypeScript 7 requires supported tsconfig options; the root configuration already
  uses `ES2022` and `bundler` module resolution, which are compatible.
- Vite 8 requires Node `^20.19.0 || >=22.12.0`; the Node 24 LTS baseline meets that requirement,
  so local and deployment documentation must remain aligned.
- Nest 12 is an ESM migration and cannot be treated as a manifest-only bump; it is
  isolated from frontend and cleanup work.
- i18n peer declarations must use versions compatible with all workspace consumers;
  exact incompatible peer declarations are corrected before installation.
- React Compiler warnings that indicate impure render work or render-time ref
  access are corrected at their source. `set-state-in-effect` and
  `preserve-manual-memoization` remain disabled because this workspace uses
  Effects to synchronize browser APIs, SDK instances, and query-driven UI state;
  the compiler rules cannot distinguish those required synchronizations from
  derived state.

## Files Expected to Change

| Area                  | Files                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| Dependency manifests  | Root, app, and shared-package `package.json` files                                   |
| Resolution            | `pnpm-lock.yaml`                                                                     |
| Migration corrections | Only source/configuration files required by official migration guidance              |
| Documentation         | These three feature artifacts and any runtime documentation affected by requirements |

## Verification Strategy

- `pnpm install --frozen-lockfile`
- Focused type-check/build/test commands for the affected package or app
- `pnpm lint`, `pnpm format:check`, and `git diff --check` before each completed slice
- CI validation from a clean Linux installation for final confirmation

## Rollback

Each slice is committed independently. Reverting its manifest edits and matching lockfile
changes restores the prior dependency graph without affecting other modernization slices.
