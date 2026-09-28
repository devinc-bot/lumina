import { beforeEach, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const deleteRows = vi.hoisted(() => vi.fn())
const where = vi.hoisted(() => vi.fn())

vi.mock('../../client.ts', () => ({
  db: { delete: deleteRows },
}))

import { deleteExpiredMercadoPagoOAuthStatesBefore } from './oauth-states.ts'

beforeEach(() => {
  vi.clearAllMocks()
  deleteRows.mockReturnValue({
    where: where.mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) }),
  })
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
