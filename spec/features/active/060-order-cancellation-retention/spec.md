# Spec 060 - Order Cancellation Retention

## Context and Objective

The buyer order history presents a destructive "delete" action for every purchase, although the API
only permits a pending checkout to be cancelled and retained records follow a separate data-retention
policy. Align the UI with that policy so customers can cancel an unfinished checkout without being
offered an impossible or unsafe deletion action for cancelled or confirmed purchases.

## Users / Actors

- Authenticated customers viewing their web order history.
- Operators and systems responsible for payment reconciliation, ticketing evidence, and data retention.

## User Stories

- H1: As a customer, I want to cancel only an unfinished checkout so that I understand what action is
  available without expecting confirmed or historical purchases to disappear.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN a buyer order has pending payment status, THE SYSTEM SHALL present a localized Cancel
  checkout action that invokes the existing pending-checkout cancellation endpoint.
- RF-2: WHEN a buyer order has completed, cancelled, or rejected payment status, THE SYSTEM SHALL NOT
  render a client-side cancellation or deletion action.
- RF-3: WHEN a customer confirms the cancellation dialog, THE SYSTEM SHALL describe the operation as
  cancelling an unfinished checkout, not deleting an order.
- RF-4: THE SYSTEM SHALL present a localized retention notice that accurately distinguishes checkout
  cancellation from the automatic minimization and dissociation policy.
- RF-5: THE API SHALL continue to reject cancellation requests for owned non-pending purchases.

## Non-Functional Requirements

- Visible copy must be localized in Spanish and English.
- The control must preserve the existing keyboard-accessible dialog, focus treatment, and 44px minimum
  touch target.
- This work must not introduce a physical deletion path for purchases, payments, tickets, or webhooks.

## Edge Cases

- A payment transitions from pending while the list is stale; the API rejects the cancellation and the
  client displays the existing error recovery path.
- A user manipulates the client request for a confirmed or cancelled purchase; the server keeps the
  existing conflict response.

## Out of Scope

- Enabling the checkout retention job's apply mode.
- Changing the 90-day minimization, 12-month buyer-dissociation, legal-hold, or financial-record
  retention rules established by Spec 051.
- Physical deletion or user-directed hiding of cancelled purchases.

## Definition of Done

- Pending orders alone expose Cancel checkout, while every other displayed status exposes no destructive
  action.
- Regression tests cover the client status guard and server rejection for a non-pending order.
- Focused tests and applicable type, lint, formatting, and diff checks pass.

## Open Questions

None. The approved policy remains minimization after 90 days and buyer dissociation after 12 months,
not a 90-day physical purchase deletion.
