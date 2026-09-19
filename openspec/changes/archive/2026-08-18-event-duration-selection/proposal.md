## Why

Event organizers must currently calculate and enter an exact end date and time. Selecting an approved duration from the event start time is faster and prevents invalid or inconsistent schedules.

## What Changes

- Replace the event end-date input with a sanitized numeric duration input in the dashboard event form.
- **BREAKING** Replace the event create and update request field `endsAt` with `durationHours`.
- Validate durations from one to seventy-two hours in half-hour increments in the shared event contracts.
- Calculate the persisted `endsAt` value on the backend from `startsAt` and `durationHours`.
- Preserve the existing `endsAt` database column and public event response shape.

## Capabilities

### New Capabilities

- `event-duration-selection`: Event scheduling with an approved duration selector and server-calculated end timestamp.

### Modified Capabilities

- None.

## Impact

- Affected apps: `api`, `dashboard`; public `web` event displays continue consuming the existing end timestamp.
- Affected packages: `validators`, `types`, `db`; no database migration is required because `endsAt` remains persisted.
- API consumers creating or updating events must send `durationHours` instead of `endsAt`.

## Non-goals

- Changing public event schedule presentation.
- Persisting the selected duration as a separate database field.
- Supporting durations below one hour, above seventy-two hours, or increments smaller than half an hour.
