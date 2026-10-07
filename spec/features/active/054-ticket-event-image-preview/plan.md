# Plan 054 - Ticket Event Image Preview

## Technical Approach

Use the `EventResponse.images` data already returned by the owner events query used in the ticket form. Extend the event selector trigger with decorative thumbnail content for the selected event and each option, using the first event image or a neutral event icon when no image exists. Keep event name and location text in the accessible option value and preserve existing loading, error, and validation behavior.

## Affected Areas

- `apps/dashboard/app/modules/tickets/components/ticket-form.tsx`

The shared select primitives already support leading option content and custom selected-value content. No API, database, validator, shared type, or i18n changes are required.

## Verification Strategy

- Test importance is low because this is a presentational enhancement using data already loaded by the form.
- Review selected and unselected states, missing images, long labels, narrow layouts, theme-safe styling, and accessibility semantics.
- Run applicable formatting/lint checks if tooling is available and `git diff --check`.
