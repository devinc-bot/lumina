# Spec 062 - Staff Invitation Password Errors

## Context and Objective

The staff invitation acceptance form validates password confirmation together with the rest of the form. Errors from unrelated fields can consequently appear under the confirmation field. This change keeps each validation message attached to its own field.

## Users / Actors

- Invited staff accepting an invitation in the dashboard.

## User Stories

- H1: As invited staff, I want validation errors displayed beside the field that caused them so that I can correct the right value.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an unrelated field is invalid during staff invitation acceptance, THE SYSTEM SHALL display that field's validation error only on that field.
- RF-2: WHEN the password and confirmation do not match, THE SYSTEM SHALL display the password mismatch error on the confirmation field.

## Non-Functional Requirements

- User-facing validation messages remain localized through `@repo/i18n`.

## Edge Cases

- Multiple fields may be invalid at the same time; each error remains associated with its corresponding field.

## Out of Scope

- Changing staff invitation requirements, validation rules, or API contracts.

## Definition of Done

- The confirmation validator reports only errors belonging to the confirmation field, while existing field validation and password mismatch behavior remain intact.
- Applicable verification and review are complete.

## Open Questions

None.
