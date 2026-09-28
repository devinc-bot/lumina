import { expect, test, vi } from 'vitest'
import { MercadoPagoOAuthStateCleanupScheduler } from './mercado-pago-oauth-state-cleanup.scheduler.ts'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

class TestMercadoPagoOAuthStateCleanupScheduler extends MercadoPagoOAuthStateCleanupScheduler {
  receivedCutoff: Date | undefined

  getCutoff(now: Date): Date {
    return this.getRetentionCutoff(now)
  }

  protected override async deleteExpiredOAuthStatesBefore(cutoff: Date): Promise<number> {
    this.receivedCutoff = cutoff
    return 0
  }
}

test('retains expired OAuth states for 24 hours before cleanup', () => {
  const scheduler = new TestMercadoPagoOAuthStateCleanupScheduler()
  const now = new Date('2026-09-26T12:00:00.000Z')

  expect(scheduler.getCutoff(now)).toEqual(new Date(now.getTime() - DAY_IN_MILLISECONDS))
})

test('runs the retained-cutoff cleanup so nonexpired OAuth states are never selected', async () => {
  const scheduler = new TestMercadoPagoOAuthStateCleanupScheduler()
  const now = new Date('2026-09-26T12:00:00.000Z')
  vi.useFakeTimers()
  vi.setSystemTime(now)

  try {
    await scheduler.cleanupExpiredOAuthStates()

    expect(scheduler.receivedCutoff).toEqual(new Date(now.getTime() - DAY_IN_MILLISECONDS))
  } finally {
    vi.useRealTimers()
  }
})
