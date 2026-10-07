import { PAYMENT_STATUS } from '@repo/types'
import { describe, expect, test } from 'vitest'
import { canCancelOrder, getOrderStatusBadgeVariant } from './order-display'

describe('canCancelOrder', () => {
  test('allows cancellation only for a pending checkout', () => {
    expect(canCancelOrder(PAYMENT_STATUS.PENDING)).toBe(true)
    expect(canCancelOrder(PAYMENT_STATUS.COMPLETED)).toBe(false)
    expect(canCancelOrder(PAYMENT_STATUS.CANCELLED)).toBe(false)
    expect(canCancelOrder(PAYMENT_STATUS.REJECTED)).toBe(false)
  })
})

describe('getOrderStatusBadgeVariant', () => {
  test('returns a variant for every payment status', () => {
    expect(getOrderStatusBadgeVariant(PAYMENT_STATUS.PENDING)).toBe('secondary')
    expect(getOrderStatusBadgeVariant(PAYMENT_STATUS.COMPLETED)).toBe('default')
    expect(getOrderStatusBadgeVariant(PAYMENT_STATUS.CANCELLED)).toBe('outline')
    expect(getOrderStatusBadgeVariant(PAYMENT_STATUS.REJECTED)).toBe('destructive')
  })
})
