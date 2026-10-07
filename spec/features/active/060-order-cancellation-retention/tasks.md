# Tasks 060 - Order Cancellation Retention

## Test Importance

High. This changes a customer-visible control governing a retention-sensitive operation. A regression
must prove that protected statuses cannot surface a cancellation affordance and that the API remains
the authoritative boundary.

- [x] T1: Add failing regression coverage, then restrict the buyer order action to pending checkouts
      and update its localized cancellation and retention copy without introducing physical deletion.
