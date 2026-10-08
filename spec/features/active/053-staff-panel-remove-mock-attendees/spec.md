# Spec 053 - Staff QR Check-In Entry

## Context and Objective

The staff dashboard currently presents hardcoded attendee data and a separate Panel destination even though staff operations belong in QR Ticket. Remove the mock content and make QR Ticket the staff landing destination, with camera scanning activated only after an explicit button press.

## Users / Actors

- H1: As a staff member, I want QR Ticket to be my dashboard entry point so that I can access check-in directly without misleading sample data.

## User Stories

- H1: As a staff member, I want to explicitly start the scanner from QR Ticket so that I control when the camera is requested.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN staff open the dashboard panel route, THE SYSTEM SHALL navigate to the existing QR Ticket route.
- RF-2: WHEN the staff navigation renders, THE SYSTEM SHALL NOT show the Panel destination.
- RF-3: WHEN staff open QR Ticket, THE SYSTEM SHALL NOT request camera access until they activate the localized scan button.
- RF-4: WHEN staff activate the scan button, THE SYSTEM SHALL mount the ticket scanner and request camera access.
- RF-5: THE SYSTEM SHALL retain QR Ticket history and localized labels.
- RF-6: THE SYSTEM SHALL NOT display hardcoded attendee records in the staff dashboard.

## Non-Functional Requirements

- Navigation shall use existing dashboard route constants.
- The scan action shall remain keyboard accessible and camera media shall be released when leaving the scan view.

## Edge Cases

- The QR Ticket destination remains accessible to staff and owners.
- Switching to the history tab before starting scan shall not request camera access.

## Out of Scope

- Implementing live attendee records or changing check-in behavior.
- Changing owner dashboard navigation or ticket validation behavior.

## Definition of Done

- Staff opening `/dashboard` arrive at the existing QR Ticket route and do not see a Panel sidebar item.
- QR Ticket does not mount the scanner before the scan button is pressed.
- Activating scan mounts the existing scanner; ticket history remains available.
- Dashboard type, lint, format, and diff checks pass.

## Open Questions

- None.
