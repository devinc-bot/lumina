# Plan 049 - Mercado Pago Marketplace Payments

## Status

Approved. Checkout Pro, the estimated Mercado Pago amount, the tax-inclusive 3% Lumina fee on ticket face-price subtotal, the one-installment/no-offline-payment configuration, connection gating, and reversal scope are confirmed.

## Approach

Replace the global platform-credential assumption for new sales with an organization-scoped Mercado Pago Split Payments 1:1 integration. Owners connect their seller account from `dashboard` through OAuth. Checkout continues through the existing Mercado Pago boundary, but every marketplace operation receives an explicit seller-connection context, and preference creation includes Lumina's fee as `marketplace_fee`. Add one authoritative pricing service that calculates and snapshots the buyer breakdown in minor units for both owner previews and checkout reservations.

Implement the feature in four bounded streams: seller onboarding and credential lifecycle; pricing policy and immutable monetary snapshots; seller-routed checkout and webhook reconciliation; and localized owner/customer disclosure. Preserve a legacy credential route only for payment attempts created before the marketplace rollout.

## Provider Constraint and Fee Decision

Mercado Pago's official Split Payments 1:1 documentation supports Argentina, requires an OAuth access token for each seller, and accepts a monetary `marketplace_fee` for Checkout Pro preferences. Mercado Pago deducts its fee from the seller first and the marketplace commission from the remaining funds.

The current Checkout Pro redirect does not reveal the buyer's eventual payment method or all seller-specific taxes before Lumina fixes the preference amount. Mercado Pago also states that Argentina checkout costs vary by seller province, payment method, and settlement timing. Therefore the existing flow cannot promise that a pre-redirect Mercado Pago fee is the provider's exact eventual charge.

The confirmed v1 path is to retain Checkout Pro and:

- show Lumina's 3% and the Lumina-side buyer total as exact;
- label the Mercado Pago component as an estimate produced by a versioned, server-owned fee policy;
- persist the quote and later persist the actual provider fee and owner net when available for reconciliation;
- avoid claiming that the owner is guaranteed to receive the face price when provider deductions vary;
- set the maximum installment count to one;
- exclude offline payment types while retaining account balance, debit cards, and credit cards in a single payment.

Lumina's 3% is the final tax-inclusive amount displayed to the buyer; do not add a separate Lumina tax line. Owners may create and edit inactive tickets while disconnected, but activation and purchase remain API-blocked. When marketplace checkout is enabled, previously active tickets from a disconnected organization are not sellable until it reconnects. Refunds, chargebacks, disputes, and marketplace-fee reversals are deliberately deferred.

This decision removes installment-financing variability but does not make the provider fee exact because payment method, province, settlement timing, and taxes may still affect it. The owner-facing expected proceeds remain an estimate until provider facts are reconciled.

For face subtotal `B`, calculate Lumina's fee as `P = ceilCent(B * 300 / 10_000)`. The provider-rate estimate `m` is derived from the organization's recorded Mercado Pago settlement option: instant 629 bps, 10 days 439 bps, 18 days 339 bps, or 35 days 149 bps. Add the standard Argentina VAT estimate `v = 2100` bps to that provider fee. Calculate the grossed-up total as `T = ceilCent((B + P) / (1 - (m / 10_000) * (1 + v / 10_000)))`; the displayed Mercado Pago charge `T - B - P` includes the provider fee and its estimated VAT. Expose the VAT component informationally, without adding it a second time to the buyer total. This formula is an estimate and excludes seller-specific withholdings, unless `m` represents every provider deduction applied to `T`. Implement calculations with integer cents and basis points, including deterministic ceiling and allocation rules.

The test suite must retain fixtures for provider-fee plus VAT gross-up at zero price, one cent, fractional-cent boundaries, and multiple-ticket quantities; the estimated VAT component plus the remaining provider fee must equal the displayed Mercado Pago charge.

## Data Model and Migrations

- Add `organization_payment_connections` (final name during implementation) with an organization/provider uniqueness constraint, provider seller identifier, connection status, live/test mode, granted scopes, encrypted access and refresh tokens, access-token expiry, encryption-key version, connected/refreshed/revoked timestamps, and non-sensitive failure metadata.
- Persist the owner-selected Mercado Pago settlement option on the organization connection, defaulting existing connections to 18 days. Store the option rather than a mutable arbitrary rate; the shared pricing policy maps its supported options to basis points.
- Add short-lived one-time OAuth authorization state persistence, storing a state hash/nonce bound to owner and organization with expiry and consumed timestamp. Do not store a reusable raw state token.
- Extend normalized purchases with immutable `subtotalAmount`, `platformFeeAmount`, `providerFeeQuotedAmount`, `totalAmount`, `currency`, `pricingPolicyVersion`, and whether the provider amount is estimated.
- Keep `purchase_items.unitPrice` and `lineTotal` as ticket face-price snapshots. Treat `purchases.totalAmount` and `payments.amount` as the gross amount charged to the buyer for new marketplace attempts.
- Bind each new payment attempt to the exact seller connection/version used to create its provider preference. Snapshot the provider seller identifier so reconnecting does not reroute historical operations.
- Persist actual provider fee, financing fee, taxes, marketplace fee, and net settlement when Mercado Pago exposes them through the verified payment response or marketplace reconciliation report; keep actual facts distinct from quoted amounts.
- Use an additive timestamped migration. Backfill legacy purchases with `subtotalAmount = totalAmount`, zero added fees, `pricingPolicyVersion = legacy`, and the legacy credential source. Do not recalculate historical monetary values.

