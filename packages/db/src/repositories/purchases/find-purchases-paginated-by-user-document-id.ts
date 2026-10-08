import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../../client.ts'
import { events } from '../../schema/event.ts'
import { payments } from '../../schema/payment.ts'
import { purchaseItems } from '../../schema/purchase-item.ts'
import { purchases } from '../../schema/purchase.ts'
import { tickets } from '../../schema/ticket.ts'
import { ticketTypes } from '../../schema/ticket-type.ts'
import { users } from '../../schema/user.ts'
import {
  BUYER_PURCHASE_SUMMARY_SELECTION,
  type BuyerPurchaseSummaryRow,
} from './buyer-purchase-summary.ts'

export type { BuyerPurchaseSummaryRow } from './buyer-purchase-summary.ts'

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
      .select(BUYER_PURCHASE_SUMMARY_SELECTION)
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
