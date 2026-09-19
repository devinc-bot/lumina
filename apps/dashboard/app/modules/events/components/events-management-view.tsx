import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, toast } from '@repo/ui'
import { CalendarPlus } from 'lucide-react'
import { EventRemoveDialog } from '~/modules/events/components/dialog-remove-event'
import {
  type EventRecordItem,
  type EventRecordsPagination,
  EventRecords,
} from '~/modules/events/components/event-record'
import { useDeleteEvent } from '~/modules/events/mutation/use-event-mutations'
import { useEvents } from '~/modules/events/queries/use-event-queries'
import { eventResponseToRecordItem } from '~/modules/events/utils/event-form.mapper'
import { PageLayout } from '~/modules/common/components/page-layout'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'

const EVENTS_PAGE_SIZE = 10

export function EventsManagementView() {
  const { t } = useTranslation('events')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [recordToRemove, setRecordToRemove] = useState<EventRecordItem | null>(null)
  const deleteEventMutation = useDeleteEvent()

  const { data, isLoading, isError, refetch } = useEvents({ page, limit: EVENTS_PAGE_SIZE })

  const records = useMemo(
    () => (data?.data ?? []).map((event) => eventResponseToRecordItem(event)),
    [data]
  )

  const pagination: EventRecordsPagination | undefined = data
    ? {
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        onPageChange: setPage,
      }
    : undefined

  const handleEditRecord = (record: EventRecordItem) => {
    void navigate({
      to: '/events/$documentId/edit',
      params: { documentId: record.id },
    })
  }

  const openRemoveDialog = (record: EventRecordItem) => {
    setRecordToRemove(record)
    setRemoveDialogOpen(true)
  }

  const handleRemoveDialogOpenChange = (open: boolean) => {
    setRemoveDialogOpen(open)
    if (!open) {
      setRecordToRemove(null)
    }
  }

  const handleRemoveConfirm = async (record: EventRecordItem) => {
    try {
      await deleteEventMutation.mutateAsync(record.id)
      toast.success(t('delete.success'))
      setRemoveDialogOpen(false)
      setRecordToRemove(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('delete.error'))
    }
  }

  return (
    <PageLayout title={t('page.title')} description={t('page.description')}>
      <EventRecords
        records={records}
        pagination={pagination}
        onEdit={handleEditRecord}
        onDelete={openRemoveDialog}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        headerAction={
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link to={DASHBOARD_ROUTES.eventsNew()}>
              <CalendarPlus aria-hidden="true" />
              {t('form.trigger')}
            </Link>
          </Button>
        }
      />

      <EventRemoveDialog
        record={recordToRemove}
        open={removeDialogOpen}
        onOpenChange={handleRemoveDialogOpenChange}
        onConfirm={handleRemoveConfirm}
        isRemoving={deleteEventMutation.isPending}
      />
    </PageLayout>
  )
}
