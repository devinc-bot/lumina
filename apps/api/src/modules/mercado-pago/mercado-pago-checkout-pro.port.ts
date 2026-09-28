export type CreateMercadoPagoPreferenceInput = {
  externalReference: string
  title: string
  amount: number
  marketplaceFeeAmount: number
  accessToken: string
  idempotencyKey: string
  notificationUrl: string
  expiresAt: Date
  backUrls: {
    success: string
    pending: string
    failure: string
  }
}

export type MercadoPagoPreferenceResult = {
  id: string
  initPoint: string
}

export type MercadoPagoPaymentResult = {
  id: string
  status: string
  externalReference: string | null
  amount: number
  currency: string
  sellerId?: string | null
  preferenceId?: string | null
  marketplaceFeeAmount?: number | null
  providerFeeAmount?: number | null
  netReceivedAmount?: number | null
}

export interface MercadoPagoCheckoutProPort {
  createPreference(input: CreateMercadoPagoPreferenceInput): Promise<MercadoPagoPreferenceResult>
  expirePreference(preferenceId: string, accessToken?: string): Promise<void>
  getPayment(paymentId: string, accessToken?: string): Promise<MercadoPagoPaymentResult>
}
