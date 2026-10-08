import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { deleteExpiredMercadoPagoConnectionOtpBatch } from '@repo/db'
import { runCleanupJob } from '../run-cleanup-job'

const OTP_CLEANUP_BATCH_SIZE = 100

@Injectable()
export class MercadoPagoConnectionOtpCleanupScheduler {
  private readonly logger = new Logger(MercadoPagoConnectionOtpCleanupScheduler.name)

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC', waitForCompletion: true })
  async cleanupExpiredOtps(): Promise<void> {
    await runCleanupJob({
      logger: this.logger,
      failureMessage: 'Mercado Pago OTP cleanup failed',
      successMessage: (deleted) => 'Deleted ' + deleted + ' expired Mercado Pago OTP(s)',
      run: async () =>
        (
          await deleteExpiredMercadoPagoConnectionOtpBatch({
            cutoff: new Date(),
            limit: OTP_CLEANUP_BATCH_SIZE,
          })
        ).deletedCount,
    })
  }
}
