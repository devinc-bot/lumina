# Spec 054 - Dashboard Ticket Preview

## Context and Objective

The inventory View action shows a phone mockup with a sample QR and hardcoded details. Present the selected ticket type using the supplied horizontal ticket design and Lumina theme colors.

## Users / Actors

- Owners and staff reviewing ticket inventory in the dashboard.

## User Stories

- H1: As an operator, I want to preview a ticket type from its row so that I can recognize its event, location, type, and price.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an operator selects View on a ticket row, THE SYSTEM SHALL show a horizontal ticket preview for that row.
- RF-2: THE SYSTEM SHALL show the event, location, ticket type, and price from the selected record.
- RF-3: THE SYSTEM SHALL use the project's semantic colors in light and dark themes and localize visible text in English and Spanish.
- RF-4: THE SYSTEM SHALL keep the preview readable on narrow screens and accessible as a dialog.
- RF-5: THE SYSTEM SHALL NOT present a sample QR as a valid entry credential.
- RF-6: WHILE the ticket preview is open and motion is allowed, THE SYSTEM SHALL animate the light dithered pattern over the ticket's brand-colored background.
- RF-7: WHEN a fine pointer moves across the ticket, THE SYSTEM SHALL tilt the ticket with the pointer and restore its resting position when the pointer leaves.
- RF-8: IF WebGL is unavailable or reduced motion is preferred, THEN THE SYSTEM SHALL keep the ticket visible and readable without continuous animation or pointer tilt.
- RF-9: WHEN the inventory preview is shown, THE SYSTEM SHALL use the project's dark charcoal surface behind a moving citrus-green dither pattern.
- RF-10: WHEN the inventory preview is shown, THE SYSTEM SHALL display a scannable sample QR and visibly identify it as a preview that is not valid for admission.
- RF-11: THE SYSTEM SHALL use a non-credential sample payload that cannot be mistaken for a purchased ticket or check-in token.
- RF-12: WHEN the animated ticket is shown, THE SYSTEM SHALL display the project's full citrus green (`#dcff02`) in the moving pattern over the original near-black surface (`#121311`) and keep all ticket copy legible over both pattern and base areas.
- RF-13: WHEN the ticket preview is shown, THE SYSTEM SHALL NOT place a broad dark translucent overlay over its main content.
- RF-14: WHEN the animated ticket is shown, THE SYSTEM SHALL place its text above the animated pattern without solid dark backing boxes while preserving legibility.
- RF-15: WHEN the ticket preview is shown, THE SYSTEM SHALL render prominent circular edge notches and a clearly visible dashed perforation divider.
- RF-16: WHEN the ticket preview's perforation notches are shown, THE SYSTEM SHALL reveal the animated ticket surface through them without opaque dark fills.
- RF-17: WHEN the ticket preview is shown, THE SYSTEM SHALL render visible circular cutouts at the four outer corners and perforation endpoints using the surrounding dialog surface color.
- RF-18: WHEN the ticket preview is shown, THE SYSTEM SHALL size its corner cutouts larger than its seam cutouts and center each seam cutout on the dashed divider.
- RF-19: WHEN the ticket preview is shown, THE SYSTEM SHALL use the exact opaque dialog surface color for every cutout in both themes.
- RF-20: WHEN the ticket preview is shown, THE SYSTEM SHALL center the dashed perforation line on both seam cutouts.
- RF-21: WHEN the ticket preview is shown, THE SYSTEM SHALL render outer corner cutouts at the same diameter as seam cutouts.
- RF-22: WHEN the ticket preview is shown, THE SYSTEM SHALL display a fine double-line frame inset from the ticket edges.
- RF-23: WHEN the ticket preview is shown, THE SYSTEM SHALL render two parallel inset perimeter lines, with the inner line thinner than the outer line.
- RF-24: WHEN the ticket preview is shown, THE SYSTEM SHALL keep both perimeter lines visibly distinct over the ticket surface.
- RF-25: WHEN the ticket preview is shown, THE SYSTEM SHALL use a smooth moving citrus wave instead of a pixel-dither animation.
- RF-26: WHEN the ticket preview is shown, THE SYSTEM SHALL use a reduced event-title size and center the perforation line on its seam cutouts.
- RF-27: WHEN an operator activates a ticket preview with a non-empty description, THE SYSTEM SHALL flip the ticket to a reverse face containing that description without displaying a separate description action.
- RF-28: WHEN the ticket reverse face is shown, THE SYSTEM SHALL flip back to the front when the operator activates the ticket again.
- RF-29: WHEN either ticket face is shown, THE SYSTEM SHALL render the same outer corner cutouts, seam cutouts, dashed perforation divider, and double-line inset frame.
- RF-30: WHEN a dashboard ticket face is composed, THE SYSTEM SHALL provide the frame, all cutouts, and the perforation divider through a reusable ticket-face component rather than requiring each consumer to position those decorative elements.
- RF-31: WHEN a ticket face renders its corner or seam cutouts, THE SYSTEM SHALL render them as transparent physical holes through the ticket surface, independent of the color behind the ticket.
- RF-32: WHEN a ticket face is flipped, THE SYSTEM SHALL keep the dashed perforation divider centered on its two seam cutouts.
- RF-33: WHEN the ticket preview is displayed on screens at or above the small breakpoint, THE SYSTEM SHALL use a 2:1 ticket proportion and a wider dialog so the preview reads as an event ticket rather than a payment card.
- RF-34: WHEN space is available on desktop, THE SYSTEM SHALL allow the ticket preview dialog to use a 4xl maximum width while retaining its 2:1 proportion.

## Non-Functional Requirements

- The ticket visual shall be a reusable component in the dashboard tickets module.
- The implementation shall use the existing UI and i18n packages without new dependencies.
- Animation shall stop when the preview unmounts or the document is hidden.
- The ticket shall be keyboard-operable with Enter and Space and expose its flip state to assistive technology.

## Edge Cases

- Long event and location names shall wrap without overlapping the ticket stub.
- A missing location or event name shall use the list's existing placeholder.
- WebGL context loss shall preserve a static ticket surface.
- The QR shall retain a quiet zone and readable contrast on both themes and narrow screens.

## Out of Scope

- Generating purchased ticket credentials, printing, or downloading.
- Adding event dates or organizer data to the ticket API contract.

## Definition of Done

- The View action displays the selected record in the new component.
- The ticket has a moving dithered pattern and pointer-following tilt when motion is allowed.
- The ticket uses dark and green brand colors and shows a visibly invalid sample QR.
- The moving pattern visibly uses full citrus green rather than a low-opacity olive blend.
- Type, lint, format, and diff checks pass.

## Open Questions

- None. The inventory response has no event date or organizer; the preview uses only fields in the selected record.
