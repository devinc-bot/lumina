# Spec 049 - Owner Organization Registration

## Context and Objective

Owner registration currently creates a profile and account link without the organization membership required by settings. Consequently, a valid owner session can receive an owner-not-found response. Restore the existing single-organization invariant and provide a targeted repair for affected accounts.

## Users / Actors

Owners registering through the dashboard and operators repairing incomplete registrations.

## User Stories

- H1: As an owner, I want settings to load after registration so that I can manage my profile and organization.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an owner profile is registered, THE SYSTEM SHALL create its organization and membership in the same registration transaction.
- RF-2: WHEN an organization is provisioned, THE SYSTEM SHALL use the owner's full name and a unique slug, including for concurrent registrations with identical names.
- RF-3: IF organization provisioning fails, THEN THE SYSTEM SHALL roll back registration.
- RF-4: WHEN the repair is explicitly applied, THE SYSTEM SHALL provision an organization only for owner accounts without an organization membership and preserve existing memberships.
- RF-5: WHEN settings resolves an owner, THE SYSTEM SHALL retain the existing single-organization requirement and response contract.

## Non-Functional Requirements

Database operations remain in repositories. No new dependencies, persisted fields, or API contracts. Repair defaults to a read-only preview and is idempotent.

## Edge Cases

Duplicate owner names, concurrent registrations, missing organization insertion result, existing and ambiguous memberships, repeated repair runs.

## Out of Scope

Multiple-organization product flows, UI changes, session changes, and automatic database repair during settings reads.

## Definition of Done

Regression tests fail before the fix and pass afterward. Relevant type-check, lint, formatting, and diff checks complete. A delegated reviewer checks implementation. Runtime repair and authenticated verification are reported separately if unavailable.

## Open Questions

None. A read-only runtime database check found two owners with an account link and no organization membership. One additional owner has no account link and is outside the targeted repair.
