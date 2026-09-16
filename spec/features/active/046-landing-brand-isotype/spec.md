# Spec 046 - Landing Brand Isotype

## Context and Objective

Use the supplied local LUMINA logo in the web and dashboard navigation and footer with consistent dimensions and a transparent background.

## Users / Actors

Public web visitors and dashboard landing visitors.

## User Stories

- H1: As a visitor, I want consistent branding in navigation and footer so that I recognize LUMINA across both apps.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN either app renders its public navigation or footer, THE SYSTEM SHALL display that app's `/landing/isotipo.png`.
- RF-2: THE SYSTEM SHALL render header and footer logos in an 80 by 80 CSS pixel box without distortion.
- RF-3: WHEN the mobile navigation opens, THE SYSTEM SHALL display the same logo at the same size.
- RF-4: THE SYSTEM SHALL retain localized accessible brand names and existing navigation destinations.
- RF-5: THE SYSTEM SHALL use a PNG with actual alpha transparency in place of the original dark background, preserving the symbol, wordmark, and colors.
- RF-6: THE SYSTEM SHALL accommodate the larger header logo with sufficient bar height, mobile control space, hero clearance, and section anchor offsets.
- RF-7: WHEN web or dashboard renders document metadata, THE SYSTEM SHALL use a shared square icon showing only the original lime symbol on an opaque dark background for the browser favicon and Apple touch icon.

## Non-Functional Requirements

Reuse the shared UI logo component. Preserve dark and light themes. No dependencies. Retain the original JPGs and save the background extraction as sibling PNGs.

## Edge Cases

The supplied JPG includes the wordmark. Remove the dark background, including internal negative spaces, without changing the complete logo composition.

## Out of Scope

Authenticated dashboard sidebar, auth logos, asset redesign, and other landing changes.

## Definition of Done

All requested placements use one shared asset and size configuration. Implementation receives read-only quality review and applicable verification.

## Open Questions

None blocking. The supplied complete image is used as requested.
