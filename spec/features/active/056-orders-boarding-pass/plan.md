# Plan 056 - Orders Boarding Pass

## Status

Proposed.

## Technical Approach

1. Restructure the presentational `OrderSummary` component into one responsive ticket surface. Reuse
   the existing order type, locale formatting, status badge utility, and pending-order callback.
2. Use only existing color, typography, radius, and spacing tokens. Create the ticket language through
   a primary top strip, a neutral dashed separator, and semantic ticket body/stub regions; do not use
   images, gradients, or new CSS utilities.
3. Rework `OrdersListSkeleton` to mirror the responsive strip/body/stub hierarchy, then bring the empty
   and error states into the same vertical rhythm without replacing their existing accessible behavior.
4. Keep all loading, pagination, delete, i18n, and retention-notice behavior unchanged.
5. Return the owned purchase's existing buyer summary from the checkout result endpoint, then reuse
   `OrderSummary` for a completed payment and place the existing localized events navigation below it.
6. Add a restrained success header above the completed-order ticket, using the existing citrus and
   typography tokens for confirmation context while retaining the ticket as the single data surface.
7. Rework checkout loading, pending, and error surfaces into status-specific receipt panels using
   existing icons, skeletons, semantic colors, and localized content without changing query behavior.
8. Add the route's checkout reference to non-completed status panels, then align their layout as a
   compact transaction receipt rather than a centered generic card.
9. Apply the existing client authentication gate around checkout-result content so unauthenticated
   visitors redirect before the order query is mounted.

## Affected Layers

- `apps/web/app/modules/orders/components/order-summary.tsx`
- `apps/web/app/modules/orders/components/orders-page.tsx`
- `apps/web/app/modules/checkout/components/checkout-result-page.tsx`
- `apps/web/app/modules/checkout/services/checkout.service.ts`
- `apps/api/src/modules/orders/application/get-order-by-document-id.use-case.ts`
- `packages/db/src/repositories/purchases/`
- `spec/features/active/056-orders-boarding-pass/`

## Verification Strategy

- This checkout extension is high-test-importance because it changes an owned API response contract.
  Add a use-case test covering the returned owned purchase summary.
- Run the focused API test, relevant type-checks, focused `oxfmt --check`, `git diff --check`, and a
  read-only quality review for ownership, semantic structure, responsive layout, dark/light tokens,
  contrast, and touch targets.

## Risks and Mitigations

- The orders contract lacks event images, locations, issued tickets, and QR data; the ticket composition
  intentionally uses only available facts.
- Long or nullable order fields may crowd a ticket layout; use min-width constraints, wrapping, and the
  existing fallbacks.
- Citrus is prominent but not a payment-state color; the existing badge remains the state indicator.
