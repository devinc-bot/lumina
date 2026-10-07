import { beforeEach, expect, test, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { TICKET_CAPACITY_RESULT, TICKET_STATUS } from '@repo/types'

const state = vi.hoisted(() => ({
  upsertWithinCapacity: vi.fn(),
  findEvent: vi.fn(),
  findTicketType: vi.fn(),
  findExistingTicket: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  upsertTicketWithinEventCapacity: state.upsertWithinCapacity,
  findEventOwnedByOwnerDocumentId: state.findEvent,
  findAvailableTicketTypeByDocumentId: state.findTicketType,
  findTicketWithRelationsOwnedByOwner: state.findExistingTicket,
}))

import { CreateTicketUseCase } from './create-ticket.use-case.ts'
import { UpdateTicketUseCase } from './update-ticket.use-case.ts'

const translateError = vi.fn((code: string) => code)
const translationService = { translateError } as never
const eventStartsAt = new Date('2026-09-01T22:00:00.000Z')
const input = {
  ticketTypeId: '8d1d285f-9d21-4b42-b218-495b05b4f223',
  price: 1000,
  quantity: 10,
  description: 'Private access',
  status: TICKET_STATUS.INACTIVE,
  eventId: 'event-a',
  saleStartsAt: new Date('2026-09-01T20:00:00.000Z'),
  saleEndsAt: new Date('2026-09-01T22:00:00.000Z'),
}

const savedResult = {
  status: TICKET_CAPACITY_RESULT.SAVED,
  ticket: {
    ticket: {
      documentId: 'ticket-saved',
      price: input.price,
      quantity: input.quantity,
      status: input.status,
      description: input.description,
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    ticketType: { documentId: input.ticketTypeId, name: 'General' },
    event: { documentId: input.eventId, name: 'Event A' },
    location: { documentId: 'location-a', name: 'Location A' },
  },
} as const

beforeEach(() => {
  vi.clearAllMocks()
  state.findEvent.mockResolvedValue({
    id: 11,
    documentId: input.eventId,
    organizationId: 1,
    startsAt: eventStartsAt,
  })
  state.findTicketType.mockResolvedValue({ id: 7 })
  state.findExistingTicket.mockResolvedValue({})
  state.upsertWithinCapacity.mockResolvedValue(savedResult)
})

test.each([
  [
    'create',
    async (value: typeof input) =>
      new CreateTicketUseCase(translationService).execute('owner-id', value),
  ],
  [
    'update',
    async (value: typeof input) =>
      new UpdateTicketUseCase(translationService).execute('owner-id', 'ticket-id', value),
  ],
])(
  'rejects %s when sale end is later than the selected event start',
  async (_operation, execute) => {
    await expect(
      execute({ ...input, saleEndsAt: new Date('2026-09-01T22:00:00.001Z') })
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(translateError).toHaveBeenCalledWith('ticket.SALE_END_AFTER_EVENT_START')
    expect(state.upsertWithinCapacity).not.toHaveBeenCalled()
  }
)

test.each([
  [
    'create',
    async (value: typeof input) =>
      new CreateTicketUseCase(translationService).execute('owner-id', value),
  ],
  [
    'update',
    async (value: typeof input) =>
      new UpdateTicketUseCase(translationService).execute('owner-id', 'ticket-id', value),
  ],
])('allows %s when sale end equals the selected event start', async (_operation, execute) => {
  await expect(execute(input)).resolves.toMatchObject({ documentId: 'ticket-saved' })
})
