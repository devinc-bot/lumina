# Spec 061 - Domain-Based Mail Sender Types

## Context and Objective

Lumina currently applies one `MAIL_FROM` and one optional `MAIL_REPLY_TO` to every SES message. Derive two sender identities from a single `MAIL_DOMAIN` instead: automated mail uses `no-reply@<domain>` without Reply-To, while support mail uses `support@<domain>` with Reply-To pointing to an independently configured `MAIL_REPLY_TO`, such as `luminaeventssupport@gmail.com`. This feature supersedes the global Reply-To policy in feature 035. Support is a capability for future sends; every existing message, including welcome and the development smoke, uses `NO_REPLY`.

## Users / Actors

- Recipients of password resets, registration verification, invitations, and future support emails.
- API mail use cases selecting the sender category.
- Operators configuring the sending domain and receiving mailboxes.

## User Stories

- H1: As an operator, I want to configure one mail domain so that sender addresses are consistent across environments.
- H2: As a recipient, I want support email replies to reach the support inbox.
- H3: As an API maintainer, I want each send to declare its sender type so that automated emails never inherit a global support Reply-To.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: THE SYSTEM SHALL derive sender addresses exclusively from `MAIL_DOMAIN` and a shared `MAIL_SENDER_TYPE` constant map containing `NO_REPLY` and `SUPPORT`.
- RF-2: WHEN sending a `NO_REPLY` message, THE SYSTEM SHALL use `no-reply@<normalized domain>` as From and omit Reply-To entirely.
- RF-3: WHEN sending a `SUPPORT` message, THE SYSTEM SHALL use `support@<normalized domain>` as From and set Reply-To to the trimmed email address configured in `MAIL_REPLY_TO`, including external addresses such as Gmail.
- RF-4: WHEN password-reset, user/owner registration-verification, or staff-invitation mail is sent, THE SYSTEM SHALL select `NO_REPLY` explicitly.
- RF-5: THE SYSTEM SHALL require a sender type in the internal send contract without allowing arbitrary caller-supplied sender or reply addresses.
- RF-6: WHEN validating a nonempty `MAIL_DOMAIN`, THE SYSTEM SHALL trim surrounding whitespace, normalize letter casing, accept valid DNS domains including subdomains, and reject full email addresses, URLs, ports, paths, embedded whitespace, and malformed domain labels using reusable validation from `@repo/validators`.
- RF-7: IF `MAIL_DOMAIN` is missing, empty, or whitespace-only, THEN THE SYSTEM SHALL treat mail as unconfigured and preserve the localized `NOT_CONFIGURED` send failure; IF a nonempty domain is invalid, THEN THE SYSTEM SHALL reject configuration during environment validation.
- RF-8: THE SYSTEM SHALL replace runtime `MAIL_FROM` with `MAIL_DOMAIN` without a legacy fallback and retain `MAIL_REPLY_TO` exclusively for `SUPPORT` messages.
- RF-9: THE SYSTEM SHALL preserve SES credentials, recipients, rendered content, result mapping, localized delivery errors, and existing auth delivery-failure handling.
- RF-10: THE SYSTEM SHALL document sending-identity verification, support inbox provisioning, and rejection or discard of inbound no-reply messages as separate operator responsibilities.
- RF-11: IF a nonempty `MAIL_REPLY_TO` is not a valid single email address, THEN THE SYSTEM SHALL reject configuration during environment validation using reusable validation from `@repo/validators`; IF it is missing or blank when sending `SUPPORT` mail, THEN THE SYSTEM SHALL return the localized `NOT_CONFIGURED` failure without falling back to the sender address. Missing Reply-To SHALL NOT disable configured `NO_REPLY` sends.

## Non-Functional Requirements

- Resolve sender policy centrally; provider types remain inside the SES adapter.
- Use shared types and validators without new dependencies, database changes, or public endpoints.
- Keep existing bilingual templates and subjects unchanged.
- Do not read or expose secrets while updating configuration documentation.

## Edge Cases

- `MAIL_DOMAIN=dev.lumina-events.com` produces the exact hyphenated local part `no-reply` and the local part `support`.
- Uppercase and surrounding whitespace normalize consistently for both sender types.
- Blank domain disables mail; a full address such as `support@example.com` fails validation.
- `MAIL_REPLY_TO=luminaeventssupport@gmail.com` routes support replies to Gmail without changing either derived sender address; no-reply ignores this setting.
- No-reply emails must omit the SES Reply-To field rather than send an empty array or inherit a previous category's address.
- Selecting a sender type must not leak policy between consecutive sends using the same adapter.
- SES may reject an unverified identity; support replies cannot arrive without a receiving inbox or alias.
- Omitting Reply-To cannot disable the recipient's Reply button. Receiving infrastructure controls whether replies to no-reply are rejected or discarded.

## Out of Scope

- New support templates, support endpoints, or a helpdesk integration.
- Connecting staff-invitation or welcome emails to new product flows.
- Mailbox creation, MX/DNS automation, inbound-mail processing, or deploying infrastructure.
- Renaming or archiving feature 035; changing auth flows or delivery retry policy.
- Editing local secret environment files during planning.

## Definition of Done

- Classification questions are resolved and these artifacts are reviewed before implementation.
- Both sender categories have focused passing tests, including exact SES From/Reply-To payloads and configuration validation.
- Existing mail use cases explicitly declare their approved category; no global address fallback remains.
- Test fixtures, deploy examples, bootstrap commands, and current mail documentation use `MAIL_DOMAIN` and support-only `MAIL_REPLY_TO`.
- Required implementation phases complete: test-engineer, implementation-engineer, and read-only quality-reviewer; findings are corrected.
- Focused tests, applicable type/lint/format checks, and `git diff --check` pass or unrelated failures are documented.
- Live sending and reply handling are reported separately from mocked verification and performed only when authorized and configured.

## Open Questions

None. `SUPPORT` is prepared for future sends without assigning a current product flow; all existing
sends, including welcome and the development smoke, use `NO_REPLY`.
