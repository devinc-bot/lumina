import { and, eq } from 'drizzle-orm'
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

export async function findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId(
  documentId: string,
  userDocumentId: string
): Promise<BuyerPurchaseSummaryRow | null> {
  const [row] = await db
    .select(BUYER_PURCHASE_SUMMARY_SELECTION)
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.userId))
    .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
    .innerJoin(payments, eq(payments.purchaseId, purchases.id))
    .innerJoin(tickets, eq(tickets.id, purchaseItems.ticketId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .leftJoin(events, eq(events.id, tickets.eventId))
    .where(and(eq(purchases.documentId, documentId), eq(users.documentId, userDocumentId)))
    .limit(1)

  return row ?? null
}
