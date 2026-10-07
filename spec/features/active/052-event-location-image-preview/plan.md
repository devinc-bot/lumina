# Plan 052 - Event Location Image Preview

## Technical Approach

Use the existing `LocationResponse.images` array already loaded by the event form. Extend the shared select primitives with optional leading content for options and optional custom selected-value content. In `EventLocationField`, use the first image as a decorative thumbnail in each option and beside the selected location name in the trigger. Show a muted location icon in the same thumbnail area when an image is unavailable. Preserve the accessible text value and keep the existing selector label, error behavior, and keyboard interaction intact.

## Affected Areas

- `apps/dashboard/app/modules/events/components/event-location-field.tsx`
- `packages/ui/src/components/ui/select.tsx`

No API, database, validator, shared type, or i18n changes are required.

## Verification Strategy

- Visually inspect the component logic for selection changes, missing images, responsive sizing, and both themes.
- Run the most specific available type, lint, or formatting check if the toolchain is available.
- Run `git diff --check`.

Test importance is low: this is a small presentational enhancement with no new behavior contract beyond conditionally rendering existing data.
