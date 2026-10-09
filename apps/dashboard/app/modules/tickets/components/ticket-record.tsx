import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '@repo/common'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  getPaginationItems,
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import type { TicketStatus } from '@repo/types'
import { EllipsisVertical, Eye, Pencil, Trash2 } from 'lucide-react'
import { TicketViewDialog } from '~/modules/tickets/components/dialog-view-ticket'
import { TICKET_TAB, type TicketTab } from '~/modules/tickets/constants/tickets-tabs.constants'

const ticketActionIconClassName = '!size-[20px] shrink-0'

export type TicketRecordItem = {
  id: string
  clubName: string
  eventName: string
  eventImageUrl: string | null
  ticketType: string
  description: string
  price: number
  quantity: number
  totalSold: number
  revenue: number
  status: TicketStatus
}

function formatSoldCount(value: number): string {
  return formatNumber(value, { locale: 'es-AR' })
}

function getEventInitials(eventName: string): string {
  const parts = eventName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function EventIdentityCell({
  eventName,
  eventImageUrl,
}: Pick<TicketRecordItem, 'eventName' | 'eventImageUrl'>) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9 shrink-0 rounded-lg" aria-hidden="true">
        {eventImageUrl ? <AvatarImage src={eventImageUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback className="rounded-lg bg-surface-container text-xs font-semibold uppercase text-ink-muted">
          {getEventInitials(eventName)}
        </AvatarFallback>
      </Avatar>
      <p className="min-w-0 truncate font-semibold text-ink">{eventName}</p>
    </div>
  )
}

function TicketTypeBadge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'primary' | 'tertiary'
}) {
  return (
    <Badge
      variant="outline"
      size="sm"
      className={cn(
        tone === 'primary' && 'border-primary/40 bg-primary/10 text-primary',
        tone === 'tertiary' && 'border-tertiary/40 bg-tertiary/10 text-tertiary'
      )}
    >
      {label}
    </Badge>
  )
}

function formatQuantity(value: number): string {
  return formatNumber(value, { locale: 'es-AR' })
}