## Shared Contracts and Pricing Policy

- Add shared connection statuses, settlement-option/rate constants, pricing-policy constants, fee basis-point constants, and credential-source constants to `@repo/types`; avoid provider/status magic strings.
- Add a shared `PriceBreakdown` contract with subtotal, Mercado Pago amount, Lumina fee, total, expected owner proceeds, currency, rate/policy metadata, and an `isProviderFeeEstimated` flag.
- Add owner-only Mercado Pago connection status DTOs and buyer-safe public breakdown DTOs. Never expose tokens, provider secrets, internal numeric IDs, or raw provider payloads.
- Add an owner-protected setting endpoint that updates only the owner's organization connection. The public ticket quote and checkout resolve the rate from the ticket organization's connection; the dashboard's draft-ticket quote resolves it from the authenticated owner's connection.
- Add validators for OAuth callback inputs and any price-quote request boundary in `@repo/validators`.
- Add payment connection, callback, disconnect/reconnect, and price-quote paths to `API_ROUTES` and construct paths with `buildApiPath`.
- Centralize the 3% rule and rounding in one server-owned pricing policy. Client previews may call a quote endpoint or consume safe pricing-policy metadata, but checkout recalculates authoritatively inside the reservation transaction.

## Repository Layer

1. Add organization-scoped repositories to create, retrieve, rotate, supersede, and revoke Mercado Pago connections while enforcing the owner's sole-organization boundary.
2. Add one-time OAuth state repositories with atomic consume semantics and a 24-hour expiry cleanup.
3. Extend public event/ticket reads to derive payment readiness from the event organization's active connection instead of global environment configuration and to return the approved buyer-facing breakdown.
4. Extend checkout reservation to lock the ticket, read the organization connection and pricing policy, calculate all monetary snapshots, reserve inventory, and create the payment attempt atomically.
5. Extend provider-preference attachment, pending cancellation, and reconciliation reads so each operation resolves the immutable credential source and seller identity used for that attempt.
6. Tighten reconciliation to verify the provider preference identifier in addition to seller, external reference, amount, currency, and marketplace fee before state transition and ticket issuance.
7. Preserve current duplicate-webhook handling and late-approved manual-review behavior while adding seller-specific routing and actual-fee facts.

## API and Mercado Pago Adapter

- Split the current Mercado Pago boundary into an OAuth/credential port and a seller-aware checkout port. Construct SDK clients per operation from decrypted short-lived credential material rather than retaining one seller client singleton.
- Add owner-protected connection start, status, callback completion, and disconnect/reconnect use cases. Bind authorization state to the signed owner identity and organization; use a static environment-specific redirect URI and minimal scopes.
- Refresh tokens before expiry with an organization-scoped lock and atomic rotation. On provider rejection, transition the connection to a reconnect-required state and disable new checkouts without deleting audit history.
- Create Checkout Pro preferences with the seller access token, gross buyer amount, stored purchase reference, notification/back URLs, expiration, idempotency key, and exact monetary `marketplace_fee` equal to 3% of the face-price subtotal under the approved rounding rule.
- Configure each preference with a maximum of one installment and exclude offline payment types while retaining Mercado Pago account balance, debit cards, and single-payment credit cards.
- Route preference lookup/expiration and payment lookup through the attempt's credential source. Legacy attempts keep using the existing platform token; new attempts never silently fall back to it.
- Validate webhook signatures before processing. Use trusted seller data from the notification only to locate a candidate connection, then query Mercado Pago and compare verified provider facts with stored snapshots before reconciliation.
- Update environment validation and deployment templates for marketplace application ID/client secret, OAuth redirect URI, credential-encryption key/version, webhook secret, and the temporary legacy credential. Do not place seller credentials in environment variables.

## Dashboard

- Add an owner-only Mercado Pago section to authenticated settings showing disconnected, connecting, connected, refresh-failed, reconnect-required, and disconnect-pending states without exposing credential details.
- Once connected, show a localized select for the settlement option currently configured in Mercado Pago. Explain that the owner must keep Lumina in sync with Mercado Pago and that the amount remains an estimate; save a selection change before updating ticket pricing previews.
- Add connect, reconnect, and disconnect actions with localized success/error feedback. Preserve historical connections internally when pending/historical attempts still require reconciliation.
- In ticket create and edit, show a compact live commercial breakdown near price: face price, Mercado Pago labeled amount, Lumina 3%, customer total, and expected owner proceeds. Clearly label estimates and explain that the final provider deduction can vary if the approved Checkout Pro path is used.
- Apply the clarified gating rule to ticket activation/publishing; keep API enforcement authoritative.

