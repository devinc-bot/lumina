import { startTransition, useState } from 'react'
import { Info, ReceiptText, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getPaginationItems,
  Link,
  LoadErrorBanner,
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Skeleton,
  cn,
  toast,
  Button,
} from '@repo/ui'
import type { BuyerOrderSummaryResponse } from '@repo/types'
import { PageAtmosphereWash } from '~/modules/common/components/page-atmosphere-wash'
import { Container } from '~/modules/common/components/container'
import { PageHeader } from '~/modules/common/components/page-header'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { useDeleteOrderMutation } from '../mutations/use-delete-order-mutation'
import { useOrdersQuery } from '../queries/use-orders-query'
import { ORDERS_FIRST_PAGE } from '../services/orders.service'
import { canCancelOrder } from '../utils/order-display'
import { DeleteOrderDialog } from './delete-order-dialog'
import { RECEIPT_TICKET_CLASS } from './holographic-order-ticket'
import { OrderSummary } from './order-summary'

function OrdersListSkeleton() {
  const { t } = useTranslation('orders')

  return (
    <div
      className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t('states.loading')}</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(RECEIPT_TICKET_CLASS, 'px-5 pb-8 pt-7 sm:px-7 sm:pb-9 sm:pt-8')}
        >
          <div className="mx-auto flex max-w-96 flex-col items-center gap-2">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <div className="my-5 border-t border-dashed border-hairline/75" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-11/12" />
          </div>
          <div className="my-5 border-t border-dashed border-hairline/75" />
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="my-5 border-t border-dashed border-hairline/75" />
          <Skeleton className="mx-auto h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}

export function OrdersPage() {
  const { t } = useTranslation('orders')
  const [page, setPage] = useState(ORDERS_FIRST_PAGE)
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrderSummaryResponse | null>(null)
  const ordersQuery = useOrdersQuery({ page })
  const deleteOrderMutation = useDeleteOrderMutation()
  const orders = ordersQuery.data?.data ?? []

  function handlePageChange(nextPage: number) {
    if (nextPage === page) return
    startTransition(() => setPage(nextPage))
  }

  async function handleDeleteConfirm() {
    if (!selectedOrder || deleteOrderMutation.isPending) return

    try {
      await deleteOrderMutation.mutateAsync(selectedOrder.documentId)
      setSelectedOrder(null)
      toast.success(t('cancelCheckout.success'))

      if (orders.length === 1 && page > ORDERS_FIRST_PAGE) {
        startTransition(() => setPage(page - 1))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('cancelCheckout.error'))
    }
  }

  function renderPagination() {
    if (!ordersQuery.data || ordersQuery.data.totalPages <= 1) return null

    return (
      <Pagination aria-label={t('pagination.ariaLabel')} className="mt-9">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={page === ORDERS_FIRST_PAGE || ordersQuery.isFetching}
              text={t('pagination.previous')}
              onClick={() => handlePageChange(page - 1)}
            />
          </PaginationItem>

          {getPaginationItems(page, ordersQuery.data.totalPages).map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis label={t('pagination.morePages')} />
                </PaginationItem>
              )
            }

            return (
              <PaginationItem key={item}>
                <PaginationButton
                  isActive={item === page}
                  disabled={ordersQuery.isFetching}
                  aria-label={t('pagination.page', { page: item })}
                  onClick={() => handlePageChange(item)}
                >
                  {item}
                </PaginationButton>
              </PaginationItem>
            )
          })}

          <PaginationItem>
            <PaginationNext
              disabled={page === ordersQuery.data.totalPages || ordersQuery.isFetching}
              text={t('pagination.next')}
              onClick={() => handlePageChange(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  function renderContent() {
    if (ordersQuery.isLoading) return <OrdersListSkeleton />

    if (ordersQuery.isError) {
      return (
        <section className="overflow-hidden rounded-app-lg border border-error/35 bg-error-container/10">
          <div className="h-3 bg-error/80" aria-hidden />
          <LoadErrorBanner
            className="my-0 w-full max-w-none rounded-none border-0 bg-transparent p-5 sm:p-6"
            title={t('states.errorTitle')}
            message={ordersQuery.error.message || t('states.error')}
            retryLabel={t('actions.retry')}
            onRetry={() => void ordersQuery.refetch()}
            isRetrying={ordersQuery.isFetching}
          />
        </section>
      )
    }

    if (orders.length === 0) {
      return (
        <div className="overflow-hidden rounded-app-lg border border-dashed border-hairline/55 bg-surface-container-low/55">
          <div className="h-7 bg-primary" aria-hidden />
          <div className="flex min-h-72 flex-col items-start justify-center px-6 py-10 sm:px-10">
            <div className="flex size-12 items-center justify-center rounded-app-sm bg-surface-container-high text-primary">
              <ReceiptText className="size-6" aria-hidden strokeWidth={1.75} />
            </div>
            <h2 className="mt-6 text-balance font-display text-2xl font-semibold tracking-tight text-on-surface">
              {t('states.emptyTitle')}
            </h2>
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-on-surface-variant">
              {t('states.emptyDescription')}
            </p>
            <Link to={WEB_ROUTES.events()} size="sm" className="mt-6 min-h-11 px-0" variant="link">
              {t('actions.discoverEvents')}
            </Link>
          </div>
        </div>
      )
    }

    return (
      <>
        <span className="sr-only" aria-live="polite">
          {ordersQuery.isFetching ? t('states.loading') : null}
        </span>
        <ul
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy={ordersQuery.isFetching}
          aria-label={t('list.ariaLabel')}
        >
          {orders.map((order) => (
            <li key={order.documentId} className="min-w-0">
              <OrderSummary
                order={order}
                action={
                  canCancelOrder(order.status) ? (
                    <div className="mt-5 border-t border-dashed border-hairline/75 pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 w-full rounded-none bg-on-surface font-label text-xs tracking-label-sm text-inverse-on-surface hover:bg-on-surface-variant hover:text-inverse-on-surface focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <X className="size-3.5" aria-hidden strokeWidth={1.75} />
                        {t('actions.cancelCheckout')}
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
        {renderPagination()}
      </>
    )
  }

  return (
    <Container>
      <div className="relative mx-auto w-full">
        <PageAtmosphereWash className="h-40" />
        <PageHeader title={t('page.title')} description={t('page.description')} />

        <aside className="mb-9 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-y border-dashed border-hairline/45 py-4 text-sm text-on-surface-variant sm:gap-4 sm:px-1">
          <Info className="size-6 shrink-0 text-primary" aria-hidden strokeWidth={1.75} />
          <p className="text-pretty leading-relaxed">{t('retentionNotice')}</p>
        </aside>

        {renderContent()}

        <DeleteOrderDialog
          open={selectedOrder !== null}
          order={selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null)
          }}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteOrderMutation.isPending}
        />
      </div>
    </Container>
  )
}
