import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScannedTicketHistoryItem } from '@repo/types'
import {
  Badge,
  Card,
  getPaginationItems,
  Loader,
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { useEvents } from '~/modules/events/queries/use-event-queries'
import { useScannedTicketsHistory } from '../queries/use-scanned-tickets-history'

const HISTORY_PAGE_SIZE = 10
const EVENTS_SELECTOR_PAGE_SIZE = 100

function formatDateTime(value: Date, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function HistoryTable({ items }: { items: ScannedTicketHistoryItem[] }) {
  const { t, i18n } = useTranslation('dashboard')

  return (
    <Table variant="compact" className="min-w-180">
      <TableHeader>
        <TableRow>
          <TableHead className="p-6">{t('pages.qrTicket.history.table.scannedAt')}</TableHead>
          <TableHead className="p-6">{t('pages.qrTicket.history.table.purchaser')}</TableHead>
          <TableHead className="p-6">{t('pages.qrTicket.history.table.operator')}</TableHead>
          <TableHead className="p-6">{t('pages.qrTicket.history.table.ticket')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const operatorName = item.operator?.fullName ?? null
          const operatorEmail = item.operator?.email ?? null
          return (
            <TableRow key={`${item.scannedAt}-${index}`}>
              <TableCell className="whitespace-nowrap p-6 text-ink">
                {formatDateTime(item.scannedAt, i18n.language)}
              </TableCell>
              <TableCell className="p-6">
                <p className="font-semibold text-ink">{item.purchaser.fullName}</p>
                <p className="text-sm text-ink-muted">{item.purchaser.email}</p>
              </TableCell>
              <TableCell className="p-6">
                {operatorName ? (
                  <>
                    <p className="font-semibold text-ink">{operatorName}</p>
                    {operatorEmail ? (
                      <p className="text-sm text-ink-muted">{operatorEmail}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-ink-muted">{t('pages.qrTicket.history.notReported')}</p>
                )}
              </TableCell>
              <TableCell className="p-6">
                <Badge variant="outline" size="sm">
                  {item.ticket.ticketType.name}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function HistoryPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation('dashboard')

  if (totalPages <= 1) return null

  const items = getPaginationItems(page, totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-hairline px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <p
        className="text-center text-sm tabular-nums text-ink-muted sm:text-left"
        aria-live="polite"
      >
        {t('pages.qrTicket.history.pagination.pageOf', { page, totalPages })}
      </p>
      <Pagination
        aria-label={t('pages.qrTicket.history.pagination.label')}
        className="sm:w-auto sm:justify-end"
      >
        <PaginationContent className="gap-1.5">
          <PaginationItem>
            <PaginationPrevious
              text={t('pages.qrTicket.history.pagination.previous')}
              aria-label={t('pages.qrTicket.history.pagination.previousAria')}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
          </PaginationItem>

          {items.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis label={t('pages.qrTicket.history.pagination.ellipsis')} />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationButton
                  isActive={item === page}
                  aria-label={t('pages.qrTicket.history.pagination.goToPage', { page: item })}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PaginationButton>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              text={t('pages.qrTicket.history.pagination.next')}
              aria-label={t('pages.qrTicket.history.pagination.nextAria')}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function ScannedTicketsHistory() {
  const { t } = useTranslation('dashboard')
  const [eventId, setEventId] = useState('')
  const [page, setPage] = useState(1)

  const eventsQuery = useEvents({ page: 1, limit: EVENTS_SELECTOR_PAGE_SIZE, hasSales: true })
  const historyQuery = useScannedTicketsHistory({ eventId, page, limit: HISTORY_PAGE_SIZE })

  const events = eventsQuery.data?.data ?? []
  const items = historyQuery.data?.data ?? []
  const hasSelection = Boolean(eventId)
  const hasNoEvents = eventsQuery.isSuccess && events.length === 0

  if (hasNoEvents) {
    return (
      <section className="space-y-4" aria-labelledby="scanned-tickets-history-heading">
        <div className="rounded-app bg-surface-card px-6 py-12 text-center">
          <p className="text-base text-ink-muted">{t('pages.qrTicket.history.noEvents')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="scanned-tickets-history-heading">
      <div className="w-full sm:w-72">
        <Select
          value={eventId}
          onValueChange={(nextEventId) => {
            setEventId(nextEventId)
            setPage(1)
          }}
        >
          <SelectTrigger aria-label={t('pages.qrTicket.history.selectLabel')}>
            <SelectValue placeholder={t('pages.qrTicket.history.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.documentId} value={event.documentId}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasSelection ? (
        <div className="rounded-app bg-surface-card px-6 py-12 text-center">
          <p className="text-base text-ink-muted">{t('pages.qrTicket.history.emptySelect')}</p>
        </div>
      ) : historyQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : historyQuery.isError ? (
        <div className="rounded-app bg-surface-card px-6 py-12 text-center">
          <p className="text-base text-ink-muted">{t('pages.qrTicket.history.error')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-app bg-surface-card px-6 py-12 text-center">
          <p className="text-base text-ink-muted">{t('pages.qrTicket.history.empty')}</p>
        </div>
      ) : (
        <Card variant="gradient">
          <HistoryTable items={items} />
          <HistoryPagination
            page={historyQuery.data?.page ?? 1}
            totalPages={historyQuery.data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </Card>
      )}
    </section>
  )
}
