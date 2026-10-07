import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDate } from '@repo/common'
import { Badge, cn } from '@repo/ui'
import type { BuyerOrderSummaryResponse } from '@repo/types'
import { getOrderStatusBadgeVariant } from '../utils/order-display'
import { HolographicOrderTicket } from './holographic-order-ticket'

type OrderSummaryProps = {
  order: BuyerOrderSummaryResponse
  action?: React.ReactNode | null
}

export function OrderSummary({ order, action }: OrderSummaryProps) {
  const { t, i18n } = useTranslation('orders')
  const orderDate = formatDate(order.createdAt, {
    locale: i18n.language,
    fallback: t('card.unavailable'),
    options: { dateStyle: 'medium', timeStyle: 'short' },
  })
  const eventDate = order.eventStartsAt
    ? formatDate(order.eventStartsAt, {
        locale: i18n.language,
        fallback: t('card.unavailable'),
        options: { dateStyle: 'medium', timeStyle: 'short' },
      })
    : null

  return (
    <HolographicOrderTicket>
      <div className="px-5 pb-8 pt-7 text-sm leading-relaxed sm:px-7 sm:pb-9 sm:pt-8">
        <header className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h2 className="min-w-0 wrap-break-word text-balance font-display text-xl font-bold leading-tight tracking-tight text-on-surface">
              {order.eventName ?? t('card.eventUnavailable')}
            </h2>
            <Badge variant={getOrderStatusBadgeVariant(order.status)} size="sm">
              {t(`status.${order.status}`)}
            </Badge>
          </div>
          <p className="mt-2 wrap-break-word font-label text-xs tracking-label-sm text-on-surface-variant">
            {order.ticketType.name}
            <span className="px-2 text-outline" aria-hidden>
              ·
            </span>
            {t('card.quantityValue', { count: order.quantity })}
          </p>
        </header>

        <dl className="space-y-3 text-on-surface-variant mt-8">
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="flex min-w-0 shrink items-center gap-2 font-label text-xs tracking-label-sm">
              <span className="wrap-break-word">{order.ticketType.name}</span>
            </dt>
            <span
              aria-hidden
              className="mb-1 min-w-3 flex-1 border-b border-dotted border-hairline/80"
            />
            <dd className="shrink-0 text-xs">
              {t('card.quantityValue', { count: order.quantity })}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="flex min-w-0 shrink items-center gap-2 font-label text-xs tracking-label-sm">
              <span className="wrap-break-word">{t('card.orderedAt')}</span>
            </dt>
            <span
              aria-hidden
              className="mb-1 min-w-3 flex-1 border-b border-dotted border-hairline/80"
            />
            <dd className="shrink-0 text-right text-xs">
              <time dateTime={String(order.createdAt)}>{orderDate}</time>
            </dd>
          </div>
          {eventDate ? (
            <div className="flex min-w-0 items-baseline gap-2">
              <dt className="min-w-0 shrink font-label text-xs tracking-label-sm">
                <span className="wrap-break-word">{t('card.eventDate')}</span>
              </dt>
              <span
                aria-hidden
                className="mb-1 min-w-3 flex-1 border-b border-dotted border-hairline/80"
              />
              <dd className="shrink-0 text-right text-xs">
                <time dateTime={String(order.eventStartsAt)}>{eventDate}</time>
              </dd>
            </div>
          ) : null}
        </dl>

        <span aria-hidden className="my-5 block border-t border-dashed border-hairline/75" />

        <dl>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-label text-sm tracking-label-sm text-on-surface-variant">
              {t('card.total')}
            </dt>
            <dd className="font-display text-2xl font-bold leading-none tracking-tight text-on-surface tabular-nums">
              {formatCurrency(order.amount, {
                locale: i18n.language,
                fallback: t('card.unavailable'),
                options: { maximumFractionDigits: 0 },
              })}
            </dd>
          </div>
        </dl>

        <span aria-hidden className="my-5 block border-t border-dashed border-hairline/75" />

        <p
          className={cn(
            'truncate text-center font-mono text-xs tracking-label-sm text-on-surface-variant'
          )}
          title={order.documentId}
        >
          {t('card.reference', { reference: order.documentId.slice(-8) })}
        </p>

        {action ? <>{action}</> : null}
      </div>
    </HolographicOrderTicket>
  )
}
