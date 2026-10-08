# Plan 051 - Location Form Validation i18n

## Approach

1. Add a regression test for the location form's use of the shared validation-error resolver.
2. Replace raw field-error extraction in `LocationForm` with `useResolveFieldError` from `@repo/i18n/client`.
3. Verify the dashboard package and i18n catalogs without changing existing generated route trees.

## Affected Areas

- `apps/dashboard/app/modules/locations/components/location-form.tsx`
- `apps/dashboard/test/`
- `spec/features/active/051-location-form-validation-i18n/`

## Contracts and Data

No API, validator, database, or persisted-data changes. Location validators continue emitting shared `validation:` message keys.

## Verification

- Dashboard regression test
- `pnpm --filter @repo/dashboard type-check`
- `pnpm --filter @repo/i18n check:i18n`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
