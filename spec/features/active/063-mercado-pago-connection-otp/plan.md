# Plan 063 - Mercado Pago Connection OTP

## Status and Scope

Planning only; no production implementation is authorized by this request. Delivery destination and attempt semantics are confirmed. Extend the current feature 049 OAuth implementation without refactoring checkout or the shared auth stack. This planning task has low automated-test importance because it changes documentation only; the security implementation has high test importance and requires TDD.

## Current Architecture

- `apps/api/src/modules/mercado-pago/presentation/mercado-pago.controller.ts`: owner-guarded connect endpoint currently returns an OAuth URL immediately.
- `application/manage-mercado-pago-connection.use-case.ts`: creates 10-minute OAuth state and encrypted PKCE verifier; callback consumes state and rechecks the owner's organization without a Lumina session.
- `packages/db/src/repositories/mercado-pago/oauth-states.ts`: atomic one-time state consumption. `owners/find-owner-profile-by-document-id.ts` resolves the registered account email.
- Dashboard connection component and service live under `apps/dashboard/app/modules/owner/`, not the older settings path described in feature 049.
- `apps/api/src/modules/mail/`: SES adapter, React Email templates, localized rendering, and explicit no-reply sender policy.
- `apps/api/src/modules/jobs/`: local schedulers behind `ENABLE_IN_PROCESS_SCHEDULERS` and one OIDC-protected production aggregate pipeline. Production cron is `0 0 1,11,21 * *` UTC, per feature 042.

## Flow and Contracts

1. Change existing connect/reconnect initiation and disconnect initiation into owner-protected action-bound challenge requests. Return a shared DTO containing challenge UUID, `expiresAt`, masked destination, and resend availability; never return OAuth state or URL here. Reject client-supplied destination or owner/organization identities.
2. Add an owner-protected verification endpoint accepting `{ challengeDocumentId, code }` validated in `@repo/validators`. A successful connection/reconnection response contains the existing `authorizationUrl`; a successful disconnect response removes only the authenticated owner's organization connection. Errors expose stable localized codes and safe remaining-attempt metadata only for the requester's challenge.
3. Add shared OTP policy constants: six digits, TTL 900,000 ms, four failed attempts maximum. Reuse existing `AUTH_SENSITIVE` and `AUTH_CONFIRM` request profiles and `API_ROUTES`/`buildApiPath` conventions.
4. As bounded technical defaults, apply a persisted 60-second resend cooldown and at most five issuances per rolling 15-minute window per owner, mirroring the existing sensitive-auth budget. Count all issued records, including consumed, invalidated, and delivery-failed ones; apply limits under an owner-scoped database lock so concurrent instances cannot reset them. Cleanup cannot erase issuance counts within this window because records expire 15 minutes after issuance.
5. Connection/reconnection verification consumes the OTP and inserts a fresh OAuth state in one transaction; only then does the existing OAuth port build the URL. Disconnect verification consumes the OTP and disconnects the owner-bound connection in one transaction. Do not introduce a reusable verified-session flag. OTP expiry and the existing 10-minute OAuth-state expiry remain separate clocks.
6. Initial connection, recovery, account replacement through reconnection, and disconnection all use this flow. A canceled or failed OAuth attempt starts over with a new OTP. Automatic refresh remains unchanged.

## Persistence and Repository Design

Add a reusable `otps` table with base columns/public UUID, explicit `type`, subject document ID, opaque scope, salted code hash, expiry, failed-attempt counter, consumed timestamp, and invalidated timestamp. Mercado Pago uses distinct `OTP_TYPE.MERCADO_PAGO_CONNECTION` and `OTP_TYPE.MERCADO_PAGO_DISCONNECTION` values, the owner document as subject, and an organization-derived scope. Index subject/type/creation time for issuance budgets and type/expiry for cleanup; enforce counter bounds. Retain terminal challenge rows until expiry so issuance limits survive resends and failed sends. New OTP consumers add a shared type rather than a new persistence table.

Use the existing bcrypt dependency and Node crypto primitives: generate a uniform six-digit value with leading-zero padding and hash a challenge-bound input. No additional secret or dependency is needed. Compare under a serialized challenge transition, with a documented lock order for owner and challenge rows. Read fresh authoritative time after acquiring locks and recheck expiry before committing success, including time spent comparing the hash. Return explicit repository outcomes rather than throwing inside transactions after persisting a wrong-code count, which would roll the count back.

Repositories own creation/supersession, persisted issuance checks, challenge verification, atomic OTP consumption plus OAuth-state insertion, exact-challenge delivery-failure invalidation, and expiry deletion. Revalidate the owner/organization boundary before successful initiation. Derive the authorization URL from transaction-created state material without exposing it in failure responses.

