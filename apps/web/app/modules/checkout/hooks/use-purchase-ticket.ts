import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { QueryFactoryError } from '@repo/common'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { useSession } from '~/modules/common/hooks/use-session'
import { createPendingOrder } from '~/modules/checkout/services/checkout.service'
import { getMarketplacePriceQuote } from '~/modules/checkout/services/marketplace-pricing.service'
import type { PriceBreakdown } from '@repo/types'

type UsePurchaseTicketOptions = {
  eventSlug: string
}

export function usePurchaseTicket({ eventSlug }: UsePurchaseTicketOptions) {
  const { t } = useTranslation('events')
  const { isAuthenticated, isLoading: isSessionLoading } = useSession()
  const navigate = useNavigate()
  const [purchasingTicketId, setPurchasingTicketId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function purchaseTicket(
    ticketId: string,
    expectedTotalAmount?: number
  ): Promise<{ updatedQuote: PriceBreakdown | null }> {
    if (!isAuthenticated) {
      await navigate({
        to: WEB_ROUTES.login(),
        search: { returnTo: WEB_ROUTES.event(eventSlug) } as never,
      })
      return { updatedQuote: null }
    }

    setPurchasingTicketId(ticketId)
    setError(null)
    try {
      const pendingOrder = await createPendingOrder({
        ticketId,
        quantity: 1,
        expectedTotalAmount,
      })
      if (
        expectedTotalAmount !== undefined &&
        pendingOrder.breakdown.totalAmount !== expectedTotalAmount
      ) {
        setPurchasingTicketId(null)
        return { updatedQuote: pendingOrder.breakdown }
      }
      window.location.assign(pendingOrder.checkoutUrl)
      return { updatedQuote: null }
    } catch (caughtError) {
      if (caughtError instanceof QueryFactoryError && caughtError.status === 409) {
        try {
          return { updatedQuote: await getMarketplacePriceQuote(ticketId) }
        } catch {
          setError(t('discover.detail.purchaseError'))
          return { updatedQuote: null }
        } finally {
          setPurchasingTicketId(null)
        }
      }
      setError(
        caughtError instanceof Error ? caughtError.message : t('discover.detail.purchaseError')
      )
      setPurchasingTicketId(null)
      return { updatedQuote: null }
    }
  }

  return {
    purchaseTicket,
    purchasingTicketId,
    isSessionLoading,
    error,
  }
}
