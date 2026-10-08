# Spec 056 - Orders Boarding Pass

## Context and Objective

The customer orders history presents purchase facts in generic list cards. Redesign the existing web
surface as a travel-credential-inspired ticket history so customers can scan an event, its payment
state, purchase total, and order reference more confidently. Show the same record after a completed
checkout so the confirmation carries the details of the purchase rather than a generic result card.

## Users / Actors

- Authenticated customers reviewing current and past purchases in the web application.

## User Stories

- H1: As a customer, I want to scan my order as a clear ticket-shaped record so that I can identify its
  event, status, and total at a glance.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN the orders query returns records, THE SYSTEM SHALL present each record as a responsive
  ticket with an event-information body, a primary-color top strip, and a separately legible total and
  reference stub.
- RF-2: WHEN the viewport is narrow, THE SYSTEM SHALL stack the ticket anatomy without clipping long
  event names, ticket names, monetary amounts, or references.
- RF-3: WHILE the orders query is loading, THE SYSTEM SHALL show skeleton tickets that match the final
  ticket anatomy.
- RF-4: WHEN the query is empty or fails, THE SYSTEM SHALL preserve the existing localized recovery
  path and render it within the redesigned page rhythm.
- RF-5: WHEN an order is pending, THE SYSTEM SHALL preserve the existing delete action, dialog, and
  minimum touch target.
- RF-6: WHEN the checkout order query returns a completed purchase, THE SYSTEM SHALL render the
  same responsive order ticket with that purchase's details and a localized control to return to events.
- RF-7: WHEN a completed checkout result is rendered, THE SYSTEM SHALL precede the order ticket with
  a localized confirmation heading and payment message without duplicating or inventing purchase data.
- RF-8: WHILE the checkout result is loading or represents a non-completed payment, THE SYSTEM SHALL
  present an accessible status surface that matches the receipt language and retains the existing
  localized recovery action for errors.
- RF-9: WHEN a checkout result is pending or fails, THE SYSTEM SHALL display the current checkout
  reference so the customer can identify the operation without exposing unavailable payment details.
- RF-10: WHEN an unauthenticated visitor opens a checkout result route, THE SYSTEM SHALL redirect to
  the login route before loading or rendering purchase information.

## Non-Functional Requirements

- The redesign must support English and Spanish, dark and light themes, WCAG AA contrast, keyboard
  focus, reduced motion, and 200% browser zoom.
- Visible copy remains localized through the existing `orders` and `events` namespaces.
- The implementation must not introduce image, location, seat, QR, barcode, or other unavailable
  order data.

## Edge Cases

- An order has no event name or event start date after retention-related buyer dissociation.
- Event and ticket names contain long unbroken strings.
- The list contains pending, completed, rejected, and cancelled states.

## Out of Scope

- Changes to pagination, mutations, cache behavior, or data persistence.
- Event artwork or travel-document imagery.

## Definition of Done

- The web orders page and the completed checkout result reuse the approved boarding-pass ticket while
  preserving behavior and accessibility.
- Type-check, focused formatting verification, and `git diff --check` pass; a read-only quality review
  confirms the responsive and dual-theme implementation.

## Open Questions

None.
