import { and, count, desc, eq } from 'drizzle-orm'
import type { PaymentAttemptStatus, PaymentProvider, PurchaseStatus } from '@repo/types'
import { db } from '../../client.ts'
import { events } from '../../schema/event.ts'
import { payments } from '../../schema/payment.ts'
import { purchaseItems } from '../../schema/purchase-item.ts'
import { purchases } from '../../schema/purchase.ts'
import { tickets } from '../../schema/ticket.ts'
import { ticketTypes } from '../../schema/ticket-type.ts'
import { users } from '../../schema/user.ts'

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

type ListBuyerPurchasesParams = {
  userDocumentId: string
  page: number
  limit: number
}

export async function findPurchasesPaginatedByUserDocumentId({
  userDocumentId,
  page,
  limit,
}: ListBuyerPurchasesParams): Promise<{ rows: BuyerPurchaseSummaryRow[]; total: number }> {
  const offset = (page - 1) * limit
  const where = and(eq(users.documentId, userDocumentId))

  const [rows, totalRows] = await Promise.all([
    db
      .select({
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
      })
      .from(purchases)
      .innerJoin(users, eq(users.id, purchases.userId))
      .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
      .innerJoin(payments, eq(payments.purchaseId, purchases.id))
      .innerJoin(tickets, eq(tickets.id, purchaseItems.ticketId))
      .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
      .leftJoin(events, eq(events.id, tickets.eventId))
      .where(where)
      .orderBy(desc(purchases.createdAt), desc(purchases.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(purchases)
      .innerJoin(users, eq(users.id, purchases.userId))
      .where(where),
  ])

  return { rows, total: totalRows[0]?.total ?? 0 }
}
