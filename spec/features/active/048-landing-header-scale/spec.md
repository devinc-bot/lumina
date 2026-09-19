# Spec 048 - Landing Header Scale

## Context and Objective

The floating landing headers in `web` and `dashboard` are oversized relative to
their navigation and 44 px interactive controls, while the authentication
surfaces use a different, generic logo asset. Reduce the header footprint and
apply the shared landing logo to authentication chrome while preserving existing
navigation, accessible touch targets, and flows. The generic app logo must also
use the new favicon asset consistently in all three apps.

## Users / Actors

- Attendees viewing the public `web` landing page.
- Venue operators viewing the `dashboard` landing page.

## User Stories

- H1: As a landing-page visitor, I want a compact header so that the hero remains
  the visual focus without making navigation harder to use.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN either landing header renders, THE SYSTEM SHALL use a 72 px header
  height and a 56 px header logo.
- RF-2: WHILE the header is displayed on desktop or mobile, THE SYSTEM SHALL keep
  every interactive control at least 44 px in its touch dimension.
- RF-3: WHEN a public `web` page uses the fixed header, THE SYSTEM SHALL reserve
  enough top space for it so content is not obscured.
- RF-4: WHEN a visitor opens login, registration, password-reset, or registration
  confirmation in `web` or `dashboard`, THE SYSTEM SHALL display the shared
  landing logo in the authentication shell.
- RF-5: WHEN any app renders `AppLogo` or its document icon, THE SYSTEM SHALL use
  `/landing/favicon.png` rather than the retired `/landing/logo.png` asset.

## Non-Functional Requirements

- Preserve dark and light theme behavior, localization, keyboard focus treatment,
  and existing navigation behavior.
- Do not add dependencies or alter routes, copy, authentication behavior, or form
  submission behavior.

## Edge Cases

- The mobile sheet continues to use its independent header layout.
- The footer keeps its existing larger logo size.
- Authentication routes inherit the shared shell, including password-reset and
  registration-confirmation states.
- `admin` receives the favicon asset because it is not otherwise present there.

## Out of Scope

- Redesigning the landing header, its navigation items, CTAs, or mobile sheet.
- Changes to application-shell headers outside these landing surfaces.
- Changing the admin authentication shell.

## Definition of Done

- Both landing headers share the compact scale, the public shell clears the fixed
  header, authentication shells use the shared logo, all apps provide the favicon
  asset, and relevant frontend type-checks pass.

## Open Questions

- None.
