# Spec 051 - Checkout Data Retention

## Context and Objective

Checkout keeps expired reservations, failed purchases, pending or cancelled payment attempts, and raw
provider webhook payloads indefinitely. Define bounded retention that removes unnecessary operational
data while preserving financial evidence, late-payment reconciliation, ticket history, and records under
legal hold. The policy starts from the retention periods agreed for Lumina and must be verified against
the final legal and accounting policy before production purges are enabled.

## Users / Actors

- Customers whose unsuccessful checkout attempts contain personal data.
- Operators handling disputes, refunds, chargebacks, payment reconciliation, and legal holds.
- Developers and deployment operators who run the scheduled retention job.

## User Stories

- H1: As a customer, I want unsuccessful checkout data removed or dissociated when it is no longer needed
  so that my information is not retained indefinitely.
- H2: As an operator, I want payment and ticket evidence to remain available for the required period so
  that I can resolve financial disputes and audits.
- H3: As an operator, I want to stop automatic retention actions for a specific purchase under dispute.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an unsuccessful checkout has remained terminal for 90 days without an economic payment or
  issued ticket, THE SYSTEM SHALL remove its expired or released inventory reservation only when doing
  so cannot prevent a late provider webhook from being reconciled or safely recorded.
- RF-2: WHEN a provider webhook payload is older than 90 days and its receipt is terminal, THE SYSTEM
  SHALL remove the raw payload's unnecessary personal data while preserving the minimal provider identity
  and outcome needed for idempotency and audit.
- RF-3: WHEN an unsuccessful purchase reaches 12 months without an economic payment, issued ticket, or
  open dispute, THE SYSTEM SHALL set its `user_id` to null while preserving the minimum payment and
  purchase facts needed for financial and provider traceability.
- RF-4: WHILE a purchase has a legal hold, THE SYSTEM SHALL skip automatic reservation removal, payload
  minimization, and buyer dissociation for that purchase.
- RF-5: THE SYSTEM SHALL retain purchases with economic activity, payment outcomes, issued tickets, and
  reconciliation facts for at least 10 years, subject to the approved retention policy.
- RF-6: IF a candidate has a pending payment, unresolved webhook, late approved payment, issued ticket,
  or any other unresolved provider fact, THEN THE SYSTEM SHALL leave it intact and report the skipped
  candidate without converting payment state by assumption.
- RF-7: WHEN the retention job runs repeatedly or concurrently, THE SYSTEM SHALL apply bounded,
  idempotent changes without deleting a record that became ineligible during processing.
- RF-8: THE SYSTEM SHALL treat an approved payment, non-null `paid_at`, or manual reconciliation error as
  economic or unresolved evidence that blocks reservation cleanup and buyer dissociation, regardless of
  the purchase's displayed status.

## Non-Functional Requirements

- A production purge must initially run in dry-run mode and report candidate counts without identifiers,
  credentials, or payload contents.
- Database mutations must use `@repo/db` repositories and be transactional across affected rows.
- Retention cutoffs must use terminal timestamps, not an unrelated update timestamp.
- Minimal retained facts must not include provider access tokens, refresh tokens, or raw webhook payloads
  beyond their operational necessity.
- Legal and accounting review must approve the effective production policy before destructive jobs run.

## Edge Cases

- A provider sends an approved or rejected payment webhook after local expiration or retention cleanup.
- A webhook receipt is still received, processing, or failed at the payload cutoff.
- A pending payment coexists with an expired purchase, or a payment is approved but manual review remains.
- A purchase has issued tickets or check-in data despite a terminal purchase status.
- A legal hold is applied while a retention batch is processing.
- Multiple job instances select the same candidate.
- A purchase has multiple payment attempts, only one of which is terminal.

## Out of Scope

- Changing checkout expiration or Mercado Pago preference configuration.
- Purging confirmed purchases, issued tickets, check-in history, or financial records before their
  applicable retention period.
- Retrospectively deleting production data before the retention policy and rollback procedure are
  approved.

## Definition of Done

- The approved retention policy, legal-hold operation, and buyer dissociation approach are documented.
- Isolated database tests cover cutoffs, protected records, late webhooks, idempotency, concurrency,
  and the buyer-facing order contract after dissociation.
- A dry run proves candidate counts and a guarded production rollout is reviewed before enabling writes.
- Focused tests, type-check, lint, format check, affected builds, and `git diff --check` pass.

## Open Questions

None. Legal holds are managed manually in the database. The eligibility rules above fail closed when
provider, ticket, or reconciliation state is uncertain.
