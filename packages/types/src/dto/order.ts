import type { PaymentProvider, PaymentStatus } from '../enums/payment.ts'
import type { TicketTypeResponse } from './ticket-type.ts'
import type { PriceBreakdown } from '../marketplace-payment.ts'

/** Buyer-facing order. */
export interface OrderResponse {
  documentId: string
  ticketId: string
  status: PaymentStatus
  amount: number
  quantity: number
  provider: PaymentProvider
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** Response after creating a pending order and Checkout Pro preference. */
export interface CreateOrderResponse extends OrderResponse {
  checkoutUrl: string
  breakdown: PriceBreakdown
}

/** Buyer-facing order summary for paginated order history. */
export interface BuyerOrderSummaryResponse {
  documentId: string
  status: PaymentStatus
  amount: number
  quantity: number
  provider: PaymentProvider
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
  ticketId: string
  ticketType: TicketTypeResponse
  eventId: string | null
  eventName: string | null
  eventStartsAt: Date | null
}
