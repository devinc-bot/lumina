# Spec 059 - Ticket Sale Window Validation

## Context and Objective

Ticket sale dates are currently optional and the ticket contract does not ensure that a sale window closes before its selected event begins. Require both dates and protect owners from configuring an invalid ticket sale window in the dashboard and API.

## Users / Actors

- Organization owners who create or edit tickets in the dashboard.

## User Stories

- H1: As an owner, I want the ticket sale window validated against its event so that sales are configured to end before the event starts.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an owner creates or updates a ticket, THE SYSTEM SHALL require a sale start date and a sale end date.
- RF-2: WHEN a ticket sale start is later than its sale end, THE SYSTEM SHALL reject the ticket and show a localized field error.
- RF-3: WHEN a ticket sale end is later than the selected event start, THE SYSTEM SHALL reject the ticket and show a localized field error.
- RF-4: WHEN an owner submits a valid sale window ending at or before the selected event start, THE SYSTEM SHALL allow the ticket to be persisted.
- RF-5: THE SYSTEM SHALL enforce the sale-window rules in the shared validation contract and in the owner-authorized API use cases.

## Non-Functional Requirements

- Error copy SHALL be localized in Spanish and English.
- The API SHALL remain authoritative for the event-start comparison.

## Edge Cases

- A sale start equal to the sale end is valid because the start must not be later than the end.
- A sale end equal to the event start is valid.
- Editing a ticket after changing its event must validate against the newly selected event.

## Out of Scope

- Changing an event's start date based on existing tickets.
- Restricting ticket purchases outside the existing sale-window behavior.

## Definition of Done

- The dashboard requires both sale date inputs and displays localized field errors for invalid chronology.
- The API rejects invalid sale windows even for requests that bypass the dashboard.
- Focused validator and API regression tests cover accepted and rejected boundaries.

## Open Questions

Resolved: equal timestamps are permitted; only a sale start later than its end or a sale end later than its event start is rejected.
