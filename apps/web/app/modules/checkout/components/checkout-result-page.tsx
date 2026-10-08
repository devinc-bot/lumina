import { Link } from '@tanstack/react-router'
import { CircleCheck, CircleX, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Skeleton, cn } from '@repo/ui'
import { PAYMENT_STATUS, type PaymentStatus } from '@repo/types'
import { RequireAuth } from '~/modules/common/components/require-auth'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { OrderSummary } from '~/modules/orders/components/order-summary'
import { useOrderQuery } from '../queries/use-order-query'

type CheckoutResultContent = {
  descriptionKey:
    | 'discover.checkout.success'
    | 'discover.checkout.pending'
    | 'discover.checkout.error'
  titleKey:
    | 'discover.checkout.successTitle'
    | 'discover.checkout.pendingTitle'
    | 'discover.checkout.errorTitle'
}

function getCheckoutResultContent(status: PaymentStatus): CheckoutResultContent {
  if (status === PAYMENT_STATUS.COMPLETED) {
    return {
      titleKey: 'discover.checkout.successTitle',
      descriptionKey: 'discover.checkout.success',
    }
  }
  if (status === PAYMENT_STATUS.PENDING) {
    return {
      titleKey: 'discover.checkout.pendingTitle',
      descriptionKey: 'discover.checkout.pending',
    }
  }
  return { titleKey: 'discover.checkout.errorTitle', descriptionKey: 'discover.checkout.error' }
}

function CheckoutResultSkeleton() {
  const { t } = useTranslation('events')

  return (
    <section
      className="mx-auto mt-10 w-full max-w-sm overflow-hidden rounded-app-sm bg-surface-card text-center shadow-[0_12px_32px_-16px_rgb(0_0_0/0.35)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-2 bg-primary" aria-hidden />
      <div className="px-6 py-8 sm:px-7 sm:py-9">
        <span className="sr-only">{t('discover.checkout.pending')}</span>
        <Skeleton className="mx-auto size-11 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-8 w-4/5" />
        <Skeleton className="mx-auto mt-3 h-4 w-full max-w-sm" />
        <div className="my-7 border-t border-dashed border-hairline/75" />
        <div className="space-y-4 text-left">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </section>
  )
}

type CheckoutResultStatusCardProps = {
  content: CheckoutResultContent
  isError: boolean
  orderId: string
}

function CheckoutResultStatusCard({ content, isError, orderId }: CheckoutResultStatusCardProps) {
  const { t } = useTranslation('events')
  const icon = isError ? (
    <CircleX className="size-8" aria-hidden strokeWidth={1.9} />
  ) : (
    <Clock3 className="size-8" aria-hidden strokeWidth={1.9} />
  )

  return (
    <section
      className="mx-auto mt-10 w-full max-w-sm overflow-hidden border border-dashed bg-surface-card shadow-[0_12px_32px_-16px_rgb(0_0_0/0.35)]"
      aria-live="polite"
    >
      <div className={cn('h-2', isError ? 'bg-error' : 'bg-primary')} aria-hidden />
      <div className="px-6 py-8 sm:px-7 sm:py-9">
        <header className="text-left">
          <div className="flex flex-col gap-5">
            <div className="min-w-0 flex flex-col gap-4 items-center">
              <div
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-full',
                  isError ? 'bg-error-container/25 text-error' : 'bg-primary text-on-primary'
                )}
              >
                {icon}
              </div>
              <h1 className="font-display text-center text-3xl font-semibold tracking-tight text-on-surface">
                {t(content.titleKey)}
              </h1>
            </div>
            <p className="mt-3 max-w-sm text-pretty leading-relaxed text-on-surface-variant">
              {t(content.descriptionKey)}
            </p>
          </div>
        </header>
        <div className="mt-7 flex items-center justify-between gap-4 border-y border-dashed border-hairline/75 bg-surface-container-low/55 px-4 py-4">
          <p className="font-label text-xs tracking-label-sm text-on-surface-variant">
            {t('discover.checkout.reference')}
          </p>
          <code className="shrink-0 font-mono text-xs tracking-label-sm text-on-surface">
            {orderId.slice(-8).toUpperCase()}
          </code>
        </div>
        {isError ? (
          <Button asChild size="lg" className="mt-7 w-full rounded-none">
            <Link to={WEB_ROUTES.events()}>{t('discover.detail.backToEvents')}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}

export function CheckoutResultPage({ orderId }: { orderId: string }) {
  return (
    <RequireAuth>
      <CheckoutResultContent orderId={orderId} />
    </RequireAuth>
  )
}

function CheckoutResultContent({ orderId }: { orderId: string }) {
  const { t } = useTranslation('events')
  const { data: order, isError, isLoading } = useOrderQuery(orderId)

  if (isLoading) {
    return <CheckoutResultSkeleton />
  }

  const content = getCheckoutResultContent(
    isError ? PAYMENT_STATUS.REJECTED : (order?.status ?? PAYMENT_STATUS.REJECTED)
  )
  const isCheckoutError = isError || order?.status !== PAYMENT_STATUS.PENDING

  if (!isError && order?.status === PAYMENT_STATUS.COMPLETED) {
    return (
      <div className="mx-auto mt-10 w-full max-w-sm">
        <header className="mb-7 text-center sm:mb-8">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-on-primary">
            <CircleCheck className="size-8" aria-hidden strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-balance font-display text-2xl font-semibold tracking-tight text-on-surface sm:text-4xl">
            {t('discover.checkout.successTitle')}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty leading-relaxed text-on-surface-variant">
            {t('discover.checkout.success')}
          </p>
        </header>
        <OrderSummary
          order={order}
          action={
            <div className="mt-5 border-t border-dashed border-hairline/75 pt-5">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="min-h-11 w-full rounded-none bg-on-surface font-label text-xs tracking-label-sm text-inverse-on-surface hover:bg-on-surface-variant hover:text-inverse-on-surface focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                <Link to={WEB_ROUTES.events()}>{t('discover.detail.backToEvents')}</Link>
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  return <CheckoutResultStatusCard content={content} isError={isCheckoutError} orderId={orderId} />
}
