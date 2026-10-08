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

const translationService = { translateError: (code: string) => code } as never

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

const savedTicket = {
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
  event: { documentId: 'event-a', name: 'Event A' },
  location: { documentId: 'location-a', name: 'Location A' },
}

const capacityExceeded = { status: TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED } as const
const savedResult = { status: TICKET_CAPACITY_RESULT.SAVED, ticket: savedTicket } as const

beforeEach(() => {
  vi.clearAllMocks()
  state.findEvent.mockImplementation(async (documentId: string) => ({
    id: documentId === 'event-b' ? 22 : 11,
    documentId,
    organizationId: 1,
    startsAt: new Date('2026-09-01T22:00:00.000Z'),
  }))
  state.findTicketType.mockResolvedValue({ id: 7 })
  state.findExistingTicket.mockResolvedValue({
    ticket: { documentId: 'ticket-editing', quantity: 50 },
    ticketType: { id: 7 },
    event: { id: 11, documentId: 'event-a', name: 'Event A' },
    location: { id: 1, documentId: 'location-a', name: 'Location A', capacity: '100' },
  })
  state.upsertWithinCapacity.mockResolvedValue(savedResult)
})

test('rejects create when the capacity transaction reports an over-limit aggregate', async () => {
  // The transaction includes 91 units from existing tickets, including an inactive ticket,
  // so adding 10 exceeds the location capacity of 100.
  state.upsertWithinCapacity.mockResolvedValue(capacityExceeded)

  await expect(
    new CreateTicketUseCase(translationService).execute('owner-id', input)
  ).rejects.toBeInstanceOf(BadRequestException)

  expect(state.upsertWithinCapacity).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 10, eventId: 11, status: TICKET_STATUS.INACTIVE })
  )
})

test('allows create when the configured total equals location capacity', async () => {
  const result = await new CreateTicketUseCase(translationService).execute('owner-id', input)

  expect(state.upsertWithinCapacity).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 10, eventId: 11 })
  )
  expect(result.documentId).toBe('ticket-saved')
})

test('rejects edit when the replacement quantity makes the configured total exceed capacity', async () => {
  state.upsertWithinCapacity.mockResolvedValue(capacityExceeded)

  await expect(
    new UpdateTicketUseCase(translationService).execute('owner-id', 'ticket-editing', input)
  ).rejects.toBeInstanceOf(BadRequestException)

  expect(state.upsertWithinCapacity).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 10, eventId: 11 }),
    'ticket-editing'
  )
})

test('allows edit at capacity after excluding the edited ticket previous quantity', async () => {
  const result = await new UpdateTicketUseCase(translationService).execute(
    'owner-id',
    'ticket-editing',
    input
  )

  expect(state.upsertWithinCapacity).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 10, eventId: 11 }),
    'ticket-editing'
  )
  expect(result.documentId).toBe('ticket-saved')
})

test('validates an edit against the destination event and excludes the edited ticket', async () => {
  const movedInput = { ...input, eventId: 'event-b' }
  state.upsertWithinCapacity.mockResolvedValue(capacityExceeded)

  await expect(
    new UpdateTicketUseCase(translationService).execute('owner-id', 'ticket-editing', movedInput)
  ).rejects.toBeInstanceOf(BadRequestException)

  expect(state.upsertWithinCapacity).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 10, eventId: 22 }),
    'ticket-editing'
  )
})
