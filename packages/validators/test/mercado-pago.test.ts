import { expect, test } from 'vitest'
import { updateMercadoPagoSettlementTermSchema } from '../src/mercado-pago.ts'

test('accepts only an owner-selected Mercado Pago settlement term', () => {
  expect(updateMercadoPagoSettlementTermSchema.parse({ settlementTerm: 'instant' })).toEqual({
    settlementTerm: 'instant',
  })
  expect(updateMercadoPagoSettlementTermSchema.parse({ settlementTerm: '35_days' })).toEqual({
    settlementTerm: '35_days',
  })
  expect(
    updateMercadoPagoSettlementTermSchema.safeParse({ settlementTerm: '7_days' }).success
  ).toBe(false)
})
