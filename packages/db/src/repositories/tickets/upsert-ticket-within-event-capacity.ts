import { and, eq, ne, sql } from 'drizzle-orm'
import {
  TICKET_CAPACITY_RESULT,
  type TicketUpsertInput,
  type TicketWithRelations,
} from '@repo/types'
import { db, type Transaction } from '../../client.ts'
import { events } from '../../schema/event.ts'
import { locations } from '../../schema/location.ts'
import { tickets } from '../../schema/ticket.ts'
import { ticketTypes } from '../../schema/ticket-type.ts'

export type TicketWithinEventCapacityResult =
  | { status: typeof TICKET_CAPACITY_RESULT.SAVED; ticket: TicketWithRelations }
  | { status: typeof TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED }

function parseCapacity(capacity: string): bigint {
  if (!/^\d+$/.test(capacity)) {
    throw new Error('Location capacity must be a non-negative integer')
  }

  return BigInt(capacity)
}

function getTicketValues(input: TicketUpsertInput) {
  return {
    price: input.price,
    quantity: input.quantity,
    description: input.description,
    status: input.status,
    ticketTypeId: input.ticketTypeId,
    saleStartsAt: input.saleStartsAt ?? null,
    saleEndsAt: input.saleEndsAt ?? null,
    eventId: input.eventId ?? null,
    updatedAt: new Date(),
  }
}

async function findTicketWithRelations(tx: Transaction, ticketId: number) {
  const [row] = await tx
    .select({
      ticket: tickets,
      ticketType: ticketTypes,
      event: events,
      location: locations,
    })
    .from(tickets)
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .leftJoin(events, eq(events.id, tickets.eventId))
    .leftJoin(locations, eq(locations.id, events.locationId))
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!row) {
    throw new Error('Ticket not found after capacity-checked upsert')
  }

  return row
}

export async function upsertTicketWithinEventCapacity(
  input: TicketUpsertInput,
  existingTicketDocumentId?: string
): Promise<TicketWithinEventCapacityResult> {
  const eventId = input.eventId

  if (eventId === null || eventId === undefined) {
    throw new Error('An event is required for ticket capacity validation')
  }

  return db.transaction(async (tx: Transaction) => {
    const [event] = await tx
      .select({ id: events.id, capacity: locations.capacity })
      .from(events)
      .innerJoin(locations, eq(locations.id, events.locationId))
      .where(eq(events.id, eventId))
      .for('update')

    if (!event) {
      throw new Error('Event not found while validating ticket capacity')
    }

    const [configured] = await tx
      .select({ quantity: sql<string>`coalesce(sum(${tickets.quantity}), 0)::text` })
      .from(tickets)
      .where(
        existingTicketDocumentId
          ? and(eq(tickets.eventId, event.id), ne(tickets.documentId, existingTicketDocumentId))
          : eq(tickets.eventId, event.id)
      )

    if (
      BigInt(configured?.quantity ?? '0') + BigInt(input.quantity) >
      parseCapacity(event.capacity)
    ) {
      return { status: TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED }
    }

    const [ticket] = existingTicketDocumentId
      ? await tx
          .update(tickets)
          .set(getTicketValues(input))
          .where(eq(tickets.documentId, existingTicketDocumentId))
          .returning()
      : await tx.insert(tickets).values(getTicketValues(input)).returning()

    if (!ticket) {
      throw new Error('Ticket upsert returned no row')
    }

    return {
      status: TICKET_CAPACITY_RESULT.SAVED,
      ticket: await findTicketWithRelations(tx, ticket.id),
    }
  })
}
