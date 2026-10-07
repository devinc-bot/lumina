import { PAYMENT_STATUS, type PaymentStatus } from '@repo/types'

export function canCancelOrder(status: PaymentStatus) {
  return status === PAYMENT_STATUS.PENDING
}

export function getOrderStatusBadgeVariant(status: PaymentStatus) {
  switch (status) {
    case PAYMENT_STATUS.COMPLETED:
      return 'default' as const
    case PAYMENT_STATUS.PENDING:
      return 'secondary' as const
    case PAYMENT_STATUS.REJECTED:
      return 'destructive' as const
    case PAYMENT_STATUS.CANCELLED:
      return 'outline' as const
  }
}
