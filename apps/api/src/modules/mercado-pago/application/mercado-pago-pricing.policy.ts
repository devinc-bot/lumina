import {
  BASIS_POINTS_SCALE,
  LUMINA_PLATFORM_FEE_BPS,
  MARKETPLACE_PRICING_POLICY_VERSION,
  MERCADO_PAGO_IVA_BPS,
  type PaymentCurrency,
  type PriceBreakdown,
} from '@repo/types'

export type CalculateMarketplacePriceBreakdownInput = {
  unitFacePriceAmount: number
  quantity: number
  estimatedProviderFeeBps: number
  currency: PaymentCurrency
}

function ceilDivide(dividend: number, divisor: number): number {
  if (!Number.isSafeInteger(dividend) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new RangeError('Marketplace pricing requires safe positive integer minor units')
  }
  return Math.floor((dividend + divisor - 1) / divisor)
}

function ceilDivideBigInt(dividend: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) throw new RangeError('Marketplace pricing requires a positive divisor')
  return (dividend + divisor - 1n) / divisor
}

function toSafeNumber(value: bigint): number {
  const numberValue = Number(value)
  if (!Number.isSafeInteger(numberValue)) {
    throw new RangeError('Marketplace total exceeds safe range')
  }
  return numberValue
}

/** Calculates buyer-visible totals in minor units, rounding only on the subtotal. */
export function calculateMarketplacePriceBreakdown(
  input: CalculateMarketplacePriceBreakdownInput
): PriceBreakdown {
  if (
    !Number.isSafeInteger(input.unitFacePriceAmount) ||
    !Number.isSafeInteger(input.quantity) ||
    !Number.isSafeInteger(input.estimatedProviderFeeBps) ||
    input.unitFacePriceAmount < 0 ||
    input.quantity < 1 ||
    input.estimatedProviderFeeBps < 0 ||
    input.estimatedProviderFeeBps >= BASIS_POINTS_SCALE
  ) {
    throw new RangeError('Invalid marketplace price quote input')
  }

  // Example: 100_000(1000,00 * 100) minor units ($1,000.00) × 1 ticket = 100_000.
  const subtotalAmount = input.unitFacePriceAmount * input.quantity
  if (!Number.isSafeInteger(subtotalAmount))
    throw new RangeError('Marketplace subtotal exceeds safe range')

  // Example: ceil(100_000 × 300 bps / 10_000 bps) = 3_000 ($30.00 for Lumina).
  const platformFeeAmount = ceilDivide(subtotalAmount * LUMINA_PLATFORM_FEE_BPS, BASIS_POINTS_SCALE)

  // Basis points express percentages as integers: 10_000 bps = 100%, 339 bps = 3.39%.
  // This keeps the fee calculation exact in minor units instead of using floating-point percentages.
  // Example: 10_000 becomes 10_000n so it can be used in exact BigInt arithmetic.
  const basisPointsScale = BigInt(BASIS_POINTS_SCALE)

  // Example: 339 bps becomes 339n (the selected Mercado Pago settlement fee before IVA).
  const providerFeeBps = BigInt(input.estimatedProviderFeeBps)

  // We add 10_000 + 2_100 to express 121% in basis points (100% fee + 21% IVA).
  // We must not add 2_100 directly to 339: that would turn a 3.39% fee into 24.39%.
  // The multiplication on this line applies the 121% factor to the 339 bps fee instead.
  // Example: 339 × (10_000 + 2_100 IVA bps) = 4_101_900.
  const providerFeeWithTaxBps = providerFeeBps * (basisPointsScale + BigInt(MERCADO_PAGO_IVA_BPS))

  // BigInt preserves exact integer arithmetic while multiplying the basis-point scales below.
  // A JavaScript number could lose precision for large monetary amounts before we round up.
  // Gross up the buyer total so Mercado Pago's fee (including IVA) plus Lumina's fee
  // leave the owner with the face-price subtotal. For example, with a $1,000.00 ticket
  // (100_000 minor units), a 3% Lumina fee (3_000), and a 3.39% MP fee plus 21% IVA:
  // numerator = 103_000 × 10_000 × 10_000 = 10_300_000_000_000.
  // denominator = 10_000 × 10_000 - 4_101_900 = 95_898_100.
  // ceil(numerator / denominator) = 107_406 ($1,074.06 paid by the buyer).
  const totalAmount = toSafeNumber(
    ceilDivideBigInt(
      // Example numerator: 103_000n × 10_000n × 10_000n.
      BigInt(subtotalAmount + platformFeeAmount) * basisPointsScale * basisPointsScale,
      // Example denominator: 10_000n × 10_000n - 4_101_900n.
      basisPointsScale * basisPointsScale - providerFeeWithTaxBps
    )
  )

  // Example: 107_406 - 100_000 - 3_000 = 4_406 Mercado Pago fee, IVA included.
  const providerFeeQuotedAmount = totalAmount - subtotalAmount - platformFeeAmount

  // The IVA is already part of providerFeeQuotedAmount; this is only a disclosure split.
  // Example: ceil(4_406 × 2_100 bps / (10_000 + 2_100 bps)) = 765 of IVA.
  const providerFeeTaxAmount = ceilDivide(
    providerFeeQuotedAmount * MERCADO_PAGO_IVA_BPS,
    BASIS_POINTS_SCALE + MERCADO_PAGO_IVA_BPS
  )

  return {
    subtotalAmount,
    platformFeeAmount,
    providerFeeQuotedAmount,
    providerFeeTaxAmount,
    totalAmount,
    expectedOwnerProceedsAmount: subtotalAmount,
    currency: input.currency,
    platformFeeBps: LUMINA_PLATFORM_FEE_BPS,
    providerFeeQuotedBps: input.estimatedProviderFeeBps,
    pricingPolicyVersion: MARKETPLACE_PRICING_POLICY_VERSION,
    isProviderFeeEstimated: true,
  }
}
