import type { BuyerPurchaseSummaryRow } from '@repo/db'
import type { BuyerOrderSummaryResponse, PaymentProvider, PaymentStatus } from '@repo/types'
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_STATUS, PURCHASE_STATUS } from '@repo/types'

export function toLegacyPaymentStatus(
  purchaseStatus: string,
  paymentStatus: string
): PaymentStatus {
  if (purchaseStatus === PURCHASE_STATUS.CONFIRMED) return PAYMENT_STATUS.COMPLETED
  if (paymentStatus === PAYMENT_ATTEMPT_STATUS.REJECTED) return PAYMENT_STATUS.REJECTED
  if (paymentStatus === PAYMENT_ATTEMPT_STATUS.CANCELLED) return PAYMENT_STATUS.CANCELLED
  if (purchaseStatus === PURCHASE_STATUS.PENDING) return PAYMENT_STATUS.PENDING
  return PAYMENT_STATUS.CANCELLED
}

export function toBuyerPurchaseSummaryResponse(
  purchase: BuyerPurchaseSummaryRow
): BuyerOrderSummaryResponse {
  return {
    documentId: purchase.documentId,
    status: toLegacyPaymentStatus(purchase.purchaseStatus, purchase.paymentStatus),
    amount: purchase.amount,
    quantity: purchase.quantity,
    provider: purchase.provider as PaymentProvider,
    paidAt: purchase.paidAt,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
    ticketId: purchase.ticketId,
    ticketType: purchase.ticketType,
    eventId: purchase.eventId,
    eventName: purchase.eventName,
    eventStartsAt: purchase.eventStartsAt,
  }
}
