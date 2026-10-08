# Spec 052 - Settings Form Validation i18n

## Context and Objective

Dashboard settings forms currently store Zod validation message keys without translating them. This change localizes field validation feedback for owner and staff settings using the existing shared validation resolver.

## Users / Actors

- H1: As a dashboard owner or staff member, I want settings validation errors in my selected language so that I can correct my profile.

## User Stories

- H1: As an owner or staff member, I want validation feedback localized so that form errors are understandable.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a settings field fails validation with a shared `validation:` message key, THE SYSTEM SHALL display the localized message for the current language.
- RF-2: WHEN a settings field fails validation with a message that is not a shared validation key, THE SYSTEM SHALL preserve that message.
- RF-3: WHEN validation succeeds, THE SYSTEM SHALL preserve the current settings save behavior.

## Non-Functional Requirements

- The owner and staff settings forms shall use the shared `@repo/i18n` validation resolver.
- Spanish and English locales shall remain supported.

## Edge Cases

- Nested address validation errors must continue to appear on the address field.
- Non-key Zod messages must remain unchanged.

## Out of Scope

- Changes to validation rules, translation copy, save behavior, or API contracts.

## Definition of Done

- Regression coverage verifies localized validation keys and preservation of ordinary messages.
- Dashboard test, type, lint, and formatting checks pass for the affected files.

## Open Questions

- None.
