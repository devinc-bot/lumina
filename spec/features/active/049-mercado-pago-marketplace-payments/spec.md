# Spec 049 - Mercado Pago Marketplace Payments

## Context and Objective

Lumina currently creates every Checkout Pro preference with one platform Mercado Pago credential, so payments are collected by Lumina instead of the organization that owns the event. This change introduces an organization-scoped Mercado Pago marketplace connection through OAuth, routes each new checkout to the connected seller account, applies Lumina's tax-inclusive 3% marketplace commission to the ticket face-price subtotal, and presents an explicit fee breakdown to owners while configuring ticket prices and to customers before they leave Lumina to pay. The commercial model preserves immutable monetary snapshots, labels the pre-redirect Mercado Pago amount as an estimate, and limits Checkout Pro to one installment without offline payment methods.

## Users / Actors

- Owners who connect the Mercado Pago account for their sole organization and configure tickets in `dashboard`.
- Customers who review a ticket price breakdown and buy tickets in `web`.
- Lumina as the marketplace that receives its configured commission.
- Mercado Pago as the OAuth identity, Checkout Pro, settlement, and webhook provider.
- Lumina operators who reconcile legacy and marketplace payments without accessing seller credentials.

## User Stories

- H1: As an owner, I want to connect my Mercado Pago account to my organization so that ticket-sale proceeds settle directly into my account.
- H2: As an owner, I want to see the ticket face price, Mercado Pago processing charge, Lumina commission, buyer total, and expected proceeds while creating or editing a ticket so that I understand the commercial result before offering it for sale.
- H3: As a customer, I want to see the ticket subtotal and every added fee before confirming checkout so that I understand the final amount I will pay.
- H4: As Lumina, I want Mercado Pago to split the seller proceeds and Lumina commission automatically so that Lumina does not custody the owner's ticket revenue.
- H5: As an operator, I want every purchase to retain the pricing policy and payment-account snapshot used at checkout so that later reconciliation remains auditable after fee, credential, or account changes.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an authenticated owner opens the payments section in `dashboard`, THE SYSTEM SHALL show the Mercado Pago connection status for the owner's sole organization and actions appropriate to that status.
- RF-2: WHEN an owner starts Mercado Pago connection, THE SYSTEM SHALL initiate an authorization-code OAuth flow bound to that owner and organization with a short-lived, one-time anti-CSRF state and PKCE where supported.
- RF-3: WHEN Mercado Pago returns a valid authorization callback, THE SYSTEM SHALL exchange the code server-side, verify the seller identity, and persist an organization-scoped connection without returning access or refresh credentials to a client.
- RF-4: THE SYSTEM SHALL encrypt Mercado Pago access and refresh credentials at rest, retain credential version and expiry metadata, rotate refreshed credentials atomically, and exclude credentials from logs, errors, and public contracts.
- RF-5: WHEN an event's organization has no active Mercado Pago connection, THE SYSTEM SHALL report that event as not ready for new purchases and SHALL NOT create a new marketplace checkout.
- RF-6: WHEN an owner enters or changes a ticket price, THE SYSTEM SHALL show a server-authored breakdown containing the face-price subtotal, estimated Mercado Pago processing amount, Lumina fee, buyer total, currency, and expected owner proceeds.
- RF-6a: WHEN an owner has connected Mercado Pago, THE SYSTEM SHALL allow that owner to record the settlement option selected in Mercado Pago (instant, 10, 18, or 35 days) and SHALL use its documented percentage solely as the provider-fee estimate for that organization's future quotes and checkouts.
- RF-6b: WHEN the system estimates a Mercado Pago fee, THE SYSTEM SHALL include the Argentina VAT estimate on the selected settlement fee, expose that VAT as an informational component of the estimated provider charge, and keep the resulting buyer total authoritative in minor units.
- RF-7: WHEN a customer selects a purchasable ticket, THE SYSTEM SHALL show the same categories of fee breakdown, clearly label the Mercado Pago component as estimated, and require explicit confirmation of the final Lumina-side total before redirecting the customer to Mercado Pago.
- RF-8: THE SYSTEM SHALL calculate all authoritative amounts on the API in integer minor units using one shared versioned pricing policy and SHALL treat client-side calculations as display previews only.
- RF-9: WHEN checkout inventory is reserved, THE SYSTEM SHALL persist immutable snapshots of the ticket subtotal, Lumina fee, quoted Mercado Pago processing amount, buyer total, pricing-policy version, currency, and seller connection used for the attempt.
- RF-10: WHEN a marketplace Checkout Pro preference is created, THE SYSTEM SHALL use the connected seller's OAuth access token and SHALL send Lumina's commission as the preference `marketplace_fee` monetary amount.
- RF-11: THE SYSTEM SHALL calculate Lumina's tax-inclusive commission as 3% of the ticket face-price subtotal, round it using the documented minor-unit policy, and expose both the percentage and monetary result in owner and customer breakdowns without adding a separate Lumina tax amount to the buyer.
- RF-12: WHEN Mercado Pago notifies a payment, THE SYSTEM SHALL validate the webhook signature, resolve the seller connection from trusted provider data, fetch the payment with the correct seller credential, and verify seller, external reference, preference, amount, currency, and marketplace commission against the stored snapshots before issuing tickets.
- RF-12a: WHEN a customer returns from Mercado Pago while the purchase remains pending, THE SYSTEM SHALL re-read the purchase until webhook reconciliation reaches a terminal payment status or five total purchase-read attempts have completed.
- RF-13: IF a seller credential expires, is revoked, cannot be refreshed, or no longer identifies the expected seller, THEN THE SYSTEM SHALL disable new checkouts for that organization, preserve existing purchase records, and show a localized reconnection state to the owner.
- RF-14: WHEN an owner reconnects or changes Mercado Pago account, THE SYSTEM SHALL bind only subsequent attempts to the new active connection while historical and pending attempts retain their original connection and pricing snapshots.
- RF-15: WHILE legacy platform-account payment attempts remain reconcilable, THE SYSTEM SHALL route their provider operations through the legacy credential path and SHALL NOT reinterpret them as seller-connected marketplace payments.
- RF-16: WHEN a payment reaches a terminal state, THE SYSTEM SHALL retain the provider-reported fee and net-settlement facts available from the payment response or reconciliation report separately from the pre-checkout quote.
- RF-17: IF OAuth state is invalid, expired, replayed, belongs to another owner, or resolves to an organization the requester does not own, THEN THE SYSTEM SHALL reject the connection without changing the active payment account.
- RF-18: WHEN a marketplace Checkout Pro preference is created, THE SYSTEM SHALL set the maximum installment count to one, exclude offline payment types, and retain supported account-balance, debit-card, and single-payment credit-card options.
- RF-19: WHILE an organization's Mercado Pago connection is inactive, THE SYSTEM SHALL allow an owner to create and edit inactive tickets but SHALL reject ticket activation and new purchases for that organization.
- RF-20: WHEN seller-connected marketplace checkout is enabled for an organization without an active Mercado Pago connection, THE SYSTEM SHALL disable sales of that organization's previously active tickets until the owner reconnects.

