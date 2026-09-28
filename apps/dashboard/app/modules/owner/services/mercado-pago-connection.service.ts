import { buildApiPath } from '@repo/common'
import type {
  MercadoPagoConnectionResponse,
  MercadoPagoSettlementTerm,
  PriceBreakdown,
} from '@repo/types'
import { api, API_ROUTES } from '~/config/api'

export function getMercadoPagoConnection(): Promise<MercadoPagoConnectionResponse> {
  return api.get(buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connection()))
}

export function startMercadoPagoConnection(): Promise<{ authorizationUrl: string }> {
  return api.post(buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.connect()), {})
}

export function disconnectMercadoPagoConnection(): Promise<void> {
  return api.delete(buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.disconnect()))
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
