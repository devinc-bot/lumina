import { expect, test } from 'vitest'
import { getTicketQuantityCapacityError } from '../app/modules/tickets/utils/ticket-capacity.ts'

test('returns a field validation error when ticket quantity exceeds the remaining event capacity', () => {
  expect(getTicketQuantityCapacityError(6, 5)).toBe('validation:field.ticket.capacityExceeded')
})

test('allows a ticket quantity equal to the remaining event capacity', () => {
  expect(getTicketQuantityCapacityError(5, 5)).toBeUndefined()
})

test('allows a ticket quantity below the remaining event capacity', () => {
  expect(getTicketQuantityCapacityError(4, 5)).toBeUndefined()
})
