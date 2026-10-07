# Plan 053 - Ticket Location Capacity Validation

## Technical Approach

Resolve the selected event's location capacity for owner-authorized ticket create and update operations, enforce the approved capacity rule in the API before persistence, and make capacity available to the dashboard ticket form for immediate quantity field feedback. Keep the server authoritative and localize the field validation message in `@repo/i18n`.

The capacity rule is aggregate: all configured ticket quantities for an event, including inactive tickets, must fit the location capacity. On update, exclude the current ticket's old quantity before evaluating its submitted event and quantity. Enforce this atomically with an event-row lock so concurrent ticket writes cannot both exceed the same capacity. Include remaining configured capacity in owner event responses used by the dashboard to provide field-level feedback.

## Affected Areas

- `packages/types` event response contract
- `apps/api` event mapper and ticket create/update use cases
- `packages/db` repository transactions and event ticket-capacity query
- `apps/dashboard/app/modules/tickets/components/ticket-form.tsx`
- `packages/i18n` validation locales
- API and dashboard focused tests

## Verification Strategy

- Test importance is high because this is ticket inventory business logic and a capacity invariant.
- Use TDD for API create/update boundary behavior and dashboard field validation.
- Run focused API and dashboard tests, `pnpm type-check`, applicable lint/format checks, and `git diff --check` when tooling is available.

## Confirmed Decision

- Location capacity limits the sum of all ticket quantities configured for an event. Inactive ticket types are included.
