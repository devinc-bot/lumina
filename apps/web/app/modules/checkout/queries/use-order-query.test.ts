import { expect, test, vi } from 'vitest'
import { PAYMENT_STATUS } from '@repo/types'

const useQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({ useQuery }))
vi.mock('../services/checkout.service', () => ({ getOrder: vi.fn() }))

import { useOrderQuery } from './use-order-query.ts'

function getRefetchInterval() {
  useOrderQuery('cc0ca203-6427-46e8-89b7-e885668c36c0')

  const options = useQuery.mock.calls[0]?.[0]
  return {
    refetchInterval: options.refetchInterval as (query: {
      state: { data?: { status?: string }; dataUpdateCount: number; errorUpdateCount: number }
    }) => number | false,
    retry: options.retry,
  }
}

test('polls a pending order up to five total query attempts', () => {
  const { refetchInterval, retry } = getRefetchInterval()

  expect(retry).toBe(false)
  expect(
    refetchInterval({
      state: { data: { status: PAYMENT_STATUS.PENDING }, dataUpdateCount: 1, errorUpdateCount: 0 },
    })
  ).toBe(2_000)
  expect(
    refetchInterval({
      state: { data: { status: PAYMENT_STATUS.PENDING }, dataUpdateCount: 5, errorUpdateCount: 0 },
    })
  ).toBe(false)
  expect(
    refetchInterval({
      state: { data: { status: PAYMENT_STATUS.PENDING }, dataUpdateCount: 4, errorUpdateCount: 1 },
    })
  ).toBe(false)
  expect(
    refetchInterval({
      state: {
        data: { status: PAYMENT_STATUS.COMPLETED },
        dataUpdateCount: 1,
        errorUpdateCount: 0,
      },
    })
  ).toBe(false)
})
