# Plan 052 - Settings Form Validation i18n

## Approach

1. Add a regression test for mapping settings validation messages through a resolver.
2. Resolve each Zod issue message in the shared settings provider before exposing field errors to owner or staff forms.
3. Preserve the existing validation paths, error focus, save flow, and non-validation messages.

## Affected Areas

- `apps/dashboard/app/modules/settings/utils/settings-form.utils.ts`
- `apps/dashboard/app/modules/settings/hooks/settings-form-context.tsx`
- `apps/dashboard/test/`
- `spec/features/active/052-settings-form-validation-i18n/`

## Contracts and Data

No API, validator, database, or persisted-data changes. Existing `validation:` message keys and translation catalogs remain the source of truth.

## Verification

- Dashboard regression test using the package's Node test runner
- `pnpm --filter @repo/dashboard type-check`
- Scoped lint and formatting checks for changed files
- `git diff --check`
