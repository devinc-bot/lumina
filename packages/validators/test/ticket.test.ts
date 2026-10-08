import { expect, test } from 'vitest'
import { createTicketSchema, ticketFormSchema } from '../src/ticket.ts'

const ticketTypeId = '8d1d285f-9d21-4b42-b218-495b05b4f223'

test('ticket schemas use ticket type identity without a ticket name', () => {
  const input = {
    name: 'Redundant label',
    ticketTypeId,
    price: 1000,
    quantity: 10,
    description: 'Private access',
    status: 'active',
    eventId: 'event-id',
    saleStartsAt: new Date('2026-09-01T20:00:00.000Z'),
    saleEndsAt: new Date('2026-09-01T22:00:00.000Z'),
  }

  const createResult = createTicketSchema.parse(input)
  const formResult = ticketFormSchema.parse({
    ...input,
    price: '1000',
    quantity: '10',
    saleStartsAt: '2026-09-01T20:00:00.000Z',
    saleEndsAt: '2026-09-01T22:00:00.000Z',
  })

  expect('name' in createResult).toBe(false)
  expect('name' in formResult).toBe(false)
})

test.each(['', '   '])('ticket form requires a ticket type for a value of %j', (value) => {
  const result = ticketFormSchema.safeParse({
    eventId: 'event-id',
    ticketTypeId: value,
    price: '1000',
    quantity: '10',
    description: 'Private access',
    saleStartsAt: '2026-09-01T20:00:00.000Z',
    saleEndsAt: '2026-09-01T22:00:00.000Z',
    status: 'active',
  })

  expect(result.success).toBe(false)
  if (result.success) return

  expect(result.error.issues.find((issue) => issue.path.includes('ticketTypeId'))?.message).toBe(
    'validation:field.ticket.typeRequired'
  )
})

test('ticket form still rejects malformed ticket type IDs and accepts UUIDs', () => {
  const input = {
    eventId: 'event-id',
    price: '1000',
    quantity: '10',
    description: 'Private access',
    saleStartsAt: '2026-09-01T20:00:00.000Z',
    saleEndsAt: '2026-09-01T22:00:00.000Z',
    status: 'active',
  }

  const malformedResult = ticketFormSchema.safeParse({ ...input, ticketTypeId: 'general' })
  const validResult = ticketFormSchema.safeParse({ ...input, ticketTypeId })

  expect(malformedResult.success).toBe(false)
  if (!malformedResult.success) {
    expect(
      malformedResult.error.issues.find((issue) => issue.path.includes('ticketTypeId'))
    ).toMatchObject({
      code: 'invalid_format',
      format: 'uuid',
    })
  }
  expect(validResult.success).toBe(true)
})

test('API ticket schema continues to require a UUID ticket type ID', () => {
  const input = {
    ticketTypeId: 'general',
    price: 1000,
    quantity: 10,
    description: 'Private access',
    status: 'active',
    eventId: 'event-id',
  }

  const result = createTicketSchema.safeParse(input)

  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues.find((issue) => issue.path.includes('ticketTypeId'))).toMatchObject({
      code: 'invalid_format',
      format: 'uuid',
    })
  }
})

test.each([
  ['saleEndsAt', '2026-09-01T20:00:00.000Z', '', 'validation:field.ticket.saleEndRequired'],
  ['saleStartsAt', '', '2026-09-01T22:00:00.000Z', 'validation:field.ticket.saleStartRequired'],
])('ticket form requires %s', (_field, saleStartsAt, saleEndsAt, expectedMessage) => {
  const result = ticketFormSchema.safeParse({
    eventId: 'event-id',
    ticketTypeId,
    price: '1000',
    quantity: '10',
    description: 'Private access',
    saleStartsAt,
    saleEndsAt,
    status: 'active',
  })

  expect(result.success).toBe(false)
  if (result.success) return

  expect(result.error.issues.at(-1)?.message).toBe(expectedMessage)
})

test('ticket form rejects a sale start later than its end and accepts equal sale dates', () => {
  const input = {
    eventId: 'event-id',
    ticketTypeId,
    price: '1000',
    quantity: '10',
    description: 'Private access',
    status: 'active',
  }

  const laterStart = ticketFormSchema.safeParse({
    ...input,
    saleStartsAt: '2026-09-01T22:00:00.000Z',
    saleEndsAt: '2026-09-01T20:00:00.000Z',
  })
  const equalDates = ticketFormSchema.safeParse({
    ...input,
    saleStartsAt: '2026-09-01T20:00:00.000Z',
    saleEndsAt: '2026-09-01T20:00:00.000Z',
  })

  expect(laterStart.success).toBe(false)
  if (!laterStart.success) {
    expect(laterStart.error.issues.at(-1)).toMatchObject({
      message: 'validation:field.ticket.saleEndAfterStart',
      path: ['saleEndsAt'],
    })
  }
  expect(equalDates.success).toBe(true)
})

test('ticket form rejects an invalid sale date as a field error', () => {
  const result = ticketFormSchema.safeParse({
    eventId: 'event-id',
    ticketTypeId,
    price: '1000',
    quantity: '10',
    description: 'Private access',
    saleStartsAt: 'not-a-date',
    saleEndsAt: '2026-09-01T22:00:00.000Z',
    status: 'active',
  })

  expect(result.success).toBe(false)
  if (result.success) return

  expect(result.error.issues.find((issue) => issue.path.includes('saleStartsAt'))?.message).toBe(
    'validation:field.ticket.saleDateInvalid'
  )
})
