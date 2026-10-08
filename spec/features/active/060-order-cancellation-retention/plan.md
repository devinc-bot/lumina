# Plan 060 - Order Cancellation Retention

## Status

Implemented and reviewed. Focused regression tests, lint, and formatting pass. The affected-project
type-check remains blocked by an unrelated error in the ticket-capacity repository implementation.

## Current State

`DELETE /orders/:documentId` is intentionally implemented as a pending-checkout cancellation: it
expires the provider preference and releases the reservation. The API rejects every existing
non-pending purchase, but the web orders page currently shows its destructive delete control for all
payment statuses and its copy incorrectly promises deletion.

## Technical Approach

1. Add a small, status-based client predicate in the orders display utility using the shared
   `PAYMENT_STATUS` constant. Render the existing control only when the predicate confirms `pending`.
2. Retain the endpoint and its API guard as a defense-in-depth boundary. Do not add a repository,
   migration, or physical deletion operation.
3. Correct the orders namespace dialog, toast, action, and retention-notice copy in English and
   Spanish so it describes checkout cancellation and the approved retention behavior precisely.
4. Add regression coverage for the client predicate and confirm the existing API use-case coverage
   rejects a non-pending owned purchase.

## Affected Layers

- `apps/web/app/modules/orders/utils/order-display.ts`
- `apps/web/app/modules/orders/components/orders-page.tsx`
- `packages/i18n/src/locales/orders/{en,es}.json`
- `apps/web/app/modules/orders/utils/order-display.test.ts`
- `apps/api/src/modules/orders/application/delete-pending-order.use-case.test.ts`

## Verification Strategy

- First add focused failing tests for the status predicate and cancellation boundary.
- Run the focused web and API tests, then relevant type-checking, lint, format checking, and
  `git diff --check`.
- Perform a read-only UI quality review for semantic labels, touch target, localization, dark/light
  semantic tokens, and absence of a destructive control on protected records.

## Risks and Mitigations

- A stale pending list can race with payment reconciliation; the API remains authoritative and reports
  the existing conflict without mutating a completed purchase.
- The retention job is dry-run by default; the notice uses policy language and does not claim that a
  physical purge is active.
