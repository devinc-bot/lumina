# Plan 055 - Ticket Type Required Message

## Technical Approach

Add a form-only ticket type identifier schema that trims and rejects empty values with a localized required message before piping non-empty values through the existing UUID schema. Keep the API ticket schema on the existing UUID validator. Add Spanish and English validation copy and focused validator regression coverage for empty, malformed, and valid values.

## Affected Areas

- `packages/validators/src/ticket.ts`
- `packages/validators/test/ticket.test.ts`
- `packages/i18n/src/locales/validation/es.json`
- `packages/i18n/src/locales/validation/en.json`

## Verification Strategy

- Test importance is high because the change is a form validation fix; use TDD for the empty-value regression.
- Run the focused validator test and `git diff --check`.
