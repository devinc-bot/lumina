import { beforeEach, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const { deleteRows, insert, select, transaction, update, where } = vi.hoisted(() => ({
  deleteRows: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  where: vi.fn(),
}))

vi.mock('../../client.ts', () => ({
  db: { delete: deleteRows, insert, select, transaction, update },
}))

import {
  consumeLockedMercadoPagoConnectionOtp,
  countMercadoPagoConnectionOtpIssuancesSince,
  deleteExpiredMercadoPagoConnectionOtpBatch,
  deleteExpiredMercadoPagoConnectionOtps,
  invalidateMercadoPagoConnectionOtpForDeliveryFailure,
  issueMercadoPagoConnectionOtp,
  recordMercadoPagoConnectionOtpFailure,
  supersedePendingMercadoPagoConnectionOtps,
} from './connection-otps.ts'
import { otps } from '../../schema/otp.ts'

beforeEach(() => {
  vi.clearAllMocks()
  transaction.mockImplementation(async (callback) =>
    callback({
      insert,
      update,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
            }),
          }),
        }),
      }),
      delete: deleteRows,
    })
  )
  update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: where.mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }),
    }),
  })
  select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 3 }]),
    }),
  })
  deleteRows.mockReturnValue({
    where: where.mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) }),
  })
  insert.mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }),
  })
})

test('issues under one owner lock transaction that counts, supersedes, and inserts the replacement challenge', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')
  const ownerLock = vi.fn().mockResolvedValue(undefined)
  const countWindow = vi.fn().mockResolvedValue([{ count: 2 }])
  transaction.mockImplementation(async (callback) =>
    callback({
      execute: ownerLock,
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: countWindow }) }),
      update,
      insert,
    })
  )

  await expect(
    issueMercadoPagoConnectionOtp({
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      codeHash: 'bcrypt-hash',
      expiresAt: new Date('2026-10-07T00:15:00.000Z'),
      issuanceWindowStartedAt: new Date('2026-10-06T23:45:00.000Z'),
      maximumIssuances: 5,
      now,
    })
  ).resolves.toMatchObject({ kind: 'issued' })

  expect(transaction).toHaveBeenCalledOnce()
  expect(ownerLock).toHaveBeenCalledOnce()
  expect(countWindow).toHaveBeenCalledOnce()
  expect(update).toHaveBeenCalledOnce()
  expect(insert).toHaveBeenCalledOnce()
  expect(ownerLock.mock.invocationCallOrder[0]).toBeLessThan(
    countWindow.mock.invocationCallOrder[0]!
  )
  expect(countWindow.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]!)
  expect(update.mock.invocationCallOrder[0]).toBeLessThan(insert.mock.invocationCallOrder[0]!)
})

test('returns an issuance-limit outcome without superseding or inserting when the owner budget is exhausted', async () => {
  const ownerLock = vi.fn().mockResolvedValue(undefined)
  const countWindow = vi.fn().mockResolvedValue([{ count: 5 }])
  transaction.mockImplementation(async (callback) =>
    callback({
      execute: ownerLock,
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: countWindow }) }),
      update,
      insert,
    })
  )

  await expect(
    issueMercadoPagoConnectionOtp({
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      codeHash: 'bcrypt-hash',
      expiresAt: new Date('2026-10-07T00:15:00.000Z'),
      issuanceWindowStartedAt: new Date('2026-10-06T23:45:00.000Z'),
      maximumIssuances: 5,
      now: new Date('2026-10-07T00:00:00.000Z'),
    })
  ).resolves.toEqual({ kind: 'issuance_limit_reached' })

  expect(update).not.toHaveBeenCalled()
  expect(insert).not.toHaveBeenCalled()
})

test('serializes supersession and invalidates only a still-pending challenge for the same owner and organization', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')

  await expect(
    supersedePendingMercadoPagoConnectionOtps({
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      now,
    })
  ).resolves.toBe(1)

  expect(transaction).toHaveBeenCalledOnce()
  const predicate = where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"subject_document_id"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"scope"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"consumed_at"\s+is\s+null/i)
  expect(query.sql).toMatch(/"invalidated_at"\s+is\s+null/i)
  expect(query.sql).toMatch(/"expires_at"\s*>\s*\$\d+/)
})

