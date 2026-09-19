## Context

Events currently store one concrete `startsAt` and `endsAt` value, and tickets, orders, public URLs, and discovery queries all target that event. The dashboard sends create and update forms as multipart requests, the API validates them with `@repo/validators`, and event repositories persist them through Drizzle.

This MVP needs owners to create a bounded schedule while retaining concrete, independently sellable events. The browser timezone is the agreed calendar authority for generating occurrences. The current event start and end values define the first occurrence and its duration, including a finish on the following calendar day.

## Goals / Non-Goals

**Goals:**

- Store a series that identifies the owner-visible recurrence configuration and groups generated events.
- Generate all selected weekday occurrences through an inclusive, required end date in one atomic create operation.
- Preserve the source event duration for every occurrence and store each generated date as ordinary event timestamps.
- Support weekly and monthly selections with Monday-through-Sunday checkboxes; monthly means every selected weekday occurring in each calendar month in the bounded range.
- Preserve event independence for tickets, edits, publishing, and cancellation.

**Non-Goals:**

- Background generation, open-ended recurrence, ticket templates, shared stock, bulk occurrence changes, or public series grouping.
- Location- or organization-level timezone management.
- Ordinal monthly rules, such as the first Friday, or excluded dates.

## Decisions

### Persist a series and concrete occurrences

Create an `event_series` table with the organization and location ownership context, cadence, selected weekday values, recurrence start and end dates, and browser IANA timezone. Add nullable `series_id` and `original_starts_at` columns to `events`.

Creating a recurring form submission creates one series and a concrete event row for every generated start date within a database transaction. Occurrences inherit the form's name, description, location, status, FAQs, and image associations. Ticket types are not copied; each occurrence uses the existing ticket configuration flow.

This is preferred over virtual recurrence because tickets, sales, event status, and public pages already require a discrete event. A series-only record would force recurrence calculation into every existing consumer and make per-date changes unsafe.

### Generate date-local occurrences from the first event's duration

The form's initial `startsAt` establishes the recurrence start date and local start time. `endsAt - startsAt` establishes the duration, so an event ending after midnight remains correct for all generated dates. The required recurrence end date limits eligible occurrence start dates inclusively.

The dashboard sends the browser IANA timezone with recurring input. The API uses that zone to enumerate local calendar days and converts each local start and duration into stored timestamps. It rejects an end date before the initial event date or a recurrence configuration that produces no occurrence through the shared validator contract.

Persisting the zone avoids applying a later server timezone to an owner-created schedule. A browser-zone approach is intentionally minimal and does not represent the venue's timezone if they differ.

### Treat cadence as configuration, not an interval multiplier

For this MVP, both weekly and monthly enumerate every selected weekday within the bounded date range. The selected cadence is persisted and displayed so the product can later add distinct monthly patterns without a data migration. The monthly label communicates the owner's grouping intent; it does not mean a fixed day-of-month or ordinal week rule.

### Keep generated events independently editable and cancellable

The ordinary event update endpoint edits only the requested occurrence. Its `originalStartsAt` remains the generated timestamp when an occurrence is manually reprogrammed. Cancellation sets a new `cancelled` event status rather than deleting the event, preserving purchase and audit history. Existing delete behavior remains for non-series events only; a series occurrence is cancelled through the owner dashboard.

### Prevent shared image deletion

Generated events reuse existing image assets through the event-assets relation. Image deletion must remove the physical asset only when it no longer has an event relation, so editing or removing images from one occurrence cannot break inherited images on its siblings.

## Risks / Trade-offs

- [Browser timezone differs from venue timezone] → Persist the submitted IANA timezone and document the MVP behavior; location timezone is deferred.
- [DST changes local offsets] → Generate using local dates in the persisted timezone rather than adding fixed 24-hour intervals.
- [Large date ranges create too many rows] → Enforce an upper occurrence limit in `@repo/validators` and show the generated count before submission.
- [Shared image assets are removed by one occurrence] → Guard physical asset deletion by relation count.
- [A partial failure creates an incomplete series] → Generate the series, events, FAQ links, and image links in one repository transaction.
- [Existing delete endpoint destroys an occurrence with sales] → Route series occurrences to cancellation and reject their delete requests.

## Migration Plan

1. Add timestamp-prefixed Drizzle migration for `event_series`, `events.series_id`, `events.original_starts_at`, and the cancelled status support.
2. Deploy schema, repositories, contracts, and API generation before exposing dashboard controls.
3. Existing events remain non-recurring with null series fields and continue through their current create, edit, and delete paths.
4. Roll back application exposure before rolling back schema; added nullable columns and the new table do not require data migration.

## Open Questions

- None for the bounded MVP.
