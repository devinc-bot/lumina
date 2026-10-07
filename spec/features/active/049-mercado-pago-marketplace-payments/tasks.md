# Tasks 049 - Mercado Pago Marketplace Payments

## Review Workload Forecast

- 400-line budget risk: High.
- Chained PRs recommended: Yes.
- Delivery strategy: auto-chain.
- Chain strategy: feature-branch-chain.
- Work units: pricing contracts (T2), persistence and OAuth (T3-T4), checkout and reconciliation (T5-T7), owner and buyer UI (T8-T10), then rollout and verification (T11-T12).

- [x] T1: Resolved the tax-inclusive 3% fee, disconnected-organization activation/sales gating, and deferred reversal scope; validated the documented Argentina Checkout Pro marketplace model with estimated provider fees, one installment, and offline payment types excluded; recorded the approved minor-unit gross-up fixture; and approved the reviewed feature for implementation.
- [x] T2: Add shared connection, credential-source, pricing-policy, and price-breakdown contracts plus validators and route constants; write failing-first tests for minor-unit fee calculation, the confirmed 3% base, gross-up, rounding, quantity, and policy-version behavior.
- [ ] T3: Add organization payment connection, one-time OAuth state, purchase/payment snapshot, and legacy-source schema changes with a timestamped migration and backfill; add repository integration tests for organization isolation, state replay, connection history, monetary integrity, and legacy preservation.
- [ ] T4: Add the Mercado Pago OAuth/credential port, encrypted token storage, owner-authorized connect/status/callback/reconnect/disconnect API flow, atomic token refresh, 24-hour cleanup of expired OAuth/PKCE state, environment contracts, and focused auth/security tests.
- [ ] T5: Make checkout reservation and public payment readiness organization-aware, calculate and snapshot the authoritative fee breakdown transactionally, and cover stock, stale quote, disconnected account, reconnect, and rounding cases with failing-first tests.
- [ ] T6: Make the Checkout Pro adapter seller-aware, create preferences with the gross total, a face-subtotal-based monetary `marketplace_fee`, one installment, and offline payment types excluded; route lookup/expiration by immutable credential source; retain explicit legacy handling; and test seller selection, payment-method configuration, idempotency, provider errors, and cancellation.
- [ ] T7: Route and reconcile webhooks by seller connection, verify seller/preference/reference/amount/currency/commission facts, persist actual provider fee/net facts when available, preserve idempotency and late-payment review, and add adversarial reconciliation tests.
- [ ] T8: Add the localized owner-only Mercado Pago settings section in `dashboard`, including connection recovery states and safe disconnect/reconnect behavior, with focused component/service tests.
- [ ] T9: Add the localized ticket create/edit commercial breakdown and the confirmed activation gating in `dashboard`, with tests for live quotes, estimate labels, changed price, errors, responsiveness, themes, and accessibility.
- [ ] T10: Add the localized pre-purchase breakdown and explicit confirmation flow in `web`, including organization readiness and stale-quote reconfirmation, with tests for all amounts, errors, disabled states, redirect timing, responsiveness, themes, and accessibility.
- [x] T10c: Preserve the slug-based event detail destination in the login `returnTo` value when an unauthenticated customer starts checkout, with a focused regression test. Added the test and implementation; focused test and type-check could not run because Node.js and pnpm are unavailable. Read-only quality review found no material issues.
- [x] T10a: Fix checkout-result reconciliation polling in `web`: re-read pending purchases until a terminal status or five total attempts, without internal retries, and cover the boundaries with a focused hook test. Local verification is blocked because Node.js is unavailable in the current environment.
- [x] T11: Add rollout flags, owner onboarding messaging, deployment variables, Mercado Pago marketplace/KYC/runbook documentation, and legacy retirement criteria without removing the legacy credential path.
- [x] T11a: Replaced the global Mercado Pago estimated-fee environment value with an owner-recorded settlement option on the organization connection; added its migration, authorized setting API, organization-aware quote/checkout resolution, localized dashboard select, and focused payment/authorization/UI tests.
- [x] T11b: Add the standard Argentina VAT estimate to Mercado Pago settlement-fee quotes, expose it as an informational component without double-charging it, and update the owner/customer fee disclosure with focused minor-unit tests.
- [x] T11c: Bind every Mercado Pago runtime input to environment-specific Secret Manager secrets during Cloud Run CI deployments, including the marketplace rollout configuration and credential-encryption key material; validate the secret-id deployment contract without exposing values to GitHub Actions or image builds.
- [x] T11d: Provide separate interactive generic Secret Manager helpers that upsert any named secret from a masked value or permanently delete a confirmed secret, without logging the value or passing it as a command-line argument.
- [x] T11e: Provide an interactive Cloud Run helper that additively binds an existing Secret Manager secret version to a named service environment variable.
- [x] T11f: Pass the Mercado Pago marketplace rollout flag, client ID, OAuth redirect URI, and credential-key version from GitHub Environment variables into Cloud Run as non-secret runtime configuration.
- [x] T11g: Preserve the Cloud Run deployment's single comma-separated `--update-env-vars` argument while formatting the Mercado Pago runtime configuration readably.
- [ ] T12: Run focused and integration tests, the Mercado Pago sandbox seller/buyer flow, migration/backfill verification, `pnpm check:i18n`, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, affected builds, and `git diff --check`; complete delegated security, UI craftsmanship, and acceptance review and fix all findings.
