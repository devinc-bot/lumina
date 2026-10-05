# Plan 051 - Checkout Data Retention

## Status

Implementation and isolated-PostgreSQL verification are complete. Production writes remain gated on
legal/accounting approval of the retention schedule and review of production dry-run counts.

## Current State

Checkout creates one purchase, item, active reservation, and pending payment in one transaction.
Reservation expiry changes the purchase and reservation status and may cancel the pending payment.
`payment_webhook_events` retains raw payloads. The reconciler locks and joins purchases, items,
reservations, payments, and webhook receipts, so deleting a reservation can break a late webhook.
`purchases.user_id` is non-null and customer order queries join users; a timestamp or marker alone
cannot anonymize a purchase.

## Technical Approach

1. Define explicit retention eligibility over purchase, payment, reservation, webhook, and ticket
   state. Use terminal timestamps and exclude active or unresolved records.
2. Design and test a minimal retained provider receipt or tombstone so late webhook delivery remains
   idempotent after payload minimization or reservation cleanup. Adjust reconciliation before cleanup.
3. Add a legal-hold state managed manually in the database, with an auditable operational procedure
   for setting and releasing holds. Check hold state under the same row locks as each mutation.
4. Implement a bounded dry-run repository returning counts by reason, then enable transactional cleanup
   after the policy and migration are verified. Keep the first production rollout in dry-run mode.
5. At 90 days, minimize terminal webhook payloads and remove eligible reservation rows only after
   late-webhook handling is proven safe. Never delete issued-ticket or financial evidence.
6. At 12 months, set `purchases.user_id` to null for eligible unsuccessful purchases. Update the
   purchase schema, query contracts, and customer history semantics consistently.
7. Retain economic payment and purchase facts for at least 10 years. A future archival or purge policy
   after that boundary is separate work and is not automatically enabled here.
8. Add one internal job step and one local scheduler that call the same repository workflow; document
   Cloud Scheduler cadence and batch behavior in `JOBS.md`.

## Data and Migration Notes

- Existing foreign keys have no automatic cascade: reservations reference purchase items, payments
  reference purchases, receipts reference payments, and issued tickets reference purchase items.
- Any schema change uses a new timestamped Drizzle migration. Do not edit committed migrations.
- Do not store legal hold reasons or case evidence in job logs. Keep audited metadata minimal.
- Preserve the payment/reconciliation identity needed for late webhooks and chargebacks even if raw
  payloads are minimized.

## Verification Strategy

- Start with isolated database tests that fail on current behavior, then implement the minimum code.
- Cover legal hold, terminal cutoffs, unresolved payments, late provider approval, issued tickets,
  double-run concurrency, and zero-candidate runs.
- Verify API order-history behavior after buyer dissociation if the nullable-user route is chosen.
- Run focused DB and API tests, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, affected builds,
  and `git diff --check`.
- Compare dry-run candidate counts against reviewed database queries before enabling writes.

## Rollout and Recovery

- Deploy schema and late-webhook compatibility before any destructive retention behavior.
- Run the job in dry-run mode and review counts by category without personal identifiers.
- Enable one bounded category at a time after backup and operator review; stop on invariant failure.
- Restore deleted data from the managed backup if a purge runs against an incorrect cohort.
