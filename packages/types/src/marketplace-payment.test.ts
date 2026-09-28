import { expect, test } from 'vitest'
import * as marketplacePayment from './marketplace-payment.ts'

test('exposes only the current marketplace pricing policy version', () => {
  expect(marketplacePayment.MARKETPLACE_PRICING_POLICY_VERSION).toBe('mercado_pago_marketplace_v1')
  expect(marketplacePayment).not.toHaveProperty('LEGACY_PRICING_POLICY_VERSION')
})

test('exposes no legacy platform credential source for new marketplace payment attempts', () => {
  expect(marketplacePayment.PAYMENT_CREDENTIAL_SOURCE).toEqual({
    ORGANIZATION_CONNECTION: 'organization_connection',
  })
  expect(marketplacePayment.PAYMENT_CREDENTIAL_SOURCE).not.toHaveProperty('LEGACY_PLATFORM')
})

test('defines the only owner-selectable Mercado Pago settlement terms and their quoted rates', () => {
  expect(marketplacePayment.MERCADO_PAGO_SETTLEMENT_TERM).toEqual({
    INSTANT: 'instant',
    DAYS_10: '10_days',
    DAYS_18: '18_days',
    DAYS_35: '35_days',
  })
  expect(marketplacePayment.MERCADO_PAGO_SETTLEMENT_FEE_BPS).toEqual({
    instant: 629,
    '10_days': 439,
    '18_days': 339,
    '35_days': 149,
  })
})

test('publishes the fixed Argentina IVA estimate used only within the Mercado Pago quote', () => {
  expect(marketplacePayment.MERCADO_PAGO_IVA_BPS).toBe(2_100)
})