## Non-Functional Requirements

- Payment-account ownership, seller routing, fee calculation, and purchase authorization are enforced by the API; client state is not a security boundary.
- Monetary calculations use integer cents and basis points with explicit rounding; JavaScript floating-point multiplication is not authoritative.
- OAuth credentials are encrypted with authenticated encryption and a versioned key supplied through the deployment secret system.
- Expired OAuth states and their encrypted PKCE verifiers are retained for 24 hours, then deleted by the cleanup job.
- Webhook processing, OAuth callbacks, token refresh, and preference creation are idempotent and safe under retries and concurrent requests.
- All owner and customer copy is localized in Spanish and English through `@repo/i18n`; both light and dark themes meet WCAG AA.
- The implementation preserves the existing ports-and-adapters boundary around Mercado Pago and keeps all database access in `@repo/db` repositories.
- The Mercado Pago marketplace application, seller accounts, and environment-specific callback URLs satisfy Mercado Pago's Argentina Split Payments 1:1 prerequisites before production rollout.

## Edge Cases

- The owner closes or rejects the Mercado Pago authorization screen.
- An OAuth callback is duplicated, delayed, or replayed after the state expires.
- The same Mercado Pago seller account is connected to more than one Lumina organization.
- A token refresh races with checkout creation or another refresh request.
- An owner reconnects to another seller while an older preference or payment remains pending.
- A ticket price or fee policy changes after the customer opens the event page but before inventory reservation.
- Percentage calculations produce fractional cents or quantity causes a rounding remainder.
- Mercado Pago changes its seller fee, taxes, financing cost, or settlement timing after ticket creation.
- The seller is subject to taxes or withholdings beyond the standard VAT estimate.
- The owner changes the settlement option in Mercado Pago but has not yet mirrored it in Lumina.
- The buyer chooses a supported payment method whose provider cost differs from the pre-checkout estimate.
- A webhook has a valid signature but its seller, preference, external reference, amount, currency, or marketplace fee does not match the stored attempt.
- A seller disconnects with active tickets, reservations, pending preferences, or late webhook deliveries.
- A legacy platform-account payment is received after seller-connected marketplace payments have launched.
- Mercado Pago approves a payment after the Lumina inventory reservation expires.

## Out of Scope

- Payment providers other than Mercado Pago.
- Multiple sellers in one cart or Mercado Pago Split Payments 1:N.
- Countries or currencies other than the current Argentina/ARS flow.
- Staff connecting, disconnecting, or changing the organization's seller account.
- Owner-configurable Lumina commission rates; the Lumina rate is fixed at 3% for this iteration.
- Programmatically changing the owner's Mercado Pago settlement option or guaranteeing its actual fee or release date.
- Multiple installments, seller-financed installment promotions, and offline payment methods.
- A new in-app card-entry experience; this iteration retains Checkout Pro.
- Automated refunds, partial refunds, disputes, chargebacks, and proportional commission reversals.
- Repricing historical purchases or tickets sold before this feature.

## Definition of Done

- Focused tests prove organization authorization, OAuth state replay protection, encrypted credential handling, atomic refresh, minor-unit fee calculations and rounding, immutable snapshots, seller-specific preference creation, `marketplace_fee`, webhook seller routing, fact verification, idempotency, reconnect behavior, and legacy routing.
- Dashboard tests cover disconnected, connecting, connected, refresh-failed, and reconnected account states plus ticket-price breakdowns.
- Web tests cover fee disclosure, changed quotes, confirmation, disabled payments, and redirect only after explicit confirmation.
- A Mercado Pago sandbox demonstration uses separate marketplace, seller, and buyer test accounts and proves that seller proceeds and Lumina's commission are routed to the intended accounts.
- Migration/backfill checks prove historical purchases preserve their original totals with zero marketplace-fee reinterpretation.
- `pnpm type-check`, `pnpm lint`, `pnpm format:check`, focused tests, affected builds, i18n validation, and `git diff --check` pass.
- A delegated security and quality review confirms the acceptance criteria, responsive UI, accessibility, localization, themes, and absence of credential leakage.

## Open Questions

None.
