# Spec 058 - Web Dark-Only Theme

## Context and Objective

Lumina's web, dashboard, and admin applications currently expose a light-theme preference even
though the product is moving to a single dark surface. Remove every application-level light-mode
control and make all three applications render dark regardless of a previously stored theme
preference.

## Users / Actors

- Public web visitors and authenticated customers using `apps/web`.
- Owners and staff using `apps/dashboard`.
- Provisioned operators using `apps/admin`.

## User Stories

- H1: As a Lumina user, I want a consistent dark interface so that the product looks the same on
  every visit without a theme-setting decision.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a web, dashboard, or admin route renders, THE SYSTEM SHALL set the document theme and
  color scheme to dark without reading or applying the stored `repo:theme` preference.
- RF-2: WHEN a user views navigation in any Lumina application on any viewport, THE SYSTEM SHALL NOT
  render a control that switches to light mode.
- RF-3: WHEN an event detail includes a map, THE SYSTEM SHALL render the map with its dark style
  without requiring a theme context.
- RF-4: THE SYSTEM SHALL NOT ship light-theme CSS overrides in the shared global stylesheet.

## Non-Functional Requirements

- Each application must remain accessible, responsive, and localized; removing the theme controls
  must not change navigation or session behavior.
- The dark scheme must be established before hydration to avoid a light flash.

## Edge Cases

- A browser retains a legacy `repo:theme=light` value from an earlier web session.
- A web, dashboard, or admin error or not-found boundary renders before the normal route tree mounts.

## Out of Scope

- Removing unused theme primitives or translations outside the global stylesheet and its directly
  affected tests.
- Migrating or deleting stored theme preferences.

## Definition of Done

- The web, dashboard, and admin root, error, and not-found render paths are dark-only; their
  navigation no longer contains a theme control; and event maps use the dark style directly.
- The shared global stylesheet contains no light-theme override block.
- Focused type and formatting verification and `git diff --check` pass, or an environment blocker is
  recorded. A read-only UI quality review confirms the three-app scope and dark-only behavior.

## Open Questions

None.