test('counts every owner issuance in the persisted rolling window, including terminal challenges', async () => {
  const since = new Date('2026-10-06T23:45:00.000Z')

  await expect(
    countMercadoPagoConnectionOtpIssuancesSince({
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      since,
    })
  ).resolves.toBe(3)

  const predicate =
    select.mock.results[0]?.value.from.mock.results[0]?.value.where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"subject_document_id"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"created_at"\s*>=\s*\$\d+/)
  expect(query.sql).not.toMatch(/"consumed_at"|"invalidated_at"/)
})

test('invalidates only the exact newly issued challenge when mail delivery fails', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')

  await expect(
    invalidateMercadoPagoConnectionOtpForDeliveryFailure({
      documentId: '5d3b5701-b60c-463d-b77a-22a6f86f025f',
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      now,
    })
  ).resolves.toBe(true)

  const predicate = where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"document_id"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"subject_document_id"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"scope"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"consumed_at"\s+is\s+null/i)
  expect(query.sql).toMatch(/"invalidated_at"\s+is\s+null/i)
})

test('deletes every OTP challenge expired at the cleanup cutoff, including terminal challenges', async () => {
  const cutoff = new Date('2026-10-07T00:00:00.000Z')

  await expect(deleteExpiredMercadoPagoConnectionOtps(cutoff)).resolves.toBe(2)

  expect(deleteRows).toHaveBeenCalledWith(otps)
  const predicate = where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"expires_at"\s*<=\s*\$\d+/)
  expect(query.params).toEqual([cutoff.toISOString()])
})

test('offers a bounded cleanup batch result so sparse scheduled runs can continue safely', async () => {
  const cutoff = new Date('2026-10-07T00:00:00.000Z')

  await expect(deleteExpiredMercadoPagoConnectionOtpBatch({ cutoff, limit: 100 })).resolves.toEqual(
    { deletedCount: 2, hasMore: false }
  )
})

test('rejects a challenge exactly at expiry without recording another failed attempt', async () => {
  const ownerLock = vi.fn().mockResolvedValue(undefined)
  const lockRow = vi.fn().mockResolvedValue([])
  transaction.mockImplementation(async (callback) =>
    callback({
      execute: ownerLock,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: lockRow.mockReturnValue({ for: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      update,
    })
  )

  await expect(
    recordMercadoPagoConnectionOtpFailure({
      documentId: '5d3b5701-b60c-463d-b77a-22a6f86f025f',
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      now: new Date('2026-10-07T00:00:00.000Z'),
    })
  ).resolves.toBeNull()

  expect(update).not.toHaveBeenCalled()
})

test('invalidates the challenge on the fourth failed verification', async () => {
  vi.useFakeTimers()
  const now = new Date('2026-10-07T00:00:00.000Z')
  vi.setSystemTime(now)
  const ownerLock = vi.fn().mockResolvedValue(undefined)
  const challenge = { id: 1, failedAttempts: 3 }
  const updated = vi.fn().mockResolvedValue([{ id: 1 }])
  const updateWhere = vi.fn().mockReturnValue({ returning: updated })
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  update.mockReturnValue({ set: updateSet })
  transaction.mockImplementation(async (callback) =>
    callback({
      execute: ownerLock,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue([challenge]) }),
        }),
      }),
      update,
    })
  )

  await expect(
    recordMercadoPagoConnectionOtpFailure({
      documentId: '5d3b5701-b60c-463d-b77a-22a6f86f025f',
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      organizationScope: 'organization:41',
      now,
    })
  ).resolves.toEqual({ failedAttempts: 4, invalidated: true })

  expect(updateSet).toHaveBeenCalledWith({
    failedAttempts: 4,
    invalidatedAt: now,
    updatedAt: now,
  })
  vi.useRealTimers()
})

test('does not consume the OTP when a dependent write fails in the locked transaction', async () => {
  const ownerLock = vi.fn().mockResolvedValue(undefined)
  const challenge = { id: 1, failedAttempts: 0 }
  transaction.mockImplementation(async (callback) =>
    callback({
      execute: ownerLock,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue([challenge]) }),
        }),
      }),
      update,
    })
  )

  await expect(
    consumeLockedMercadoPagoConnectionOtp(
      {
        documentId: '5d3b5701-b60c-463d-b77a-22a6f86f025f',
        ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
        organizationScope: 'organization:41',
        now: new Date('2026-10-07T00:00:00.000Z'),
      },
      async () => {
        throw new Error('OAuth state insert failed')
      }
    )
  ).rejects.toThrow('OAuth state insert failed')

  expect(update).not.toHaveBeenCalled()
})
