import { expect, test } from 'vitest'
import { AccountSessionCleanupScheduler } from './schedulers/account-session-cleanup.scheduler.ts'
import { ApiErrorRetentionScheduler } from './schedulers/api-error-retention.scheduler.ts'
import { InvitationsCleanupScheduler } from './schedulers/invitations-cleanup.scheduler.ts'
import { OwnerRegistrationCleanupScheduler } from './schedulers/owner-registration-cleanup.scheduler.ts'
import { PasswordResetCleanupScheduler } from './schedulers/password-reset-cleanup.scheduler.ts'
import { PendingOrderCleanupScheduler } from './schedulers/pending-order-cleanup.scheduler.ts'
import { PurchaseExpiryScheduler } from './schedulers/purchase-expiry.scheduler.ts'
import { UserRegistrationCleanupScheduler } from './schedulers/user-registration-cleanup.scheduler.ts'
import { resolveInProcessSchedulerProviders } from './resolve-in-process-scheduler-providers.ts'

/**
 * Gating approach (locked for T3 impl):
 * Conditional Nest provider registration via `resolveInProcessSchedulerProviders(enabled)`.
 * When `ENV.ENABLE_IN_PROCESS_SCHEDULERS === false`, JobsModule must register zero scheduler
 * providers so `@Cron`/`@Interval` never fire. Prefer this over per-method early-returns
 * (those still register Schedule metadata and wake the process).
 */
test('registers no in-process schedulers when ENABLE_IN_PROCESS_SCHEDULERS is false', () => {
  expect(resolveInProcessSchedulerProviders(false)).toEqual([])
})

test('registers all catalog schedulers when ENABLE_IN_PROCESS_SCHEDULERS is true', () => {
  expect(resolveInProcessSchedulerProviders(true)).toEqual([
    PurchaseExpiryScheduler,
    PendingOrderCleanupScheduler,
    ApiErrorRetentionScheduler,
    UserRegistrationCleanupScheduler,
    OwnerRegistrationCleanupScheduler,
    PasswordResetCleanupScheduler,
    AccountSessionCleanupScheduler,
    InvitationsCleanupScheduler,
  ])
})
