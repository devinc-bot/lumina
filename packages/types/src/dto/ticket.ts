import type { CheckInOperatorRole } from '../enums/user.ts'
import type { TicketCheckInOutcome, TicketStatus } from '../enums/ticket.ts'
import type { PaginatedResponse } from './common.ts'
import type { TicketTypeResponse } from './ticket-type.ts'

export interface TicketResponse {
  documentId: string
  price: number
  quantity: number
  status: TicketStatus
  description: string
  ticketType: TicketTypeResponse
  saleStartsAt: Date | null
  saleEndsAt: Date | null
  eventId: string | null
  eventName: string | null
  eventImageUrl: string | null
  locationId: string | null
  locationName: string | null
  /** Completed unit sales issued from confirmed purchases. */
  totalSold: number
  /** Sum of completed order amounts for this ticket. */
  revenue: number
  createdAt: Date
  updatedAt: Date
}

/** On-sale ticket offer on anonymous public event detail. */
export interface PublicPurchasableTicketResponse {
  documentId: string
  price: number
  ticketType: TicketTypeResponse
  /** Units still available for purchase. */
  remainingQuantity: number
  saleStartsAt: Date | null
  saleEndsAt: Date | null
}

export interface PurchasedTicketResponse {
  documentId: string
  checkedIn: boolean
  usedAt: Date | null
  ticketType: TicketTypeResponse
  eventSlug: string
  eventName: string
  eventStartsAt: Date
  locationName: string
  eventImageUrl: string | null
}

export interface PurchasedTicketQrResponse {
  token: string
  expiresAt: Date
  ticket: PurchasedTicketResponse
}

export interface TicketCheckInResponse {
  outcome: TicketCheckInOutcome
  checkedInAt: Date
  ticket: {
    documentId: string
    ticketType: TicketTypeResponse
  }
  event: {
    documentId: string
    name: string
    startsAt: Date
  }
  location: {
    documentId: string
    name: string
  }
  purchaser: {
    documentId: string
    fullName: string
    email: string
    phone: string | null
  }
}

/** Operator that consumed a scanned ticket; null for pre-operator-tracking scans. */
export interface ScannedTicketHistoryOperator {
  fullName: string | null
  email: string | null
  role: CheckInOperatorRole | null
}

export interface ScannedTicketHistoryItem {
  purchaser: {
    fullName: string
    email: string
    phone: string | null
  }
  operator: ScannedTicketHistoryOperator | null
  ticket: {
    ticketType: TicketTypeResponse
  }
  scannedAt: Date
}

export type ScannedTicketHistoryResponse = PaginatedResponse<ScannedTicketHistoryItem>
