import { beforeEach, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const { deleteRows, insert, where } = vi.hoisted(() => ({
  deleteRows: vi.fn(),
  insert: vi.fn(),
  where: vi.fn(),
}))

vi.mock('../../client.ts', () => ({
  db: { delete: deleteRows, insert },
}))

import {
  createMercadoPagoOAuthState,
  deleteExpiredMercadoPagoOAuthStatesBefore,
} from './oauth-states.ts'

beforeEach(() => {
  vi.clearAllMocks()
  deleteRows.mockReturnValue({
    where: where.mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) }),
  })
  insert.mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }),
  })
})

test('persists OTP-verification provenance with every OAuth state created after challenge success', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')

  await createMercadoPagoOAuthState({
    organizationId: 41,
    ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
    stateHash: 'state-hash',
    codeVerifierEncrypted: 'encrypted-verifier',
    expiresAt: new Date('2026-10-07T00:10:00.000Z'),
    otpVerifiedAt: now,
    now,
  })

  expect(insert).toHaveBeenCalledOnce()
  expect(insert.mock.results[0]?.value.values).toHaveBeenCalledWith(
    expect.objectContaining({ otpVerifiedAt: now })
  )
})

test('uses the injected transaction for state creation so OTP consumption and state insertion can commit together', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z')
  const txInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }),
  })

  await createMercadoPagoOAuthState(
    {
      organizationId: 41,
      ownerDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      stateHash: 'state-hash',
      codeVerifierEncrypted: 'encrypted-verifier',
      expiresAt: new Date('2026-10-07T00:10:00.000Z'),
      otpVerifiedAt: now,
      now,
    },
    { insert: txInsert } as never
  )

  expect(txInsert).toHaveBeenCalledOnce()
  expect(insert).not.toHaveBeenCalled()
})

test('deletes only OAuth states whose expiration is at or before the retained cutoff', async () => {
  const cutoff = new Date('2026-09-25T00:00:00.000Z')

  await expect(deleteExpiredMercadoPagoOAuthStatesBefore(cutoff)).resolves.toBe(2)

  expect(deleteRows).toHaveBeenCalledOnce()
  const predicate = where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"expires_at"\s*<=\s*\$\d+/)
  expect(query.params).toEqual([cutoff.toISOString()])
})
