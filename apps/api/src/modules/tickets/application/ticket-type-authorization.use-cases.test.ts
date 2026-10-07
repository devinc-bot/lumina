import { expect, test, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'

vi.mock('@repo/db', () => ({
  findAvailableTicketTypeByDocumentId: async () => null,
  findEventOwnedByOwnerDocumentId: async () => ({
    id: 1,
    organizationId: 1,
    startsAt: new Date('2026-09-01T22:00:00.000Z'),
  }),
  findTicketWithRelationsOwnedByOwner: async () => ({ id: 1 }),
}))

const translationService = { translateError: (code: string) => code } as never
import { CreateTicketUseCase } from './create-ticket.use-case.ts'
import { UpdateTicketUseCase } from './update-ticket.use-case.ts'

const input = {
  ticketTypeId: '8d1d285f-9d21-4b42-b218-495b05b4f223',
  price: 1000,
  quantity: 10,
  description: 'Private access',
  status: 'active' as const,
  eventId: 'event-id',
  saleStartsAt: new Date('2026-09-01T20:00:00.000Z'),
  saleEndsAt: new Date('2026-09-01T22:00:00.000Z'),
}

test('does not create a ticket with another owner ticket type', async () => {
  await expect(
    new CreateTicketUseCase(translationService).execute('owner-id', input)
  ).rejects.toBeInstanceOf(NotFoundException)
})

test('does not update a ticket with another owner ticket type', async () => {
  await expect(
    new UpdateTicketUseCase(translationService).execute('owner-id', 'ticket-id', input)
  ).rejects.toBeInstanceOf(NotFoundException)
})
