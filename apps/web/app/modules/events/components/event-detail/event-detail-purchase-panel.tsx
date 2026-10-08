import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@repo/common'
import type { PriceBreakdown, PublicPurchasableTicketResponse } from '@repo/types'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@repo/ui'
import { formatEventWhenCompact } from '../../utils/events-discover-format'
import { EventDetailBuyButton } from './event-detail-buy-button'
import { usePurchaseTicket } from '~/modules/checkout/hooks/use-purchase-ticket'
import { getMarketplacePriceQuote } from '~/modules/checkout/services/marketplace-pricing.service'

type EventDetailPurchasePanelProps = {
  eventSlug: string
  startsAt: Date | string
  tickets: PublicPurchasableTicketResponse[]
  paymentsReady: boolean
  className?: string
}

function formatTicketPrice(price: number, locale: string): string {
  return formatCurrency(price, {
    locale,
    options: { maximumFractionDigits: 0 },
  })
}

function formatMinorCurrency(amount: number, locale: string): string {
  return formatCurrency(amount / 100, { locale, options: { minimumFractionDigits: 2 } })
}

export function EventDetailPurchasePanel({
  eventSlug,
  startsAt,
  tickets,
  paymentsReady,
  className,
}: EventDetailPurchasePanelProps) {
  const { t, i18n } = useTranslation('events')
  const { purchaseTicket, purchasingTicketId, isSessionLoading, error } = usePurchaseTicket({
    eventSlug,
  })
  const whenCompact = formatEventWhenCompact(startsAt, i18n.language)
  const hasTickets = tickets.length > 0
  const [selectedTicket, setSelectedTicket] = useState<PublicPurchasableTicketResponse | null>(null)
  const [quote, setQuote] = useState<PriceBreakdown | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [requiresReconfirmation, setRequiresReconfirmation] = useState(false)

  async function openPurchaseConfirmation(ticket: PublicPurchasableTicketResponse) {
    setSelectedTicket(ticket)
    setQuote(null)
    setRequiresReconfirmation(false)
    setQuoteError(null)
    setIsQuoting(true)
    try {
      setQuote(await getMarketplacePriceQuote(ticket.documentId))
    } catch {
      setQuoteError(t('discover.detail.purchaseError'))
    } finally {
      setIsQuoting(false)
    }
  }

  return (
    <Card
      as="aside"
      aria-label={t('discover.detail.purchasePanelAriaLabel')}
      className={cn(
        'flex flex-col gap-4 p-4 sm:justify-between sm:gap-5',
        'bg-surface-raised',
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-display text-base font-semibold tracking-tight text-balance text-on-surface">
          {hasTickets ? t('discover.detail.ticketsReady') : t('discover.detail.ticketsSoon')}
        </p>
        {whenCompact ? (
          <p className="mt-1 font-label text-sm text-on-surface-variant">{whenCompact}</p>
        ) : null}
        {!hasTickets ? (
          <p className="mt-2 max-w-[28ch] font-body text-sm leading-relaxed text-pretty text-on-surface-variant">
            {t('discover.detail.ticketsUnavailableHint')}
          </p>
        ) : null}
      </div>

      {hasTickets ? (
        <div className="w-full border-t border-hairline/35 pt-4 lg:max-w-sm">
          <ul
            className="flex flex-col divide-y divide-hairline/35"
            aria-label={t('discover.detail.ticketsReady')}
          >
            {tickets.map((ticket) => {
              const isSoldOut = ticket.remainingQuantity <= 0
              const isDisabled = !paymentsReady || isSoldOut
              const isPurchasing = purchasingTicketId === ticket.documentId
              const unavailableReason = !paymentsReady
                ? t('discover.detail.buyTicketsDisabled')
                : isSoldOut
                  ? t('discover.detail.ticketSoldOut')
                  : undefined

              return (
                <li
                  key={ticket.documentId}
                  className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex justify-between gap-3">
                    <div className="flex w-fit flex-col gap-1">
                      <p className="truncate font-body text-sm font-semibold text-on-surface">
                        {ticket.ticketType.name}
                      </p>
                      <p className="mt-0.5 font-label text-xs text-on-surface-variant">
                        {isSoldOut
                          ? t('discover.detail.ticketSoldOut')
                          : t('discover.detail.ticketAvailability', {
                              count: ticket.remainingQuantity,
                            })}
                      </p>
                    </div>
                    <div className="flex w-fit">
                      <p className="font-display text-base font-semibold tracking-tight text-on-surface">
                        {formatTicketPrice(ticket.price, i18n.language)}
                      </p>
                    </div>
                  </div>
                  <EventDetailBuyButton
                    label={
                      isSoldOut
                        ? t('discover.detail.ticketSoldOut')
                        : t('discover.detail.buyTickets')
                    }
                    disabled={isDisabled || isSessionLoading || purchasingTicketId !== null}
                    loading={isPurchasing}
                    title={unavailableReason}
                    onClick={() => void openPurchaseConfirmation(ticket)}
                  />
                </li>
              )
            })}
          </ul>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-error">
              {error}
            </p>
          ) : null}
          {!paymentsReady ? (
            <p className="mt-4 max-w-[34ch] font-body text-sm leading-relaxed text-pretty text-on-surface-variant">
              {t('discover.detail.paymentsUnavailableHint')}
            </p>
          ) : null}
        </div>
      ) : null}
      <Dialog
        open={selectedTicket !== null}
        onOpenChange={(open) => {
          if (!open && !isQuoting && purchasingTicketId === null) setSelectedTicket(null)
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('discover.detail.purchaseConfirmationTitle')}</DialogTitle>
            <DialogDescription>
              {t('discover.detail.purchaseConfirmationDescription')}
            </DialogDescription>
          </DialogHeader>
          {isQuoting ? (
            <p className="text-sm text-on-surface-variant">{t('discover.detail.quoteLoading')}</p>
          ) : null}
          {quote ? (
            <dl className="grid gap-2 rounded-app-sm bg-surface-muted p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt>{t('discover.detail.feeSubtotal')}</dt>
                <dd>{formatMinorCurrency(quote.subtotalAmount, i18n.language)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t('discover.detail.feeMercadoPago')}</dt>
                <dd>{formatMinorCurrency(quote.providerFeeQuotedAmount, i18n.language)}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-3 text-xs text-on-surface-variant">
                <dt>{t('discover.detail.feeMercadoPagoVat')}</dt>
                <dd>{formatMinorCurrency(quote.providerFeeTaxAmount, i18n.language)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t('discover.detail.feeLumina')}</dt>
                <dd>{formatMinorCurrency(quote.platformFeeAmount, i18n.language)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-hairline pt-2 font-semibold">
                <dt>{t('discover.detail.feeTotal')}</dt>
                <dd>{formatMinorCurrency(quote.totalAmount, i18n.language)}</dd>
              </div>
            </dl>
          ) : null}
          {quoteError ? (
            <p role="alert" className="text-sm text-error">
              {quoteError}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-on-surface-variant">
            {t('discover.detail.mercadoPagoEstimateHint')}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTicket(null)}
              disabled={purchasingTicketId !== null}
            >
              {t('discover.detail.purchaseCancel')}
            </Button>
            <Button
              disabled={!quote || isQuoting || purchasingTicketId !== null || !selectedTicket}
              loading={selectedTicket ? purchasingTicketId === selectedTicket.documentId : false}
              onClick={() => {
                if (!selectedTicket || !quote) return
                void purchaseTicket(selectedTicket.documentId, quote.totalAmount).then(
                  ({ updatedQuote }) => {
                    if (updatedQuote) {
                      setQuote(updatedQuote)
                      setRequiresReconfirmation(true)
                    }
                  }
                )
              }}
            >
              {t('discover.detail.purchaseConfirm')}
            </Button>
          </DialogFooter>
          {requiresReconfirmation ? (
            <p role="status" className="text-sm text-on-surface-variant">
              {t('discover.detail.quoteChanged')}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