function TicketRecordRow({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: TicketRecordItem
  onView?: (record: TicketRecordItem) => void
  onEdit?: (record: TicketRecordItem) => void
  onDelete?: (record: TicketRecordItem) => void
}) {
  const { t } = useTranslation('tickets')

  const ticketTypeLabel = record.ticketType

  return (
    <TableRow className="border-0">
      <TableCell className="p-6">
        <EventIdentityCell eventName={record.eventName} eventImageUrl={record.eventImageUrl} />
      </TableCell>
      <TableCell className="p-6 font-semibold text-ink">{record.clubName}</TableCell>
      <TableCell className="p-6">
        <TicketTypeBadge label={ticketTypeLabel} tone="default" />
      </TableCell>
      <TableCell className="p-6 text-ink">
        {formatCurrency(record.price, {
          locale: 'es-AR',
          options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        })}
      </TableCell>
      <TableCell className="p-6 text-ink">{formatQuantity(record.quantity)}</TableCell>
      <TableCell className="p-6 text-ink">{formatSoldCount(record.totalSold)}</TableCell>
      <TableCell className="p-6 font-semibold text-ink">
        {formatCurrency(record.revenue, {
          locale: 'es-AR',
          options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        })}
      </TableCell>
      <TableCell className="p-6 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-ink-muted hover:text-ink"
              aria-label={t('table.rowActionsLabel', {
                type: ticketTypeLabel,
                club: record.clubName,
              })}
            >
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44 p-1.5">
            <DropdownMenuItem onClick={() => onEdit?.(record)}>
              <Pencil aria-hidden="true" className={ticketActionIconClassName} />
              {t('table.actionEdit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onView?.(record)}>
              <Eye aria-hidden="true" className={ticketActionIconClassName} />
              {t('table.actionView')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-error focus:text-error"
              onClick={() => onDelete?.(record)}
            >
              <Trash2 aria-hidden="true" className={cn(ticketActionIconClassName, 'text-error')} />
              {t('table.actionDelete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export type TicketRecordsPagination = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

function TicketRecordsPaginationBar({ pagination }: { pagination: TicketRecordsPagination }) {
  const { t } = useTranslation('tickets')
  const { page, totalPages, onPageChange } = pagination

  if (totalPages <= 1) return null

  const items = getPaginationItems(page, totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-hairline px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <p
        className="text-center text-sm tabular-nums text-ink-muted sm:text-left"
        aria-live="polite"
      >
        {t('pagination.pageOf', { page, totalPages })}
      </p>
      <Pagination aria-label={t('pagination.label')} className="sm:w-auto sm:justify-end">
        <PaginationContent className="gap-1.5">
          <PaginationItem>
            <PaginationPrevious
              text={t('pagination.previous')}
              aria-label={t('pagination.previousAria')}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
          </PaginationItem>

          {items.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis label={t('pagination.ellipsis')} />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationButton
                  isActive={item === page}
                  aria-label={t('pagination.goToPage', { page: item })}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PaginationButton>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              text={t('pagination.next')}
              aria-label={t('pagination.nextAria')}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function TicketRecords({
  records,
  inventoryTab,
  onEdit,
  onDelete,
  pagination,
  headerAction,
}: {
  records: TicketRecordItem[]
  inventoryTab: TicketTab
  onEdit?: (record: TicketRecordItem) => void
  onDelete?: (record: TicketRecordItem) => void
  pagination?: TicketRecordsPagination
  headerAction?: ReactNode
}) {
  const { t } = useTranslation('tickets')
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [recordToView, setRecordToView] = useState<TicketRecordItem | null>(null)

  const registryCount = pagination?.total ?? records.length
  const registrySubtitle =
    registryCount > 0 ? t('table.registryCount', { count: registryCount }) : null

  const handleViewRecord = (record: TicketRecordItem) => {
    setRecordToView(record)
    setViewDialogOpen(true)
  }

  const handleEditRecord = (record: TicketRecordItem) => {
    onEdit?.(record)
  }

  const handleDeleteRecord = (record: TicketRecordItem) => {
    onDelete?.(record)
  }

  const handleViewDialogOpenChange = (open: boolean) => {
    setViewDialogOpen(open)
    if (!open) {
      setRecordToView(null)
    }
  }

  return (
    <>
      <section aria-labelledby="ticket-inventory-heading">
        <header className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2
              id="ticket-inventory-heading"
              className="font-heading text-lg font-semibold text-ink sm:text-xl"
            >
              {t('table.title')}
            </h2>
            {registrySubtitle ? (
              <p className="mt-1 text-sm text-ink-muted">{registrySubtitle}</p>
            ) : null}
          </div>
          {headerAction}
        </header>

        {records.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-heading text-base font-semibold text-ink">
              {inventoryTab === TICKET_TAB.ACTIVE
                ? t('table.emptyActiveTitle')
                : t('table.emptyInactiveTitle')}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              {inventoryTab === TICKET_TAB.ACTIVE
                ? t('table.emptyActiveDescription')
                : t('table.emptyInactiveDescription')}
            </p>
          </div>
        ) : (
          <Card variant="gradient">
            <Table variant="compact" className="min-w-270">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-6">{t('table.event')}</TableHead>
                  <TableHead className="p-6">{t('table.location')}</TableHead>
                  <TableHead className="p-6">{t('table.ticketType')}</TableHead>
                  <TableHead className="p-6">{t('table.price')}</TableHead>
                  <TableHead className="p-6">{t('table.quantity')}</TableHead>
                  <TableHead className="p-6">{t('table.totalSold')}</TableHead>
                  <TableHead className="p-6">{t('table.revenue')}</TableHead>
                  <TableHead className="p-6 text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TicketRecordRow
                    key={record.id}
                    record={record}
                    onView={handleViewRecord}
                    onEdit={handleEditRecord}
                    onDelete={handleDeleteRecord}
                  />
                ))}
              </TableBody>
            </Table>
            {pagination ? <TicketRecordsPaginationBar pagination={pagination} /> : null}
          </Card>
        )}
      </section>

      <TicketViewDialog
        record={recordToView}
        open={viewDialogOpen}
        onOpenChange={handleViewDialogOpenChange}
      />
    </>
  )
}
