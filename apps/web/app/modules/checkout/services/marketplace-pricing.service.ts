import { buildApiPath } from '@repo/common'
import type { PriceBreakdown } from '@repo/types'
import { api, API_ROUTES } from '~/config/api'

export function getMarketplacePriceQuote(ticketId: string, quantity = 1): Promise<PriceBreakdown> {
  const params = new URLSearchParams({ ticketId, quantity: String(quantity) })
  return api.get(
    `${buildApiPath(API_ROUTES.mercadoPago, API_ROUTES.mercadoPago.path.quote())}?${params.toString()}`
  )
}
