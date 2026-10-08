# Plan 059 - Ticket Sale Window Validation

## Technical Approach

Make `saleStartsAt` and `saleEndsAt` required in the shared ticket form and API schemas while retaining the existing cross-field chronology refinement. Add a shared ticket sale-window predicate for the API use cases to compare the parsed sale end with the owner-authorized event's `startsAt`. The dashboard will mark both date inputs as required, remove the clear/optional state, and use the shared schema for immediate validation. The API will return a localized ticket error before persistence.

## Affected Areas

- `packages/validators` ticket form and request contracts
- `packages/i18n` validation and API error translations
- `apps/api` ticket create and update use cases
- `apps/dashboard` ticket form labels and sales-date controls
- Focused validator and API tests

## Verification Strategy

- Test importance is high because this is ticket-sale business validation and an API data-integrity invariant.
- Use TDD: first add focused failing validator and API use-case regressions, then implement the minimum behavior.
- Run focused package and API tests, `pnpm type-check`, applicable lint/format checks, and `git diff --check`.

## Confirmed Decision

- Equal timestamps are valid; a sale start later than its end or a sale end later than its event start is not.
