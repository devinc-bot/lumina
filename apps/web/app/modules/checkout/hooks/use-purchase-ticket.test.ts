// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('~/modules/common/hooks/use-session', () => ({
  useSession: () => ({ isAuthenticated: false, isLoading: false }),
}))
vi.mock('~/modules/checkout/services/checkout.service', () => ({ createPendingOrder: vi.fn() }))
vi.mock('~/modules/checkout/services/marketplace-pricing.service', () => ({
  getMarketplacePriceQuote: vi.fn(),
}))

import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { usePurchaseTicket } from './use-purchase-ticket'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('returns an unauthenticated purchase to the event page by slug', async () => {
  const { result } = renderHook(() => usePurchaseTicket({ eventSlug: 'summer-night' }))

  await act(async () => {
    await result.current.purchaseTicket('ticket-document-id')
  })

  expect(navigate).toHaveBeenCalledWith({
    to: WEB_ROUTES.login(),
    search: { returnTo: '/events/summer-night' },
  })
})
