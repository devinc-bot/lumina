import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@repo/common'
import { Card } from '@repo/ui'
import { getMercadoPagoPriceQuote } from '~/modules/owner/services/mercado-pago-connection.service'

const BASE_CONVERSION_RATE = 100 // TODO: Replace with actual conversion rate when available

export function TicketCommercialBreakdown({ price }: { price: string }) {
  const { t, i18n } = useTranslation('tickets')
  const facePrice = Number(price.replace(',', '.'))
  const unitFacePriceAmount = Math.round(facePrice * BASE_CONVERSION_RATE)
  const quote = useQuery({
    queryKey: ['mercado-pago', 'ticket-quote', unitFacePriceAmount],
    queryFn: () => getMercadoPagoPriceQuote(unitFacePriceAmount),
    enabled: Number.isSafeInteger(unitFacePriceAmount) && unitFacePriceAmount > 0,
  })
  if (!Number.isFinite(facePrice) || facePrice <= 0) return null
  const format = (amount: number) => formatCurrency(amount, { locale: i18n.language })

  return (
    <Card className="mt-5 grid gap-2 p-4 text-sm" aria-live="polite">
      <p className="font-medium text-on-surface">{t('form.commercialBreakdownTitle')}</p>
      {quote.data ? (
        <>
          <div className="flex justify-between gap-4 text-on-surface-variant">
            <span>{t('form.commercialSubtotal')}</span>
            <span>{format(quote.data.subtotalAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <div className="flex justify-between gap-4 text-on-surface-variant">
            <span>{t('form.commercialMercadoPago')}</span>
            <span>{format(quote.data.providerFeeQuotedAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <div className="flex justify-between gap-4 pl-3 text-xs text-on-surface-variant">
            <span>{t('form.commercialMercadoPagoVat')}</span>
            <span>{format(quote.data.providerFeeTaxAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <div className="flex justify-between gap-4 text-on-surface-variant">
            <span>{t('form.commercialLumina')}</span>
            <span>{format(quote.data.platformFeeAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-hairline pt-2 font-semibold text-on-surface">
            <span>{t('form.commercialTotal')}</span>
            <span>{format(quote.data.totalAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <div className="flex justify-between gap-4 text-on-surface-variant">
            <span>{t('form.commercialOwnerProceeds')}</span>
            <span>{format(quote.data.expectedOwnerProceedsAmount / BASE_CONVERSION_RATE)}</span>
          </div>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            {t('form.commercialEstimateHint')}
          </p>
        </>
      ) : (
        <p className="text-xs text-on-surface-variant">
          {quote.isError ? t('form.commercialQuoteError') : t('form.commercialQuoteLoading')}
        </p>
      )}
    </Card>
  )
}
