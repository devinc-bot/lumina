# Spec 055 - Ticket Type Required Message

## Context and Objective

When a ticket manager submits the ticket form without choosing a ticket type, the field reports that the ID format is invalid. The form should explain that a ticket type must be selected.

## Users / Actors

- Organization owners and staff who create or edit tickets in the dashboard.

## User Stories

- H1: As a ticket manager, I want a clear required-field message when no ticket type is selected so that I know how to correct the form.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN the ticket type field is empty on form submission, THE SYSTEM SHALL show a localized message instructing the user to select a ticket type.
- RF-2: WHEN the ticket type field contains a non-empty malformed identifier, THE SYSTEM SHALL continue to report an invalid identifier format.
- RF-3: THE SYSTEM SHALL preserve UUID validation for ticket type identifiers in API input schemas.

## Non-Functional Requirements

- The field error SHALL be localized in Spanish and English.

## Edge Cases

- An empty or whitespace-only ticket type value is treated as missing.
- Valid ticket type UUIDs remain accepted.

## Out of Scope

- Changing ticket type identity or API contracts.
- Changing validation for other ticket form fields.

## Definition of Done

- Empty ticket type submissions show the localized selection message, malformed non-empty values remain invalid UUIDs, and API validation remains unchanged.
- The focused validator regression tests pass and `git diff --check` is clean.

## Open Questions

None.
