# Spec 050 - Retire Legacy Orders

## Context and Objective

Lumina has already moved checkout persistence from the legacy `orders` table to the normalized
`purchases`, `purchase_items`, `inventory_reservations`, and `payments` model. Historical orders were
backfilled into that model, but runtime reads, inventory allocation, cleanup jobs, repository exports,
and the `tickets_sold.order_id` compatibility column still depend on `orders`. This change verifies the
backfill, removes those runtime dependencies, and drops the legacy table without changing the public
`/api/orders` contract or losing purchase, payment, issuance, or check-in history.

## Users / Actors

- Customers who view, cancel, and inspect purchases through the existing orders API and web UI.
- Lumina operators who require complete historical sales, payment, ticket, and check-in records.
- Developers and deployment operators who apply database migrations and maintain checkout code.

## User Stories

- H1: As a customer, I want my current and historical purchases to remain available after the legacy
  table is removed so that my order history and issued tickets do not change.
- H2: As an operator, I want inventory and sales totals to use one normalized source of truth so that
  duplicate compatibility logic cannot produce inconsistent results.
- H3: As a developer, I want the obsolete table and repositories removed so that all checkout behavior
  is implemented through the normalized purchase model.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN the retirement migration runs, THE SYSTEM SHALL verify that every legacy order has exactly
  one matching purchase, purchase item, and payment with equivalent identifiers, ownership, ticket,
  quantity, amount, provider reference, and lifecycle state before dropping legacy data.
- RF-2: IF any legacy order, issued ticket, monetary value, provider reference, or lifecycle mapping is
  missing or inconsistent, THEN THE SYSTEM SHALL abort the migration before dropping the `orders` table
  or `tickets_sold.order_id`.
- RF-3: WHEN a completed historical order has issued tickets, THE SYSTEM SHALL preserve each
  `tickets_sold` row, its `document_id`, QR code, check-in state, check-in actor, timestamps, normalized
  `purchase_item_id`, and deterministic `unit_index`.
- RF-4: WHEN checkout calculates available inventory, THE SYSTEM SHALL derive confirmed sales only from
  normalized purchases and active reservations and SHALL NOT read `orders`.
- RF-5: WHEN a customer lists, retrieves, or cancels a purchase through `/api/orders`, THE SYSTEM SHALL
  use only normalized purchase repositories while preserving the existing public API paths and response
  contracts.
- RF-6: WHEN scheduled maintenance runs, THE SYSTEM SHALL expire or release normalized purchases and
  reservations without invoking the legacy pending-order cleanup repository.
- RF-7: THE SYSTEM SHALL remove the `orders` schema, its database repositories and exports, obsolete
  audit tooling, the `tickets_sold.order_id` column, and the `orders` table only after a compatibility
  release has removed runtime dependencies and production verification has passed.
- RF-8: THE SYSTEM SHALL retain the term `orders` where it is part of the established customer-facing
  API route, UI feature name, localization namespace, or response contract and does not represent the
  removed database table.

## Non-Functional Requirements

- The retirement migration must be additive to migration history; previously committed migrations must
  not be edited or renamed.
- Migration verification and destructive DDL must execute atomically so a failed assertion leaves the
  legacy table and compatibility column intact.
- The table drop must be deployed after, not before or together with, the compatibility release because
  the deployment pipeline migrates the database while the previous API version may still be serving.
- Historical monetary values must not be repriced or recomputed from the current ticket price.
- Runtime database access must remain inside `@repo/db` repositories.
- The implementation must preserve webhook idempotency, inventory concurrency protection, and public
  UUID contracts.

## Edge Cases

- A deployment database has not applied the original legacy backfill migration.
- A legacy order was added or changed after the original backfill.
- A legacy pending order was intentionally mapped to an expired purchase and cancelled payment.
- A rejected or cancelled legacy order has no issued tickets.
- A completed order has multiple issued tickets whose unit indexes must remain unique.
- A historical total cannot be divided evenly into cent-accurate unit prices; `line_total` remains the
  authoritative preserved amount.
- A provider reference exists only in metadata or differs between legacy and normalized rows.
- Existing installations contain zero legacy orders.

## Out of Scope

- Renaming the `/api/orders` routes, web routes, UI labels, localization namespace, or order response DTOs.
- Repricing historical purchases or reconstructing fee data that the legacy model never stored.
- Changing current marketplace pricing, seller credentials, webhook behavior, or checkout UX.
- Removing the normalized `purchases`, `purchase_items`, `inventory_reservations`, `payments`, or
  `tickets_sold` tables.

## Definition of Done

- A first compatibility release removes every runtime dependency while retaining the physical legacy
  table; a later guarded migration proves parity, removes `tickets_sold.order_id`, and drops `orders`
  atomically.
- Inventory reservation, order list/detail/delete, jobs, seeds, schema exports, and repository exports use
  only the normalized model.
- Focused unit and isolated database integration tests cover parity failure, successful retirement,
  historical order visibility, issued-ticket preservation, inventory allocation, and cancellation.
- Repository-wide search finds no runtime SQL, schema import, or repository dependency on the removed
  table; allowed historical migration text and customer-facing `orders` naming remain.
- Focused tests, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, the affected builds, and
  `git diff --check` pass.
- A delegated quality review verifies the acceptance criteria and confirms no unrelated generated file
  changes were introduced.

## Open Questions

None. The destructive migration requires zero legacy pending orders. Operations must expire any reachable
provider preferences and wait past the maximum checkout lifetime before running it.