Add nullable `otpVerifiedAt` to `mercado_pago_oauth_states` as durable provenance. Populate it only in the successful verification transaction; callback state consumption must require it. Reject pre-rollout states with a null marker and explain that the owner must restart. Do not use an FK to the OTP record, since expiry cleanup must not break a valid OAuth callback. Existing connections require no backfill or reconnection.

Use a new timestamped migration and update exports. Delivery order follows entity dependencies: schema and repository, validators and types, API/controller, route constants, and dashboard service. Do not manually edit generated files or rename confirmed migrations.

## API and Mail

Replace the ungated `ManageMercadoPagoConnectionUseCase.start()` path rather than retaining a public compatibility bypass. Keep OTP orchestration in focused Mercado Pago use cases and make state creation reachable only through successful verification. Preserve marketplace configuration checks, role guards, organization resolution, OAuth port, callback ownership checks, and credential encryption.

Add `send-mercado-pago-connection-otp.use-case.ts` and a corresponding React Email template through the existing `MailTemplatesService`, module exports, and `SendMailUseCase`. Use `MAIL_SENDER_TYPE.NO_REPLY` and bilingual subject/body explaining the action, 15-minute expiry, and what to do if unsolicited. Handle returned send failure and thrown errors; invalidate only that challenge. Do not hold a database transaction during SES delivery. Sending acceptance means the provider accepted delivery, not guaranteed inbox arrival.

## Dashboard and Localization

Update `modules/owner/services/mercado-pago-connection.service.ts` and `components/mercado-pago-connection-section.tsx` to request a challenge before redirecting. Use existing UI primitives for a focused verification form with a labeled six-digit text input, numeric input hint, one-time-code autocomplete, paste support, masked email, expiry, remaining attempts, resend cooldown, and cancel.

Disable duplicate pending actions, retain server errors, and require a new code after expiry/invalidation. Client countdowns are informational; API time remains authoritative. Cancel clears in-memory entry only; a fresh request invalidates the previous challenge. Keep challenge/code out of URLs and persistent browser storage. Redirect only after successful verification. Add shared settings, emails, and errors translations in Spanish and English. Read-only UI review must use `impeccable`.

## Scheduled Cleanup

Add `MercadoPagoConnectionOtpCleanupScheduler` to local scheduler providers, with a daily midnight UTC cron and `waitForCompletion: true`. Delegate to the repository through `runCleanupJob`. Add the same deletion operation as a named step in `internal-job-steps.ts` and `RunInternalJobsUseCase`; update `JOBS.md` and the relevant production runbook.

Delete only records with `expiresAt <= now`; include consumed/invalidated expired records without a further retention delay. Use a bounded batch and document/report whether more expired records remain so the sparse production cadence is visible. Cleanup is idempotent and must not delete unexpired challenges or OAuth states. Keep the existing single OIDC endpoint, service-account allowlist, and production cadence. Production removal may be delayed until the next aggregate invocation; rejection at 15 minutes is immediate and independent. More frequent physical deletion would reopen feature 042's explicit cost decision and is outside this plan.

The scheduling options were checked with Context7 against the official [NestJS Schedule documentation](https://github.com/nestjs/schedule/blob/master/_autodocs/configuration.md). Per-process overlap prevention does not replace database concurrency controls across instances.

## Verification and Delivery

Future implementation has high test importance: auth, payment-account authorization, validation, contracts, and data integrity. For each implementation task, run test-engineer first with a failing regression, implementation-engineer second, and quality-reviewer last; fix findings before completion. Implement one task per turn unless the user authorizes a batch.

- Repository integration: challenge ownership, persisted issuance limits, serialized resends, fourth failure persistence, valid fourth submission, exact expiry, replay, success/state transaction rollback, valid/invalid races, and cleanup versus verification. Use only isolated `DATABASE_TEST_URL`; report skipped integration tests if absent.
- API/security: guards, request validation, no pre-verification URL, no callable ungated start, callback provenance including pre-rollout states, configuration failures, mail send results/exceptions, and no sensitive response/log content.
- Mail/dashboard: bilingual subject/template, no-reply category, leading zeros/paste, redirect timing, server attempt feedback, expiry, resend, delivery error, keyboard focus, small screens, and both themes.
- Jobs: local registration and disabled-production schedulers, UTC cron metadata, bounded deletion, pipeline registration/order, retry/idempotency, unchanged OIDC enforcement, and retained unexpired rows.
- Run focused Vitest tests for affected files; isolated migration/repository checks; `pnpm check:i18n`, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, `pnpm build:api`, `pnpm build:dashboard`, and `git diff --check` as applicable. Report environment or unrelated failures precisely.

Roll out schema before API enforcement and deploy the updated dashboard alongside the contract change. Existing connections and payment history stay usable. In-flight pre-OTP OAuth states fail closed and require a new initiation. Never roll back by restoring an ungated connection endpoint.
