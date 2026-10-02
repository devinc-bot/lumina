import { expect, test } from 'vitest'
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_STATUS, PURCHASE_STATUS } from '@repo/types'
import { toBuyerPurchaseSummaryResponse, toLegacyPaymentStatus } from './orders.mapper.ts'

test('maps normalized purchases to the compatible order history response', () => {
  const result = toBuyerPurchaseSummaryResponse({
    documentId: 'purchase-1',
    purchaseStatus: 'confirmed',
    paymentStatus: 'approved',
    amount: 2500,
    quantity: 2,
    provider: 'mercado_pago',
    paidAt: new Date(100000),
    createdAt: new Date(100000),
    updatedAt: new Date(200000),
    ticketId: 'ticket-document-id',
    ticketType: { documentId: 'type-general', name: 'General' },
    eventId: 'event-document-id',
    eventName: 'After party',
    eventStartsAt: new Date(1000000),
  })

  expect(result.status).toBe('completed')
  expect(result.ticketId).toBe('ticket-document-id')
})

test('maps confirmed purchase to completed regardless of payment attempt', () => {
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CONFIRMED, PAYMENT_ATTEMPT_STATUS.PENDING)).toBe(
    PAYMENT_STATUS.COMPLETED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CONFIRMED, PAYMENT_ATTEMPT_STATUS.APPROVED)).toBe(
    PAYMENT_STATUS.COMPLETED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CONFIRMED, PAYMENT_ATTEMPT_STATUS.REJECTED)).toBe(
    PAYMENT_STATUS.COMPLETED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CONFIRMED, PAYMENT_ATTEMPT_STATUS.CANCELLED)).toBe(
    PAYMENT_STATUS.COMPLETED
  )
})

test('maps rejected payment attempt to rejected', () => {
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.REJECTED)).toBe(
    PAYMENT_STATUS.REJECTED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CANCELLED, PAYMENT_ATTEMPT_STATUS.REJECTED)).toBe(
    PAYMENT_STATUS.REJECTED
  )
})

test('maps cancelled payment attempt to cancelled', () => {
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.CANCELLED)).toBe(
    PAYMENT_STATUS.CANCELLED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.EXPIRED, PAYMENT_ATTEMPT_STATUS.CANCELLED)).toBe(
    PAYMENT_STATUS.CANCELLED
  )
})

test('maps pending purchase with non-terminal payment to pending', () => {
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.PENDING)).toBe(
    PAYMENT_STATUS.PENDING
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.APPROVED)).toBe(
    PAYMENT_STATUS.PENDING
  )
})

test('maps remaining purchase states to cancelled', () => {
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.EXPIRED, PAYMENT_ATTEMPT_STATUS.PENDING)).toBe(
    PAYMENT_STATUS.CANCELLED
  )
  expect(toLegacyPaymentStatus(PURCHASE_STATUS.CANCELLED, PAYMENT_ATTEMPT_STATUS.APPROVED)).toBe(
    PAYMENT_STATUS.CANCELLED
  )
})
