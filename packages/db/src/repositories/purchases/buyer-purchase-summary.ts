import type { PaymentAttemptStatus, PaymentProvider, PurchaseStatus } from '@repo/types'
import { events } from '../../schema/event.ts'
import { payments } from '../../schema/payment.ts'
import { purchaseItems } from '../../schema/purchase-item.ts'
import { purchases } from '../../schema/purchase.ts'
import { tickets } from '../../schema/ticket.ts'
import { ticketTypes } from '../../schema/ticket-type.ts'

export type BuyerPurchaseSummaryRow = {
  documentId: string
  purchaseStatus: PurchaseStatus
  paymentStatus: PaymentAttemptStatus
  amount: number
  quantity: number
  provider: PaymentProvider
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  ticketId: string
  ticketType: { documentId: string; name: string }
  eventId: string | null
  eventName: string | null
  eventStartsAt: Date | null
}

export const BUYER_PURCHASE_SUMMARY_SELECTION = {
  documentId: purchases.documentId,
  purchaseStatus: purchases.status,
  paymentStatus: payments.status,
  amount: purchases.totalAmount,
  quantity: purchaseItems.quantity,
  provider: payments.provider,
  paidAt: payments.paidAt,
  createdAt: purchases.createdAt,
  updatedAt: purchases.updatedAt,
  ticketId: tickets.documentId,
  ticketType: { documentId: ticketTypes.documentId, name: ticketTypes.name },
  eventId: events.documentId,
  eventName: events.name,
  eventStartsAt: events.startsAt,
}
