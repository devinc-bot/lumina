import { and, eq } from 'drizzle-orm'
import { EVENT_STATUS } from '@repo/types'
import { db } from '../../client.ts'
import { events } from '../../schema/event.ts'
import { tickets, type TicketSelect } from '../../schema/ticket.ts'
import { ticketTypes, type TicketTypeSelect } from '../../schema/ticket-type.ts'

export type PublicTicketWithType = TicketSelect & {
  ticketType: TicketTypeSelect
  organizationId: number
}

export async function findPublicTicketByDocumentId(
  documentId: string
): Promise<PublicTicketWithType | null> {
  const [row] = await db
    .select({ ticket: tickets, ticketType: ticketTypes, organizationId: events.organizationId })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .where(and(eq(tickets.documentId, documentId), eq(events.status, EVENT_STATUS.PUBLISHED)))
    .limit(1)

  return row
    ? { ...row.ticket, ticketType: row.ticketType, organizationId: row.organizationId }
    : null
}
