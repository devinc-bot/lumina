import type { PaymentCurrency } from './enums/purchase.ts'

export const ORGANIZATION_PAYMENT_CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  REFRESH_FAILED: 'refresh_failed',
  RECONNECT_REQUIRED: 'reconnect_required',
  DISCONNECT_PENDING: 'disconnect_pending',
} as const

export type OrganizationPaymentConnectionStatus =
  (typeof ORGANIZATION_PAYMENT_CONNECTION_STATUS)[keyof typeof ORGANIZATION_PAYMENT_CONNECTION_STATUS]

export const PAYMENT_CREDENTIAL_SOURCE = {
  ORGANIZATION_CONNECTION: 'organization_connection',
} as const

export type PaymentCredentialSource =
  (typeof PAYMENT_CREDENTIAL_SOURCE)[keyof typeof PAYMENT_CREDENTIAL_SOURCE]

export const MERCADO_PAGO_SETTLEMENT_TERM = {
  INSTANT: 'instant',
  DAYS_10: '10_days',
  DAYS_18: '18_days',
  DAYS_35: '35_days',
} as const

export type MercadoPagoSettlementTerm =
  (typeof MERCADO_PAGO_SETTLEMENT_TERM)[keyof typeof MERCADO_PAGO_SETTLEMENT_TERM]

export const MERCADO_PAGO_SETTLEMENT_FEE_BPS: Record<MercadoPagoSettlementTerm, number> = {
  [MERCADO_PAGO_SETTLEMENT_TERM.INSTANT]: 629,
  [MERCADO_PAGO_SETTLEMENT_TERM.DAYS_10]: 439,
  [MERCADO_PAGO_SETTLEMENT_TERM.DAYS_18]: 339,
  [MERCADO_PAGO_SETTLEMENT_TERM.DAYS_35]: 149,
}

export const DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM = MERCADO_PAGO_SETTLEMENT_TERM.DAYS_18
export const MERCADO_PAGO_IVA_BPS = 2_100 as const

export const MARKETPLACE_PRICING_POLICY_VERSION = 'mercado_pago_marketplace_v1' as const
// 3% platform fee, 0.3 * 10000 = 300 basis points
export const LUMINA_PLATFORM_FEE_BPS = 300 as const
export const BASIS_POINTS_SCALE = 10_000 as const

export interface PriceBreakdown {
  subtotalAmount: number
  platformFeeAmount: number
  providerFeeQuotedAmount: number
  providerFeeTaxAmount: number
  totalAmount: number
  expectedOwnerProceedsAmount: number
  currency: PaymentCurrency
  platformFeeBps: number
  providerFeeQuotedBps: number
  pricingPolicyVersion: typeof MARKETPLACE_PRICING_POLICY_VERSION
  isProviderFeeEstimated: boolean
}

export interface MercadoPagoConnectionResponse {
  status: OrganizationPaymentConnectionStatus
  sellerId: string | null
  settlementTerm: MercadoPagoSettlementTerm
  connectedAt: Date | null
  refreshedAt: Date | null
  reconnectRequiredAt: Date | null
}
