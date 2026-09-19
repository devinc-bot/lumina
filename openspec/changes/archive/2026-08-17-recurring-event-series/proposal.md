## Why

Owners need to schedule repeating nightlife programming without manually creating each dated event. Creating concrete occurrences keeps ticket inventory, sales, status, and public event pages tied to a specific date while allowing a single form submission to set up a recurring schedule.

## What Changes

- Add a recurring-event option to the dashboard event creation form.
- Let owners select a weekly or monthly cadence, one or more weekdays from Monday through Sunday, and a required recurrence end date.
- Generate one independent dated event for every selected weekday in the requested range when the recurring event is created.
- Persist a series record that groups its generated event occurrences and preserves the selected cadence and weekdays.
- Keep every generated occurrence compatible with existing ticket and sales flows as an ordinary event.
- Allow an owner to edit or cancel a single generated occurrence without changing other occurrences in the series.

## Non-goals

- Indefinite series or background generation of future occurrences.
- Ticket templates or shared ticket inventory across occurrences.
- Bulk edits to all or future occurrences.
- Pausing, resuming, excluding dates, holiday rules, or ordinal monthly patterns such as the second Friday.
- Grouping recurring events in the public catalogue.

## Capabilities

### New Capabilities

- `recurring-event-series`: Create a bounded recurring schedule, persist its series metadata, and generate independently sellable event occurrences.

### Modified Capabilities

- None.

## Impact

- `apps/dashboard`: recurring controls, occurrence-aware edit and cancellation UI, and localized copy.
- `apps/api`: event creation orchestration and ownership-protected occurrence operations.
- `packages/db`: `event_series` schema, event-to-series relationship, repositories, and a timestamp-prefixed migration.
- `packages/validators` and `packages/types`: recurrence input, domain constants, and event response contracts.
- `packages/i18n`: Spanish and English dashboard and validation copy.
- `apps/web` and `packages/ui`: no functional change in this MVP; generated occurrences continue using existing public event rendering and shared form components.