## Web

- Replace the one-click redirect from the event purchase panel with an accessible confirmation dialog or sheet that shows quantity, subtotal, Mercado Pago amount, Lumina fee, and total.
- Require explicit confirmation before creating the reservation/preference. If the server response returns a newer quote than the one displayed, update the summary and require confirmation again instead of redirecting silently.
- Render organization-specific payment readiness and localized unavailable/reconnect messaging. Do not imply the platform account is the recipient.
- Include the immutable breakdown in order/purchase details where this feature already exposes the paid total; broader receipt/email work remains separately scoped unless approved.
- Poll the checkout-result purchase read only while its payment status is pending, without internal retries, and stop once reconciliation returns a terminal status or five total purchase-read attempts have completed.

## Security, Privacy, and Operations

- Encrypt seller tokens with AES-256-GCM or an equivalent authenticated-encryption primitive using a versioned deployment secret; isolate encrypt/decrypt behind a port so a managed secret store can replace local envelope handling later.
- Never log OAuth codes, access tokens, refresh tokens, decrypted credential objects, or full provider payloads containing unnecessary personal data.
- Prevent cross-organization connection, callback, quote, and checkout access in repository predicates and API use cases.
- Decide whether a provider seller identifier may be linked to more than one organization; default to rejecting duplicates until a business case is approved.
- Document Mercado Pago marketplace approval, seller KYC level, test-account setup, redirect URLs, webhook configuration, key rotation, reconnect recovery, and reconciliation procedures.

## Rollout and Compatibility

- Introduce schema and read compatibility before enabling seller-connected checkout.
- Keep legacy payment attempts explicitly tagged and supported through the platform credential until reconciliation policy permits retirement; a reconnect must never redirect them to the owner's current token.
- Gate new marketplace preference creation behind an environment rollout flag until the Mercado Pago application and sandbox flow are validated.
- Allow inactive ticket maintenance while disabling activation and purchase until the organization connects. When marketplace checkout is enabled, disable sales of previously active tickets for disconnected organizations.
- Surface a dashboard callout before enforcement so owners can connect without an unexpected sales interruption.
- Remove the legacy platform credential only in a later verified task after pending/late payments and operational retention requirements are satisfied.

## Verification Strategy

Test importance is high because this feature changes payments, OAuth authorization, API contracts, and financial data integrity. Implementation must follow TDD with the repository-required `test-engineer` phase before production code and `quality-reviewer` after each implementation task.

- Unit/property tests: integer-cent percentage calculation, gross-up, ceiling, quantity allocation, policy versioning, and boundary values.
- Repository/integration tests: organization isolation, OAuth state atomic consume/replay, encrypted credential persistence, refresh rotation, connection supersession, migration backfill, reservation snapshots, reconnect history, and reconciliation locks.
- API/adapter tests: OAuth URL/callback exchange, provider error mapping, seller-token selection, idempotency keys, `marketplace_fee`, preference amount, token refresh races, disconnect behavior, legacy routing, and no credential leakage.
- Webhook tests: signature failure, unknown seller, wrong seller, wrong preference/reference/amount/currency/fee, duplicates, pending transitions, late approval, and actual-fee persistence.
- Client tests: all connection states, ticket price preview, estimate labeling, buyer confirmation, changed quote, disabled readiness, errors, mobile/desktop responsiveness, both themes, and Spanish/English copy.
- Sandbox E2E: marketplace application plus separate seller and buyer accounts; connect, quote, purchase, webhook, seller settlement, Lumina commission, reconnect, and cancellation.
- Commands: focused package tests, `pnpm check:i18n`, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, affected builds, migration checks, and `git diff --check`.

## Confirmed Decisions

- Seller settlement is organization-scoped and reaches the owner's connected Mercado Pago account rather than Lumina's platform balance.
- Lumina's marketplace commission is 3% of the ticket face-price subtotal.
- The customer-facing 3% Lumina fee is tax-inclusive; no further Lumina tax line is added.
- The buyer economically bears both disclosed fee components through the gross checkout amount.
- Owners see the breakdown in ticket create/edit and customers see it before purchase.
- Mercado Pago remains the provider and the current product operates in Argentina with ARS.
- The Mercado Pago component is explicitly labeled as estimated before redirect and reconciled against actual provider facts after payment.
- Checkout Pro is limited to one installment, keeps account-balance, debit-card, and single-payment credit-card methods, and excludes offline payment types.
- Only owners manage the connection; staff access is excluded from this iteration.
- Owners can create and edit inactive tickets while disconnected; activation and purchase are blocked, and active tickets are unsellable until their organization reconnects.
- Refunds, chargebacks, disputes, and commission reversals are deferred to a separate feature.

## Pending Decisions

None.
