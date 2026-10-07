# Spec 054 - Ticket Event Image Preview

## Context and Objective

When ticket managers choose an event for a ticket, the form currently shows only its name and location. Displaying the event's existing image in the event selector helps confirm the intended event without leaving the form.

## Users / Actors

- Organization owners and staff who create or edit tickets in the dashboard.

## User Stories

- H1: As a ticket manager, I want to see an event image while selecting an event so that I can confirm the intended event visually.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an event has at least one image, THE SYSTEM SHALL display a thumbnail of its first image in the selector trigger and its dropdown option.
- RF-2: WHEN the selected event changes, THE SYSTEM SHALL update the preview to that event's first image.
- RF-3: IF an event has no image, THEN THE SYSTEM SHALL display a neutral event icon in the thumbnail area.
- RF-4: WHILE no event is selected, THE SYSTEM SHALL omit the image preview.
- RF-5: THE SYSTEM SHALL preserve the event name and location as accessible option text while treating thumbnails and fallback icons as decorative.

## Non-Functional Requirements

- The preview SHALL remain usable on narrow screens and support both dashboard themes.
- The change SHALL use event data already loaded by the ticket form and introduce no API or persisted fields.

## Edge Cases

- An event with multiple images uses only its first image.
- An event without an image keeps a visible neutral icon in its thumbnail area.
- A selected event ID absent from the loaded events has no preview.
- Long event and location names remain readable without overflowing the selector.

## Out of Scope

- Showing an expanded event card or event details outside the selector.
- Adding or editing event images.

## Definition of Done

- The selected event image appears in create and edit ticket forms when available, updates when selection changes, and a neutral icon appears when no image is available.
- Event name and location text remain available to assistive technology; the change passes applicable formatting and diff checks.

## Open Questions

None. This uses the same selected-value and dropdown-option pattern as the event location image preview.
