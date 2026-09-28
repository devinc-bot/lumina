# Mercado Pago marketplace runbook

## Prerequisites

1. Obtain Mercado Pago approval for Split Payments 1:1 in Argentina and confirm each seller's KYC eligibility.
2. Configure the static API callback URL as `MERCADOPAGO_OAUTH_REDIRECT_URI` in the Mercado Pago application.
3. Enable PKCE and select the `read`, `offline_access`, and `write` application permissions. Renew the production credentials after saving those permission changes.
4. Configure the API webhook URL at `/api/mercado-pago/webhook` and store its signing secret in `MERCADOPAGO_WEBHOOK_SECRET`.
5. Use separate platform, seller, and buyer test accounts for sandbox validation. Never use a real seller token in a test environment.
6. Generate a 32-byte random encryption key, base64 encode it, and store it only in Secret Manager as `MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY`.

## Rollout

1. Deploy the additive migration before enabling the flag.
2. Set `MERCADOPAGO_MARKETPLACE_ENABLED=false` while validating schema and dashboard visibility.
3. Enable it only in a sandbox environment after OAuth, seller checkout, webhook signature, and reconciliation have been verified with separate accounts.
4. With the flag enabled, tickets from organizations without a connected seller account cannot be activated or sold. Inactive tickets remain editable.
5. Monitor connections in `reconnect_required` and ask the owner to reconnect. Do not expose the failure payload or credentials.

### Migration metadata note

The marketplace migration is an additive hand-authored SQL migration and has a matching journal entry.
Its Drizzle schema snapshot must be generated and reviewed with the repository's installed `drizzle-kit`
before deployment. Do not fabricate or manually edit a Drizzle snapshot when the generator is unavailable.

## Credential rotation and recovery

- Rotate the encryption key by deploying code able to read the previous key version, re-encrypt every active connection, then retire the old secret after verification.
- On an OAuth refresh/provider rejection, mark the connection reconnect-required and block new marketplace checkout. Do not delete the historical connection row.

## Reconciliation

Webhook receipt alone is not payment proof. Verify its signature, retrieve payment facts using the seller credential selected from trusted persisted context, and compare the purchase reference, seller, gross amount, currency, and marketplace fee before issuing tickets. Store actual provider fee and owner net separately from the quote when Mercado Pago supplies them.

## Deferred operations

Refunds, chargebacks, disputes, and marketplace-fee reversals are outside this release. Do not attempt them manually through this feature's checkout flow; create the dedicated operational process first.

## Credential model

Marketplace checkout, cancellation, and reconciliation use the encrypted OAuth credential snapshot of the connected organization. Do not configure a global Mercado Pago access token for these operations.
