import { Injectable, Logger } from '@nestjs/common'
import {
  deleteApiErrorRecordsBefore,
  deleteExpiredAndCancelledInvitations,
  deleteExpiredMercadoPagoOAuthStatesBefore,
  deleteExpiredOrRevokedAccountSessionsBefore,
  deleteExpiredOwnerRegistrationTokens,
  deleteExpiredPasswordResetTokens,
  deleteExpiredUserRegistrationTokens,
  findExpiredActiveReservationDocumentIds,
  releaseReservationOnce,
  runCheckoutDataRetention,
} from '@repo/db'
import { INVENTORY_RESERVATION_STATUS, PURCHASE_STATUS } from '@repo/types'
import {
  INTERNAL_JOB_STEP,
  INTERNAL_JOB_STEP_ORDER,
  type InternalJobStepName,
} from './internal-job-steps'
import { CHECKOUT_DATA_RETENTION } from '../checkout-data-retention.constants'
import { runInternalJobPipeline, type InternalJobPipelineResult } from './run-internal-job-pipeline'

const EXPIRY_BATCH_SIZE = 100
const API_ERROR_RETENTION_DAYS = 30
const ACCOUNT_SESSION_RETENTION_DAYS = 7
const MERCADO_PAGO_OAUTH_STATE_RETENTION_DAYS = 1
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const JOB_NAME = 'run'

@Injectable()
export class RunInternalJobsUseCase {
  private readonly logger = new Logger(RunInternalJobsUseCase.name)

  execute(): Promise<InternalJobPipelineResult> {
    const now = new Date()
    const runners: Record<InternalJobStepName, () => Promise<number>> = {
      [INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS]: () => this.expirePurchaseReservations(now),
      [INTERNAL_JOB_STEP.RETAIN_CHECKOUT_DATA]: async () => {
        const result = await runCheckoutDataRetention({
          now,
          mode: CHECKOUT_DATA_RETENTION.mode,
          batchSize: CHECKOUT_DATA_RETENTION.batchSize,
        })
        this.logger.log({
          event: CHECKOUT_DATA_RETENTION.logEvent,
          mode: CHECKOUT_DATA_RETENTION.mode,
          ...result,
        })
        return (
          result.deletedReservations + result.minimizedWebhookPayloads + result.dissociatedPurchases
        )
      },
      [INTERNAL_JOB_STEP.CLEANUP_API_ERROR_RECORDS]: () =>
        deleteApiErrorRecordsBefore(this.getApiErrorRetentionCutoff(now)),
      [INTERNAL_JOB_STEP.CLEANUP_USER_REGISTRATION_TOKENS]: () =>
        deleteExpiredUserRegistrationTokens(),
      [INTERNAL_JOB_STEP.CLEANUP_OWNER_REGISTRATION_TOKENS]: () =>
        deleteExpiredOwnerRegistrationTokens(),
      [INTERNAL_JOB_STEP.CLEANUP_PASSWORD_RESET_TOKENS]: () => deleteExpiredPasswordResetTokens(),
      [INTERNAL_JOB_STEP.CLEANUP_ACCOUNT_SESSIONS]: () =>
        deleteExpiredOrRevokedAccountSessionsBefore(this.getAccountSessionRetentionCutoff(now)),
      [INTERNAL_JOB_STEP.CLEANUP_STAFF_INVITATIONS]: async () => {
        await deleteExpiredAndCancelledInvitations()
        return 0
      },
      [INTERNAL_JOB_STEP.CLEANUP_MERCADO_PAGO_OAUTH_STATES]: () =>
        deleteExpiredMercadoPagoOAuthStatesBefore(
          this.getMercadoPagoOAuthStateRetentionCutoff(now)
        ),
    }

    return runInternalJobPipeline(
      INTERNAL_JOB_STEP_ORDER.map((name) => ({
        name,
        run: runners[name],
      })),
      { logger: this.logger, jobName: JOB_NAME }
    )
  }

  private async expirePurchaseReservations(now: Date): Promise<number> {
    const reservationDocumentIds = await findExpiredActiveReservationDocumentIds(
      now,
      EXPIRY_BATCH_SIZE
    )

    let transitionedCount = 0
    for (const reservationDocumentId of reservationDocumentIds) {
      const result = await releaseReservationOnce({
        reservationDocumentId,
        purchaseStatus: PURCHASE_STATUS.EXPIRED,
        reservationStatus: INVENTORY_RESERVATION_STATUS.EXPIRED,
        now,
      })
      if (result.transitioned) {
        transitionedCount += 1
      }
    }

    return transitionedCount
  }

  private getApiErrorRetentionCutoff(now: Date): Date {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - API_ERROR_RETENTION_DAYS)
    return cutoff
  }

  private getAccountSessionRetentionCutoff(now: Date): Date {
    return new Date(now.getTime() - ACCOUNT_SESSION_RETENTION_DAYS * DAY_IN_MILLISECONDS)
  }

  private getMercadoPagoOAuthStateRetentionCutoff(now: Date): Date {
    return new Date(now.getTime() - MERCADO_PAGO_OAUTH_STATE_RETENTION_DAYS * DAY_IN_MILLISECONDS)
  }
}
