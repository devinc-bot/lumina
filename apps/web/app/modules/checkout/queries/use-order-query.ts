import { useQuery } from '@tanstack/react-query'
import { PAYMENT_STATUS } from '@repo/types'
import { uuidSchema } from '@repo/validators'
import { getOrder } from '../services/checkout.service'

const PENDING_ORDER_REFETCH_INTERVAL_MS = 2_000
const MAXIMUM_ORDER_QUERY_ATTEMPTS = 5

function getPendingOrderRefetchInterval(query: {
  state: {
    data?: { status: string }
    dataUpdateCount: number
    errorUpdateCount: number
  }
}): number | false {
  const hasReachedMaximumAttempts =
    query.state.dataUpdateCount + query.state.errorUpdateCount >= MAXIMUM_ORDER_QUERY_ATTEMPTS

  if (query.state.data?.status !== PAYMENT_STATUS.PENDING || hasReachedMaximumAttempts) {
    return false
  }

  return PENDING_ORDER_REFETCH_INTERVAL_MS
}

export function useOrderQuery(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: uuidSchema.safeParse(orderId).success,
    retry: false,
    refetchInterval: getPendingOrderRefetchInterval,
  })
}
