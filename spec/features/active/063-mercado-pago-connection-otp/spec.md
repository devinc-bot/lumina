# Spec 063 - Mercado Pago Connection OTP

## Context and Objective

Mercado Pago connection currently starts OAuth immediately after owner authentication. Add an email OTP challenge before every new connection or reconnection so access to an authenticated dashboard session alone cannot change the organization's receiving account. The user confirmed delivery to the owner's registered email and four total verification attempts: the first three failures permit another attempt, and the fourth failure invalidates the code. Persist challenges in a general typed OTP table so future protected flows can reuse the same secure lifecycle without creating a new OTP table. This feature extends feature 049 and reuses the mail policy from 061 and the scheduling infrastructure from 042.

## Users / Actors

- Authenticated owners connecting Mercado Pago for their sole organization in `dashboard`.
- The transactional mail service delivering the OTP to the registered owner email.
- Mercado Pago completing the existing OAuth flow after successful OTP verification.
- Existing local and production job infrastructure deleting expired challenges.

## User Stories

- H1: As an owner, I want an email code before connecting, reconnecting, or disconnecting Mercado Pago so that control of my email is required to change the receiving account configuration.
- H2: As an owner, I want clear expiry and retry feedback so that I can complete verification or request a new code.
- H3: As an operator, I want expired OTP records deleted by scheduled cleanup so that obsolete authentication material does not accumulate indefinitely.

## Functional Requirements (EARS Acceptance Criteria)

- RF-1: WHEN an authenticated owner requests a Mercado Pago connection, reconnection, or disconnection, THE SYSTEM SHALL resolve the owner's organization and registered email server-side, create an action-bound challenge, and send an OTP before exposing an OAuth authorization URL or disconnecting the active payment connection.
- RF-2: THE SYSTEM SHALL generate a cryptographically random six-digit numeric OTP, preserve leading zeros, persist only its protected hash in the general `otps` table with an explicit OTP type, and set its expiry to exactly 15 minutes after issuance.
- RF-3: IF verification occurs at or after the challenge expiry, THEN THE SYSTEM SHALL reject the code even if the cleanup job has not deleted its record.
- RF-4: WHEN a well-formed incorrect OTP is submitted for an active challenge by its owner, THE SYSTEM SHALL atomically increment the failed-attempt count and return the remaining attempts; failures one, two, and three SHALL leave the challenge usable, and failure four SHALL invalidate it.
- RF-5: WHEN a correct OTP for connection or reconnection is submitted before expiry with fewer than four failures, THE SYSTEM SHALL atomically consume the challenge and create one owner/organization-bound OAuth state before returning its authorization URL. A correct fourth submission after three errors SHALL succeed.
- RF-5a: WHEN a correct OTP for disconnection is submitted before expiry with fewer than four failures, THE SYSTEM SHALL atomically consume the challenge and disconnect only the requesting owner's organization payment connection without creating OAuth state.
- RF-6: IF a challenge is missing, consumed, invalidated, expired, or belongs to another owner or organization, THEN THE SYSTEM SHALL reject verification without creating OAuth state or modifying the active payment connection.
- RF-7: WHEN a new challenge is issued for the same owner and organization, THE SYSTEM SHALL invalidate the preceding pending challenge; every accepted resend SHALL issue a fresh code, expiry, and attempt budget.
- RF-8: THE SYSTEM SHALL enforce persisted owner-level issuance limits across API instances in addition to existing HTTP rate-limit profiles, so resending cannot provide unlimited verification attempts.
- RF-9: IF mail delivery reports failure or throws, THEN THE SYSTEM SHALL invalidate the exact newly issued challenge, return localized failure feedback, and SHALL NOT issue OAuth state or an authorization URL.
- RF-10: WHEN Mercado Pago completes authorization, THE SYSTEM SHALL accept only an unexpired, single-use OAuth state created after successful connection or reconnection OTP verification and SHALL preserve the existing organization ownership check and PKCE flow.
- RF-11: WHEN scheduled OTP cleanup runs, THE SYSTEM SHALL delete challenges with `expiresAt <= now`, including expired consumed or invalidated records, retain unexpired challenges, and remain safe under retries and concurrent verification.
- RF-12: WHILE OTP verification is pending, THE SYSTEM SHALL show a masked destination, expiry information, code entry, remaining attempts, resend, cancellation, and localized pending/error/success feedback in the owner settings section.
- RF-13: IF a staff, customer, admin, or anonymous caller requests or verifies a challenge, THEN THE SYSTEM SHALL reject the request in the API before challenge creation, email delivery, or OAuth initiation.

