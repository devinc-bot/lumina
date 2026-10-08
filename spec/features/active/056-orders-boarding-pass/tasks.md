# Tasks 056 - Orders Boarding Pass

## Test Importance

T1 was low: the work changed visual presentation only and preserved existing data, order operations,
and contracts. T2 is high: it changes the owned checkout-result response contract, so it requires a
regression test. T3 is low: it adds presentational hierarchy using existing localized copy and tokens.
T4 is low: it improves loading and result-state presentation without changing checkout behavior.
T5 is low: it improves visual hierarchy and reveals an existing route identifier with localized copy.
T6 is high: it changes when an authenticated-only checkout result query may mount and requires a
regression test.

- [x] T1: Redesign the web orders page and order tickets around the approved boarding-pass direction,
      including matching loading, empty, and error states; verify formatting and type safety.
- [x] T2: Reuse the order ticket for a completed checkout result, returning the owned purchase summary
      required by that card and preserving pending and failed result states.
- [x] T3: Add the approved sober confirmation header above the completed checkout ticket without
      changing the ticket's data or pending and failed states.
- [x] T4: Improve the checkout loading, pending, and failed result surfaces with the approved receipt
      direction while preserving their localized messages and recovery behavior.
- [x] T5: Present pending and failed checkout states as compact transaction receipts with their
      checkout reference, without adding payment data that the contract does not provide.
- [x] T6: Redirect unauthenticated visitors to login before checkout-result content or its order query
      is mounted.
