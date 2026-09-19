# Plan 048 - Landing Header Scale

## Approach

The `LandingLogo` component owns the semantic `header` size shared by both
landing headers. Reduce that variant from 80 px to 56 px, then reduce each
landing header container from 96 px to 72 px and its brand link to the matching
56 px height. Adjust the public web shell top offset to clear the smaller fixed
header. Both authentication route groups already render through one app-level
shell, so replace their generic `AppLogo` imports with the same localized
`LandingLogo` component used by the landing headers.

`AppLogo` remains the right primitive for application chrome and document icons.
Update its default asset path to `favicon.png`; that file already exists in `web`
and `dashboard`, and is copied into `admin` before deleting the obsolete `logo.png`
assets from all three public directories.

## Affected Areas

- `packages/ui/src/components/ui/landing-logo.tsx`
- `apps/web/app/modules/common/components/landing-header.tsx`
- `apps/web/app/modules/common/components/public-app-shell.tsx`
- `apps/dashboard/app/modules/landing/components/landing-header.tsx`
- `apps/web/app/modules/auth/components/auth-page-layout.tsx`
- `apps/dashboard/app/modules/auth/components/auth-shell.tsx`
- `apps/{web,dashboard,admin}/public/landing/{favicon,logo}.png`

## Verification

- Inspect the resulting shared dimensions and touch-target classes.
- Run the `web` and `dashboard` type-check commands when Node.js/pnpm are
  available.
- Run `git diff --check`.
