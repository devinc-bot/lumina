import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { deleteExpiredMercadoPagoOAuthStatesBefore } from '@repo/db'
import { runCleanupJob } from '../run-cleanup-job'

// Retention period for OAuth states is 24 hours.
// This is a reasonable balance between security and usability, as it allows users to complete the OAuth flow within a day while ensuring that stale states are cleaned up promptly.
const OAUTH_STATE_RETENTION_MILLISECONDS = 24 * 60 * 60 * 1000

@Injectable()
export class MercadoPagoOAuthStateCleanupScheduler {
  private readonly logger = new Logger(MercadoPagoOAuthStateCleanupScheduler.name)

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredOAuthStates(): Promise<void> {
    await runCleanupJob({
      logger: this.logger,
      failureMessage: 'Mercado Pago OAuth state cleanup failed',
      successMessage: (deleted) => `Deleted ${deleted} expired Mercado Pago OAuth state(s)`,
      run: () => this.deleteExpiredOAuthStatesBefore(this.getRetentionCutoff(new Date())),
    })
  }

  protected getRetentionCutoff(now: Date): Date {
    return new Date(now.getTime() - OAUTH_STATE_RETENTION_MILLISECONDS)
  }

  protected deleteExpiredOAuthStatesBefore(cutoff: Date): Promise<number> {
    return deleteExpiredMercadoPagoOAuthStatesBefore(cutoff)
  }
}
