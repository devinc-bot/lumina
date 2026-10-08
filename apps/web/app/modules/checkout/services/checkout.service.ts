import { buildApiPath } from '@repo/common'
import type { BuyerOrderSummaryResponse, CreateOrderResponse } from '@repo/types'
import type { CreateOrderInput } from '@repo/validators'
import { api, API_ROUTES } from '~/config/api'

export function createPendingOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  return api.post(buildApiPath(API_ROUTES.orders, API_ROUTES.orders.path.create()), input)
}

export function getOrder(orderId: string): Promise<BuyerOrderSummaryResponse> {
  return api.get<BuyerOrderSummaryResponse>(
    buildApiPath(API_ROUTES.orders, API_ROUTES.orders.path.get(orderId))
  )
}
