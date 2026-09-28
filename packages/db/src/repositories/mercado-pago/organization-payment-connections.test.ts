import { beforeEach, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const updateRows = vi.hoisted(() => vi.fn())
const set = vi.hoisted(() => vi.fn())
const where = vi.hoisted(() => vi.fn())

vi.mock('../../client.ts', () => ({
  db: { update: updateRows },
}))

import { updateMercadoPagoConnectionSettlementTerm } from './organization-payment-connections.ts'

beforeEach(() => {
  vi.clearAllMocks()
  updateRows.mockReturnValue({
    set: set.mockReturnValue({ where: where.mockResolvedValue(undefined) }),
  })
})

test('updates a selected settlement term only on that organization Mercado Pago connection', async () => {
  const now = new Date('2026-09-26T12:00:00.000Z')

  await updateMercadoPagoConnectionSettlementTerm({
    organizationId: 44,
    settlementTerm: '18_days',
    now,
  })

  expect(set).toHaveBeenCalledWith({
    settlementTerm: '18_days',
    updatedAt: now,
  })
  const predicate = where.mock.calls[0]?.[0]
  const query = new PgDialect().sqlToQuery(predicate)
  expect(query.sql).toMatch(/"organization_id"\s*=\s*\$\d+/)
  expect(query.sql).toMatch(/"provider"\s*=\s*\$\d+/)
  expect(query.params).toContain(44)
  expect(query.params).toContain('mercado_pago')
})
