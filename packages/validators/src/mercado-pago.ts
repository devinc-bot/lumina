import { z } from 'zod'
import { MERCADO_PAGO_SETTLEMENT_TERM, PAYMENT_CURRENCY } from '@repo/types'
import { uuidSchema } from './common.ts'

export const mercadoPagoOAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32).max(512),
})

export const marketplacePriceQuoteSchema = z.object({
  ticketId: uuidSchema,
  quantity: z.coerce.number().int().positive(),
  currency: z.literal(PAYMENT_CURRENCY.ARS).default(PAYMENT_CURRENCY.ARS),
})

export type MercadoPagoOAuthCallbackInput = z.infer<typeof mercadoPagoOAuthCallbackSchema>
export type MarketplacePriceQuoteInput = z.infer<typeof marketplacePriceQuoteSchema>

export const updateMercadoPagoSettlementTermSchema = z.object({
  settlementTerm: z.enum([
    MERCADO_PAGO_SETTLEMENT_TERM.INSTANT,
    MERCADO_PAGO_SETTLEMENT_TERM.DAYS_10,
    MERCADO_PAGO_SETTLEMENT_TERM.DAYS_18,
    MERCADO_PAGO_SETTLEMENT_TERM.DAYS_35,
  ]),
})

export const ownerMarketplacePriceQuoteSchema = z.object({
  unitFacePriceAmount: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
  currency: z.literal(PAYMENT_CURRENCY.ARS).default(PAYMENT_CURRENCY.ARS),
})

export type UpdateMercadoPagoSettlementTermInput = z.infer<
  typeof updateMercadoPagoSettlementTermSchema
>
export type OwnerMarketplacePriceQuoteInput = z.infer<typeof ownerMarketplacePriceQuoteSchema>
