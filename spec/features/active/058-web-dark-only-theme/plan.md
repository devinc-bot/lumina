# Plan 058 - Web Dark-Only Theme

## Status

In progress.

## Technical Approach

1. Remove every application's theme boot script and `ThemeProvider` wrappers. Each server document
   already declares `data-theme="dark"` and `colorScheme: 'dark'`, so it remains dark before and after
   hydration without reading a stored preference.
2. Remove `ThemeToggle` from both public landing headers and remove `AppShellThemeSwitcher` from
   dashboard and admin sidebars, retaining language, navigation, account, and mobile-menu controls.
3. Replace the event-detail map's theme-context dependency with its fixed dark theme prop.
4. Remove the shared stylesheet's `html[data-theme='light']` token override and replace its
   light-only loader assertions with dark-token coverage. Preserve unrelated theme primitives and
   translations to keep the change focused.

## Affected Layers

- `apps/web/app/routes/__root.tsx`
- `apps/web/app/modules/common/components/landing-header.tsx`
- `apps/web/app/modules/events/components/event-detail/event-detail-map.tsx`
- `apps/dashboard/app/routes/__root.tsx`
- `apps/dashboard/app/modules/common/components/app-shell.tsx`
- `apps/dashboard/app/modules/landing/components/landing-header.tsx`
- `apps/admin/app/routes/__root.tsx`
- `apps/admin/app/modules/common/components/app-shell.tsx`
- `apps/admin/test/session-infrastructure.test.ts`
- `packages/ui/src/globals.css`
- `packages/ui/src/components/ui/loader.test.tsx`
- `spec/features/active/058-web-dark-only-theme/`

## Verification Strategy

- This is a low-test-importance presentation/configuration change. No new automated tests are required.
- Run the focused UI, web, dashboard, and admin type checks and formatting check when Node.js/pnpm are available, plus
  `git diff --check`.
- Review public landing/navigation, dashboard/admin sidebars, error/not-found states, and event-detail
  maps in dark mode at mobile and desktop widths.

## Risks and Mitigations

- A stored light preference could create a flash or override a document: remove each application's
  boot script and provider rather than merely hiding its switch.
- `EventDetailMap` currently consumes theme context: give it the explicit dark map style before removing
  the provider.
- Shared runtime edits could introduce unrelated regressions: leave unused shared tokens and primitives
  intact while removing every application consumer.
- Removing the light CSS block could leave stale static expectations: update only loader assertions that
  inspect it and retain dark contrast coverage.
