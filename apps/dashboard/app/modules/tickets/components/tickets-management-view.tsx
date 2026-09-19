import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { TICKET_SALES_FILTER, type TicketSalesFilter } from '@repo/types'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@repo/ui'
import { TicketPlus } from 'lucide-react'
import { TicketRemoveDialog } from '~/modules/tickets/components/dialog-remove-ticket'
import {
  type TicketRecordItem,
  type TicketRecordsPagination,
  TicketRecords,
} from '~/modules/tickets/components/ticket-record'
import {
  TICKET_SALES_FILTER_OPTION,
  TICKET_SALES_FILTER_OPTIONS,
  type TicketSalesFilterOption,
} from '~/modules/tickets/constants/tickets-sales-filter.constants'
import { TICKET_TAB, type TicketTab } from '~/modules/tickets/constants/tickets-tabs.constants'
import { useDeleteTicket } from '~/modules/tickets/mutation/use-ticket-mutations'
import { useTickets } from '~/modules/tickets/queries/use-ticket-queries'
import { ticketResponseToRecordItem } from '~/modules/tickets/utils/ticket-form.formatter'
import { PageLayout } from '~/modules/common/components/page-layout'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'

const TICKETS_PAGE_SIZE = 10

function toApiSalesFilter(option: TicketSalesFilterOption): TicketSalesFilter | undefined {
  if (option === TICKET_SALES_FILTER_OPTION.SOLD) return TICKET_SALES_FILTER.SOLD
  if (option === TICKET_SALES_FILTER_OPTION.UNSOLD) return TICKET_SALES_FILTER.UNSOLD
  return undefined
}

function isTicketSalesFilterOption(value: string): value is TicketSalesFilterOption {
  return TICKET_SALES_FILTER_OPTIONS.includes(value as TicketSalesFilterOption)
}

export function TicketsManagementView() {
  const { t } = useTranslation('tickets')
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TicketTab>(TICKET_TAB.ACTIVE)
  const [salesFilter, setSalesFilter] = useState<TicketSalesFilterOption>(
    TICKET_SALES_FILTER_OPTION.ALL
  )
  const [page, setPage] = useState(1)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [recordToRemove, setRecordToRemove] = useState<TicketRecordItem | null>(null)
  const deleteTicketMutation = useDeleteTicket()

  const status = activeTab

  const { data } = useTickets({
    status,
    page,
    limit: TICKETS_PAGE_SIZE,
    salesFilter: toApiSalesFilter(salesFilter),
  })

  const records = useMemo(
    () => (data?.data ?? []).map((ticket) => ticketResponseToRecordItem(ticket)),
    [data]
  )

  const pagination: TicketRecordsPagination | undefined = data
    ? {
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        onPageChange: setPage,
      }
    : undefined

  const handleEditRecord = (record: TicketRecordItem) => {
    void navigate({
      to: '/tickets/$documentId/edit',
      params: { documentId: record.id },
    })
  }

  const openRemoveDialog = (record: TicketRecordItem) => {
    setRecordToRemove(record)
    setRemoveDialogOpen(true)
  }

  const handleRemoveDialogOpenChange = (open: boolean) => {
    setRemoveDialogOpen(open)
    if (!open) {
      setRecordToRemove(null)
    }
  }

  const handleRemoveConfirm = async (record: TicketRecordItem) => {
    try {
      await deleteTicketMutation.mutateAsync(record.id)
      toast.success(t('delete.success'))
      setRemoveDialogOpen(false)
      setRecordToRemove(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('delete.error'))
    }
  }

  const ticketRecordsProps = {
    records,
    onEdit: handleEditRecord,
    onDelete: openRemoveDialog,
    pagination,
    headerAction: (
      <Button asChild className="w-full shrink-0 sm:w-auto">
        <Link to={DASHBOARD_ROUTES.ticketsNew()}>
          <TicketPlus aria-hidden="true" />
          {t('form.trigger')}
        </Link>
      </Button>
    ),
  }

  return (
    <PageLayout title={t('page.title')} description={t('page.description')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as TicketTab)
          setPage(1)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            <TabsTrigger variant="line" value={TICKET_TAB.ACTIVE}>
              {t('tabs.active')}
            </TabsTrigger>
            <TabsTrigger variant="line" value={TICKET_TAB.INACTIVE}>
              {t('tabs.inactive')}
            </TabsTrigger>
          </TabsList>

          <Select
            value={salesFilter}
            onValueChange={(value) => {
              if (isTicketSalesFilterOption(value)) {
                setSalesFilter(value)
                setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-52" aria-label={t('filters.sales.ariaLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_SALES_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`filters.sales.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={TICKET_TAB.ACTIVE} className="mt-0">
          <TicketRecords inventoryTab={TICKET_TAB.ACTIVE} {...ticketRecordsProps} />
        </TabsContent>

        <TabsContent value={TICKET_TAB.INACTIVE} className="mt-0">
          <TicketRecords inventoryTab={TICKET_TAB.INACTIVE} {...ticketRecordsProps} />
        </TabsContent>
      </Tabs>

      <TicketRemoveDialog
        record={recordToRemove}
        open={removeDialogOpen}
        onOpenChange={handleRemoveDialogOpenChange}
        onConfirm={handleRemoveConfirm}
        isRemoving={deleteTicketMutation.isPending}
      />
    </PageLayout>
  )
}
