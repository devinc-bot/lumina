import { CronExpression } from '@nestjs/schedule'
import { beforeEach, expect, test, vi } from 'vitest'

const db = vi.hoisted(() => ({
  deleteExpiredMercadoPagoConnectionOtpBatch: vi.fn(),
}))

vi.mock('@repo/db', () => db)

import { MercadoPagoConnectionOtpCleanupScheduler } from './mercado-pago-connection-otp-cleanup.scheduler.ts'

beforeEach(() => {
  vi.clearAllMocks()
  db.deleteExpiredMercadoPagoConnectionOtpBatch.mockResolvedValue({
    deletedCount: 0,
    hasMore: false,
  })
})

test('schedules Mercado Pago OTP cleanup daily at midnight UTC without overlapping local runs', () => {
  const cleanup = MercadoPagoConnectionOtpCleanupScheduler.prototype.cleanupExpiredOtps

  expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', cleanup)).toEqual({
    cronTime: CronExpression.EVERY_DAY_AT_MIDNIGHT,
    timeZone: 'UTC',
    waitForCompletion: true,
  })
})

test('deletes one bounded batch at the current cutoff so unexpired OTPs are retained', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')
  vi.useFakeTimers()
  vi.setSystemTime(now)

  try {
    await new MercadoPagoConnectionOtpCleanupScheduler().cleanupExpiredOtps()

    expect(db.deleteExpiredMercadoPagoConnectionOtpBatch).toHaveBeenCalledOnce()
    expect(db.deleteExpiredMercadoPagoConnectionOtpBatch).toHaveBeenCalledWith({
      cutoff: now,
      limit: expect.any(Number),
    })
    expect(db.deleteExpiredMercadoPagoConnectionOtpBatch.mock.calls[0]![0].limit).toBeGreaterThan(0)
  } finally {
    vi.useRealTimers()
  }
})
