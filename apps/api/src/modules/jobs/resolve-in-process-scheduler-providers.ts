import { AccountSessionCleanupScheduler } from './schedulers/account-session-cleanup.scheduler'
import { ApiErrorRetentionScheduler } from './schedulers/api-error-retention.scheduler'
import { CheckoutDataRetentionScheduler } from './schedulers/checkout-data-retention.scheduler'
import { InvitationsCleanupScheduler } from './schedulers/invitations-cleanup.scheduler'
import { MercadoPagoOAuthStateCleanupScheduler } from './schedulers/mercado-pago-oauth-state-cleanup.scheduler'
import { MercadoPagoConnectionOtpCleanupScheduler } from './schedulers/mercado-pago-connection-otp-cleanup.scheduler'
import { OwnerRegistrationCleanupScheduler } from './schedulers/owner-registration-cleanup.scheduler'
import { PasswordResetCleanupScheduler } from './schedulers/password-reset-cleanup.scheduler'
import { PurchaseExpiryScheduler } from './schedulers/purchase-expiry.scheduler'
import { UserRegistrationCleanupScheduler } from './schedulers/user-registration-cleanup.scheduler'

const IN_PROCESS_SCHEDULER_PROVIDERS = [
  PurchaseExpiryScheduler,
  CheckoutDataRetentionScheduler,
  ApiErrorRetentionScheduler,
  UserRegistrationCleanupScheduler,
  OwnerRegistrationCleanupScheduler,
  PasswordResetCleanupScheduler,
  AccountSessionCleanupScheduler,
  InvitationsCleanupScheduler,
  MercadoPagoOAuthStateCleanupScheduler,
  MercadoPagoConnectionOtpCleanupScheduler,
] as const

export function resolveInProcessSchedulerProviders(enabled: boolean) {
  if (!enabled) {
    return []
  }

  return [...IN_PROCESS_SCHEDULER_PROVIDERS]
}
