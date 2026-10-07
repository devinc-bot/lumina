# Spec 052 - Event Location Image Preview

## Context and Objective

Event creators choose a venue while creating or editing an event. Showing the selected location's existing image beside the selection helps staff confirm they picked the intended venue without leaving the form.

## Users / Actors

- Organization owners and staff who create or edit events in the dashboard.

## User Stories

- H1: As an event manager, I want to see the selected location's image so that I can confirm the venue visually.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a selected location has at least one image, THE SYSTEM SHALL display a thumbnail of its first image in the selector trigger and in its dropdown option.
- RF-2: WHEN the selected location changes, THE SYSTEM SHALL update the preview to the newly selected location's first image.
- RF-3: IF the selected location has no image, THEN THE SYSTEM SHALL display a neutral location icon in the thumbnail area.
- RF-4: WHILE no location is selected, THE SYSTEM SHALL omit the image preview.
- RF-5: THE SYSTEM SHALL preserve the location name as the accessible text for each option and selected value while treating adjacent thumbnails and fallback icons as decorative.

## Non-Functional Requirements

- The preview SHALL remain usable on narrow screens and support both dashboard themes.
- The change SHALL use the existing location response data and introduce no new API or persisted fields.

## Edge Cases

- A location with multiple images uses only its first image.
- A location with no image keeps a visible location icon in its thumbnail area.
- A selected location ID that is not present in the loaded locations has no preview.

## Out of Scope

- Adding, editing, or reordering location images.
- Previewing event images or adding location details beyond the requested image.

## Definition of Done

- The selected location image appears in create and edit event forms when available, updates when selection changes, and a location icon appears when no image is available.
- The location name remains available to assistive technology, and the change passes applicable formatting and diff checks.

## Open Questions

None.
