import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { runCheckoutDataRetention } from '@repo/db'
import { CHECKOUT_DATA_RETENTION } from '../checkout-data-retention.constants'
import { runCleanupJob } from '../run-cleanup-job'

@Injectable()
export class CheckoutDataRetentionScheduler {
  private readonly logger = new Logger(CheckoutDataRetentionScheduler.name)

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async retainCheckoutData(): Promise<void> {
    await runCleanupJob({
      logger: this.logger,
      failureMessage: 'Checkout data retention dry run failed',
      successMessage: (affected) =>
        `Checkout data retention dry run found ${affected} candidate(s)`,
      run: async () => {
        const result = await runCheckoutDataRetention({
          now: new Date(),
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
    })
  }
}
