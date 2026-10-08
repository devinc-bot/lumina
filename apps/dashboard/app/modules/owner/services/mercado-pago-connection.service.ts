import { buildApiPath } from '@repo/common'
import type {
  MercadoPagoConnectionResponse,
  MercadoPagoSettlementTerm,
  OtpChallengeResponse,
  PriceBreakdown,
} from '@repo/types'
import { api, API_ROUTES } from '~/config/api'

export function getMercadoPagoConnection(): Promise<MercadoPagoConnectionResponse> {
  return api.get(buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connection()))
}

export function requestMercadoPagoConnectionOtp(): Promise<OtpChallengeResponse> {
  return api.post(
    buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connectOtp()),
    {}
  )
}

export function verifyMercadoPagoConnectionOtp(input: { otpDocumentId: string; code: string }) {
  return api.post(
    buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connectOtpVerify()),
    input
  ) as Promise<{ authorizationUrl: string }>
}

export function requestMercadoPagoDisconnectionOtp(): Promise<OtpChallengeResponse> {
  return api.post(
    buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.disconnectOtp()),
    {}
  )
}

export function verifyMercadoPagoDisconnectionOtp(input: { otpDocumentId: string; code: string }) {
  return api.post(
    buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.disconnectOtpVerify()),
    input
  ) as Promise<void>
}

export function updateMercadoPagoSettlementTerm(
  settlementTerm: MercadoPagoSettlementTerm
): Promise<void> {
  return api.patch(
    buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connectionSettlement()),
    { settlementTerm }
  )
}

export function getMercadoPagoPriceQuote(unitFacePriceAmount: number): Promise<PriceBreakdown> {
  const params = new URLSearchParams({
    unitFacePriceAmount: String(unitFacePriceAmount),
    quantity: '1',
  })
  return api.get(
    `${buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connectionQuote())}?${params.toString()}`
  )
}
