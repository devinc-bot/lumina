# Spec 053 - Ticket Location Capacity Validation

## Context and Objective

Ticket creation and editing currently accept a quantity that can exceed the capacity of the location hosting the event. Validate ticket inventory against the selected event's location capacity so owners cannot configure more tickets than the venue can hold.

## Users / Actors

- Organization owners and staff who create or edit tickets in the dashboard.

## User Stories

- H1: As a ticket manager, I want ticket quantity validated against the event location capacity so that configured tickets fit the venue.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a ticket is created or edited, THE SYSTEM SHALL reject a quantity when the sum of configured ticket quantities for the selected event, including the submitted ticket quantity, exceeds the event location's capacity.
- RF-2: WHEN the quantity exceeds the capacity limit, THE SYSTEM SHALL show a localized field error and SHALL NOT persist the ticket.
- RF-3: THE SYSTEM SHALL enforce the capacity rule in the API as well as the dashboard form.
- RF-4: THE SYSTEM SHALL allow a total configured ticket quantity equal to the location capacity.
- RF-5: WHEN editing a ticket, THE SYSTEM SHALL exclude that ticket's previous quantity from the event total before applying the submitted quantity.

## Non-Functional Requirements

- Capacity values SHALL use the existing location capacity contract and remain isolated to owner-authorized events.
- Error copy SHALL be localized in Spanish and English.

## Edge Cases

- Editing a ticket must validate against the event selected in the update request.
- An event without an owned location must retain existing not-found behavior.
- Capacity may be stored as a numeric string and must be compared without lossy parsing.

## Out of Scope

- Changing a location's capacity based on existing ticket inventory.
- Changing checkout reservation or sale-time inventory behavior.

## Definition of Done

- Create and edit reject over-capacity quantities in the dashboard and API, accept quantities at the limit, and display localized field errors.
- Focused regression tests cover the boundary and rejection behavior.

## Open Questions

Resolved: location capacity limits the sum of all configured ticket quantities for the event. Inactive ticket types count toward capacity because they remain configured inventory.
