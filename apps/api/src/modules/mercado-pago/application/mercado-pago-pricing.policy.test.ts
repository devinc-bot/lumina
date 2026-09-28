import { expect, test } from 'vitest'
import {
  LUMINA_PLATFORM_FEE_BPS,
  MARKETPLACE_PRICING_POLICY_VERSION,
  MERCADO_PAGO_IVA_BPS,
  PAYMENT_CURRENCY,
} from '@repo/types'
import { calculateMarketplacePriceBreakdown } from './mercado-pago-pricing.policy.ts'

const ESTIMATED_MERCADO_PAGO_FEE_BPS = 500

test('grosses up the Mercado Pago commission plus IVA in integer minor units without charging IVA twice', () => {
  const breakdown = calculateMarketplacePriceBreakdown({
    unitFacePriceAmount: 10_000,
    quantity: 1,
    estimatedProviderFeeBps: ESTIMATED_MERCADO_PAGO_FEE_BPS,
    currency: PAYMENT_CURRENCY.ARS,
  })

  expect(breakdown).toEqual({
    subtotalAmount: 10_000,
    platformFeeAmount: 300,
    providerFeeQuotedAmount: 664,
    providerFeeTaxAmount: 116,
    totalAmount: 10_964,
    expectedOwnerProceedsAmount: 10_000,
    currency: PAYMENT_CURRENCY.ARS,
    platformFeeBps: LUMINA_PLATFORM_FEE_BPS,
    providerFeeQuotedBps: ESTIMATED_MERCADO_PAGO_FEE_BPS,
    pricingPolicyVersion: MARKETPLACE_PRICING_POLICY_VERSION,
    isProviderFeeEstimated: true,
  })
  expect(breakdown.providerFeeTaxAmount).toBeLessThanOrEqual(breakdown.providerFeeQuotedAmount)
  expect(breakdown.totalAmount).toBe(
    breakdown.subtotalAmount + breakdown.platformFeeAmount + breakdown.providerFeeQuotedAmount
  )
  expect(breakdown.providerFeeQuotedAmount - breakdown.providerFeeTaxAmount).toBe(548)
  expect(MERCADO_PAGO_IVA_BPS).toBe(2_100)
})

test('grosses up a 339 bps Mercado Pago commission and IVA so fee deductions never reduce the face subtotal', () => {
  const breakdown = calculateMarketplacePriceBreakdown({
    unitFacePriceAmount: 100_000,
    quantity: 1,
    estimatedProviderFeeBps: 339,
    currency: PAYMENT_CURRENCY.ARS,
  })

  expect(breakdown).toMatchObject({
    subtotalAmount: 100_000,
    platformFeeAmount: 3_000,
    providerFeeQuotedAmount: 4_406,
    providerFeeTaxAmount: 765,
    totalAmount: 107_406,
    expectedOwnerProceedsAmount: 100_000,
    providerFeeQuotedBps: 339,
  })
  expect(
    breakdown.totalAmount - breakdown.providerFeeQuotedAmount - breakdown.platformFeeAmount
  ).toBe(100_000)
  expect(breakdown.providerFeeQuotedAmount - breakdown.providerFeeTaxAmount).toBe(3_641)
})

test.each([
  {
    name: 'a zero-price ticket',
    unitFacePriceAmount: 0,
    quantity: 1,
    expected: {
      subtotalAmount: 0,
      platformFeeAmount: 0,
      providerFeeQuotedAmount: 0,
      providerFeeTaxAmount: 0,
      totalAmount: 0,
      expectedOwnerProceedsAmount: 0,
    },
  },
  {
    name: 'a one-cent ticket',
    unitFacePriceAmount: 1,
    quantity: 1,
    expected: {
      subtotalAmount: 1,
      platformFeeAmount: 1,
      providerFeeQuotedAmount: 1,
      providerFeeTaxAmount: 1,
      totalAmount: 3,
      expectedOwnerProceedsAmount: 1,
    },
  },
  {
    name: 'a fractional-cent platform fee',
    unitFacePriceAmount: 33,
    quantity: 1,
    expected: {
      subtotalAmount: 33,
      platformFeeAmount: 1,
      providerFeeQuotedAmount: 3,
      providerFeeTaxAmount: 1,
      totalAmount: 37,
      expectedOwnerProceedsAmount: 33,
    },
  },
  {
    name: 'multiple tickets before applying the percentage',
    unitFacePriceAmount: 1,
    quantity: 2,
    expected: {
      subtotalAmount: 2,
      platformFeeAmount: 1,
      providerFeeQuotedAmount: 1,
      providerFeeTaxAmount: 1,
      totalAmount: 4,
      expectedOwnerProceedsAmount: 2,
    },
  },
  {
    name: 'a multi-ticket subtotal with both ceiling operations',
    unitFacePriceAmount: 333,
    quantity: 3,
    expected: {
      subtotalAmount: 999,
      platformFeeAmount: 30,
      providerFeeQuotedAmount: 67,
      providerFeeTaxAmount: 12,
      totalAmount: 1_096,
      expectedOwnerProceedsAmount: 999,
    },
  },
])(
  'quotes $name with ceiling rounding on the subtotal',
  ({ unitFacePriceAmount, quantity, expected }) => {
    const breakdown = calculateMarketplacePriceBreakdown({
      unitFacePriceAmount,
      quantity,
      estimatedProviderFeeBps: ESTIMATED_MERCADO_PAGO_FEE_BPS,
      currency: PAYMENT_CURRENCY.ARS,
    })

    expect(breakdown).toMatchObject(expected)
    expect(breakdown.totalAmount).toBe(
      breakdown.subtotalAmount + breakdown.platformFeeAmount + breakdown.providerFeeQuotedAmount
    )
    expect(breakdown.providerFeeTaxAmount).toBeLessThanOrEqual(breakdown.providerFeeQuotedAmount)
    expect(breakdown.platformFeeBps).toBe(LUMINA_PLATFORM_FEE_BPS)
    expect(breakdown.pricingPolicyVersion).toBe(MARKETPLACE_PRICING_POLICY_VERSION)
    expect(breakdown.isProviderFeeEstimated).toBe(true)
  }
)
