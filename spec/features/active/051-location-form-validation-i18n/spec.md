# Spec 051 - Location Form Validation i18n

## Context and Objective

The dashboard location form currently renders validator message keys such as `validation:field.location.name` instead of localized messages. This fix makes validation feedback use the existing shared translation resolver.

## Users / Actors

- H1: As an owner, I want to read validation errors in my selected language so that I can correct a location form confidently.

## User Stories

- H1: As an owner, I want location form validation errors to be localized so that I understand what to fix.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN location field validation fails, THE SYSTEM SHALL display the corresponding localized validation message instead of its `validation:` key.
- RF-2: WHEN a location form field has no validation error, THE SYSTEM SHALL preserve its current error-free display.

## Non-Functional Requirements

- The fix shall reuse the shared i18n validation-error resolver.
- Spanish and English validation catalogs shall remain supported.

## Edge Cases

- Non-validation messages, including map lookup failures, remain unchanged.

## Out of Scope

- Changes to location validation rules or translation catalog copy.
- API validation responses.

## Definition of Done

- A regression test verifies that the location form resolves validation errors through the shared resolver.
- Dashboard validation, type checking, linting, formatting, and i18n consistency checks pass.

## Open Questions

- None.
