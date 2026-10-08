# Plan 061 - Domain-Based Mail Sender Types

## Scope and Status

Implementation covers API mail, shared types/validation, test fixtures, and operator documentation. Feature 035 remains the baseline for SES; this feature replaces its global sender configuration and limits its Reply-To setting to support sends.

## Sender Policy

```dotenv
MAIL_DOMAIN=dev.lumina-events.com
MAIL_REPLY_TO=luminaeventssupport@gmail.com
```

| Category   | From                             | Reply-To                                               | Classification                                               |
| ---------- | -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `NO_REPLY` | `no-reply@dev.lumina-events.com` | Omitted                                                | Password reset, registration verification, staff invitations |
| `SUPPORT`  | `support@dev.lumina-events.com`  | `luminaeventssupport@gmail.com` (from `MAIL_REPLY_TO`) | Available for future sends                                   |

Welcome and its development smoke caller use `NO_REPLY`. No new support product flow is proposed.

## Architecture and Files

1. Add `MAIL_SENDER_TYPE` and its derived type to the existing `@repo/types` enum/export structure. Add a reusable mail-domain schema to `@repo/validators` and expose it through established exports. Compose it in `apps/api/src/config/env.schema.ts`, preserving the current application-specific env schema boundary.
2. Replace `MAIL_FROM` with `MAIL_DOMAIN` and retain `MAIL_REPLY_TO` as an independent support reply destination. Normalize domains once, allow missing/blank domain values as mail-disabled, and reject invalid nonblank domains. Validate DNS labels and total length, disallow address/URL syntax, and verify the derived email addresses. Trim `MAIL_REPLY_TO` and validate nonblank values as a single email address using shared validation; permit external domains including Gmail. Blank Reply-To remains allowed for no-reply-only deployments but causes `NOT_CONFIGURED` on support sends. Keep AWS credential pairing and `MAIL_SMOKE_TO` unchanged.
3. Extend `apps/api/src/modules/mail/types/mail-sender.ts` with required `senderType`. Introduce one provider-independent policy resolver in the mail slice. Its fixed sender local parts come from constants; callers cannot override addresses. `MailConfigService` uses the normalized domain for baseline configured status and checks the reply destination for support sends; the adapter and service share policy/configuration logic instead of duplicating concatenation or validation.
4. Update `adapters/ses.mail-sender.ts` to resolve each message's policy and map From to SES `FromEmailAddress`. Map Reply-To to `ReplyToAddresses` only for support. Preserve credentials, HTML/text, recipients, message IDs, and errors. `SendMailUseCase` and the `MailSender` port continue forwarding an internal provider-independent contract.
5. Update `application/send-password-reset.use-case.ts`, `send-user-registration.use-case.ts`, `send-staff-invitation.use-case.ts`, and `send-welcome.use-case.ts` with explicit approved classifications. Leave their auth callers and template rendering unchanged. Existing staff invitation is not wired to a new caller.
6. Migrate `test/setup.ts`, env/config/adapter fixtures, `deploy/env/{development,staging,production}.runtime.env.example`, `deploy/env/README.md`, `deploy/CLOUD_RUN_BOOTSTRAP.md`, and `spec/constitution/tech-stack.md`. Audit current executable/config/documentation references; retain historical feature artifacts as history. Give operators instructions for replacing local and deployed values without printing secret env files or applying deployments.

## Operator Prerequisites

- Verify the sending domain/identities in the configured SES region (currently `sa-east-1`); domain verification must cover both derived addresses. Sending remains subject to SES sandbox restrictions.
- Ensure the inbox configured in `MAIL_REPLY_TO` exists and receives mail (for example, the existing Gmail account). A receiving mailbox at `support@<domain>` is not required for replies routed through Reply-To; direct emails to that sender address require separate receiving configuration.
- Configure receiving infrastructure to reject or discard `no-reply@<domain>` messages if unattended replies must not be accepted. Sender headers alone cannot enforce this.
- Coordinate replacement of `MAIL_FROM` with `MAIL_DOMAIN` with the release; retain the existing Gmail value in `MAIL_REPLY_TO`. There is no fallback to `MAIL_FROM` or a derived reply address.

References: [SES v2 SendEmail](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html), [SES email receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html). Current SDK documentation was consulted through Context7. Existing SES SDK is sufficient; no upgrade is planned.

## Verification and Delivery

This implementation has **high test importance** because it changes mail contracts and configuration used by authentication. Documentation-only work remains low importance and does not need new automated tests.

For each implementation task, complete test-engineer first with a relevant failing test, implementation-engineer second, then read-only quality-reviewer. The parent fixes findings and records verification before checking off the task. Implement one task per turn unless the user authorizes a batch.

Keep the API env, contract, callers, and SES adapter migration together in T2: removing old env fields before migrating the adapter would break compilation. T3 is documentation-only and omits test-engineer; T4 consolidates verification rather than adding production behavior.

Coverage: domain normalization and invalid/blank domains; Gmail and invalid/blank Reply-To validation; support failure on missing Reply-To without affecting no-reply sends; configured/unconfigured behavior; required sender contract and use-case classifications; exact SES payloads for both categories; omitted no-reply Reply-To even when Gmail is configured; sequential sends without policy leakage; existing recipient/content/error/credential behavior. Do not send live emails during automated tests.

Run affected Vitest suites using the established repository setup, `pnpm type-check`, `pnpm lint`, `pnpm format:check`, and `git diff --check`. For this draft, check formatting only for the three new Markdown files and review their consistency. Existing unrelated working-tree changes must be preserved. Manual delivery/header/reply verification requires configured identities and inboxes plus authorization for live sends.

## Risks

- Deploying code before supplying `MAIL_DOMAIN` disables outbound mail; configuration migration must be coordinated.
- Support reply routing depends on receiving infrastructure outside the API.
- Missing caller classifications become compile errors; inspect all generic and template send calls.
- Registration and reset callers currently catch delivery errors; preserve behavior and test sender policy at the mail boundary.