## Non-Functional Requirements

- API authorization is authoritative. No browser flag, standalone reusable verification token, or ungated OAuth initiation method may bypass OTP.
- Protect low-entropy OTPs using the existing bcrypt dependency with a salt and challenge-bound input; do not copy plaintext registration-token storage or use an unkeyed fast hash for numeric codes.
- Serialize challenge issuance, resends, attempt updates, and success transitions in repositories. Successful consumption and OAuth state insertion share one transaction.
- Never log or return OTPs, hashes, full recipient emails, OAuth credentials, or PKCE verifiers. Log only safe aggregate outcomes.
- Contracts use UUID `documentId` values; schemas use `pgTable`, validation uses `@repo/validators`, and domain types/constants use `@repo/types`.
- Emails use `MAIL_SENDER_TYPE.NO_REPLY`. UI, subjects, templates, and errors support Spanish and English through `@repo/i18n`; dashboard supports accessible light and dark themes.
- OTP validity is independent of cleanup cadence. Reuse feature 042's existing production Scheduler job and OIDC pipeline without changing its confirmed cost/cadence policy.

## Edge Cases

- Correct code after three failures; fourth incorrect submission; any submission after invalidation.
- Verification exactly at expiry, delayed email arrival, leading zeros, malformed bodies, and challenge UUID tampering.
- Duplicate clicks, two tabs, simultaneous resends, valid-code replay, concurrent valid submissions, and a fourth failure racing with a correct code.
- Delivery failure for an older challenge after a newer challenge was issued; failure handling must not invalidate the newer record.
- OAuth cancellation or exchange failure after consuming an OTP requires a fresh challenge for a new initiation.
- Existing OAuth states without OTP verification provenance are rejected after rollout; owners restart the short-lived connection flow.
- Owner organization changes between issuance, verification, and callback; challenge ownership must be revalidated.
- Job retries, concurrent deletes, database failures, and Cloud Run scale-to-zero. Physical deletion in production occurs at the next existing aggregate run, potentially days after expiry.

## Out of Scope

- OTP for settlement-option changes, automatic credential refresh, customer checkout, or unrelated account actions.
- SMS, authenticator apps, new mail providers, generalized MFA, or staff management of payment connections.
- Changing Mercado Pago SDK behavior, checkout fees, historical payments, or active connection credentials before OAuth completion.
- Additional production Scheduler jobs/endpoints or changes to feature 042's aggregate cadence.

## Definition of Done

- The three artifacts are reviewed before implementation and confirmed attempt/delivery semantics remain consistent across layers.
- Failing-first security tests prove expiry, four-attempt boundaries, owner/organization isolation, issuance limits, resend invalidation, mail failures, atomic consumption, concurrency, callback provenance, and cleanup safety.
- Dashboard verification flow and bilingual mail templates are checked for accessibility, responsiveness, themes, and sensitive-data handling.
- Timestamped migration, repository exports, contracts, routes, mail wiring, local cron, and production pipeline are implemented and verified.
- Each implementation task completes required test-engineer, implementation-engineer, and read-only quality-reviewer phases; review findings are corrected.
- Focused tests, migration verification, i18n validation, applicable type/lint/format/build checks, and `git diff --check` pass or concrete unrelated/environment failures are reported.

## Open Questions

None. The user confirmed the registered owner email and four total verification attempts. Cleanup preserves the existing scheduling policy; physical deletion is distinct from the 15-minute validity boundary.
