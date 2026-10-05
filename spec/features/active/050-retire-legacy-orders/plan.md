# Plan 050 - Retire Legacy Orders

## Status

Draft. The public orders API and web terminology remain stable; only the legacy persistence model and
its compatibility paths are retired.

## Current State

The migration `20260831210000_backfill_concurrent_payments.sql` already copied every legacy order into a
purchase, purchase item, and payment, and attached historical `tickets_sold` rows to normalized purchase
items. Runtime code nevertheless still reads `orders` for inventory allocation and order-history fallback,
retains legacy cancellation and cleanup paths, exports the legacy schema/repositories, and keeps the
nullable `tickets_sold.order_id` foreign key.

## Phased Migration Strategy

1. Extend the read-only preflight audit to assert one-to-one parity between each `orders` row and its
   normalized purchase, purchase item, payment, and issued tickets. Run it against every target
   environment before the compatibility release.
2. Ship a compatibility release that removes all runtime reads and writes to `orders`, while temporarily
   retaining the physical table, Drizzle schema, and `tickets_sold.order_id` for rollback safety.
3. Verify in production that list/detail/cancellation, inventory, jobs, webhook reconciliation, issued
   tickets, and check-ins operate only on the normalized model. Resolve or expire every legacy pending
   provider preference according to the confirmed operational policy.
4. In a later release, add a new timestamped destructive migration; do not modify the existing backfill
   migration.
5. Inside that migration, repeat the one-to-one parity assertions between each `orders` row and its normalized purchase,
   purchase item, and payment. Validate document ID, user, ticket, quantity, authoritative line total,
   purchase/payment status mapping, provider, provider preference, paid timestamp, and issuance count.
6. Assert every `tickets_sold.order_id` row has a valid normalized `purchase_item_id` and unique
   `unit_index`, with preserved issuance and check-in data.
7. Abort through a PostgreSQL exception on any mismatch. Keep assertions and destructive DDL in the same
   migration transaction.
8. Drop the `tickets_sold.order_id` foreign key and column, then drop `orders`.
9. Remove the retained schema/repositories/audit tooling and update Drizzle migration metadata through the repository's standard generation
   workflow; never hand-edit an old migration or snapshot.

## Runtime Changes

- Simplify checkout inventory allocation to count confirmed quantities from `purchase_items` joined to
  `purchases`, plus unexpired active `inventory_reservations`. Remove both the completed legacy-order sum
  and the anti-double-counting join by matching document IDs.
- Simplify order list and detail use cases to query only normalized purchases.
- Simplify cancellation to the normalized pending-purchase path. Keep immutable payment credential
  resolution and preference expiration behavior intact.
- Remove the stale legacy pending-order cleanup repository, scheduler step, internal-job step, and job
  documentation. Normalized reservation expiration remains the cleanup mechanism.
- Expire the pending payment attempt atomically with its pending purchase and active reservation, matching
  the Mercado Pago preference expiration configured with the same checkout deadline.
- In the compatibility release, remove legacy repository consumers but retain the schema and audit tool
  until the destructive migration has completed.
- After the destructive migration, remove the legacy `orders` schema file, repository directory and
  exports, repository-only legacy row types, audit script, and package command. Keep generic buyer-order
  API DTOs and route names.
- Update development seeds and ticket issuance/check-in reads to use `purchase_item_id` exclusively.

## Test Strategy

Test importance is high because this removes payment and ticket history storage and changes inventory
calculation. Apply TDD: the test phase defines failing coverage before production code, followed by the
implementation phase and a read-only quality review.

- Migration integration tests: successful drop after parity checks; abort on missing purchase/item/payment,
  mismatched ownership/ticket/quantity/amount/status/provider reference, or incomplete issuance links.
- Repository integration tests: confirmed normalized sales and active reservations reduce stock exactly
  once; expired/released reservations and cancelled purchases do not consume stock.
- API/use-case tests: list, detail, and cancellation have no legacy fallback and preserve response behavior.
- Ticket tests: historical issued QR and check-in data remain addressable after `order_id` removal.
- Job tests: normalized reservation expiration remains registered; the legacy cleanup step is absent.
- Static verification: targeted `rg` checks distinguish forbidden table dependencies from allowed
  customer-facing route/UI names and immutable historical migration files.

## Rollout and Recovery

- Run the existing read-only legacy audit before deploying the retirement migration as an operational
  preflight, while the script still exists in the pre-migration artifact.
- Take the normal managed database backup/restore-point required for destructive production migrations.
- Deploy runtime compatibility first. Because migrations run while the previous API revision may still
  serve traffic, deploy the table drop only in a later release after no live revision reads `orders`.
- If the migration guard fails, stop the rollout, inspect the reported mismatch, repair normalized data
  with a new reviewed migration, and rerun. Do not bypass the guard or delete legacy rows manually.
- Recovery after a successful destructive migration uses the managed database backup; no down migration
  should attempt to synthesize the legacy table from incomplete assumptions.

## Verification Commands

- Focused `@repo/db` migration and purchase lifecycle integration tests.
- Focused `@repo/api` order, job, checkout, and reconciliation tests.
- `pnpm type-check`
- `pnpm lint`
- `pnpm format:check`
- Affected package/app builds.
- `git diff --check`

## Confirmed Decisions

- Retire the database table and compatibility code, while keeping `/api/orders` and customer-facing order
  terminology stable.
- Preserve historical document IDs, amounts, provider references, issued tickets, QR codes, and check-in
  facts exactly.
- Treat `purchase_items.line_total`, not current ticket price or a recomputed unit price, as the preserved
  historical line amount.
- Abort retirement when any parity assertion fails.

## Pending Decisions

None. The destructive migration rejects the rollout while any `orders.status = 'pending'` row remains.
Operations must expire reachable provider preferences and wait past the maximum checkout lifetime first.
