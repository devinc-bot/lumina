import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiErrorRecordResponse } from '@repo/types'
import { ErrorDeleteDialog } from '~/modules/errors/components/error-delete-dialog'
import { ErrorRecordDetail } from '~/modules/errors/components/error-record-detail'
import {
  ErrorsFilters,
  FILTER_ALL,
  type ErrorRecordsFilters,
} from '~/modules/errors/components/errors-filters'
import { ErrorsTable, type ErrorRecordsPagination } from '~/modules/errors/components/errors-table'
import { useDeleteApiErrorRecord } from '~/modules/errors/mutations/use-delete-api-error-record'
import { useApiErrorRecords } from '~/modules/errors/queries/use-errors-queries'
import { dateInputToEndOfDay, dateInputToStartOfDay } from '~/modules/errors/utils/errors.formatter'

const ERRORS_PAGE_SIZE = 10

const DEFAULT_FILTERS: ErrorRecordsFilters = {
  statusCode: FILTER_ALL,
  path: '',
  from: '',
  to: '',
}

export function ErrorsView() {
  const { t } = useTranslation('admin')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ErrorRecordsFilters>(DEFAULT_FILTERS)
  const [selected, setSelected] = useState<ApiErrorRecordResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiErrorRecordResponse | null>(null)
  const deleteRecord = useDeleteApiErrorRecord()

  const hasActiveFilters =
    filters.statusCode !== FILTER_ALL ||
    filters.path !== '' ||
    filters.from !== '' ||
    filters.to !== ''

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handleFiltersChange(nextFilters: ErrorRecordsFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  const { data, isError, isLoading, refetch } = useApiErrorRecords({
    page,
    limit: ERRORS_PAGE_SIZE,
    statusCode: filters.statusCode === FILTER_ALL ? undefined : Number(filters.statusCode),
    path: filters.path || undefined,
    from: dateInputToStartOfDay(filters.from),
    to: dateInputToEndOfDay(filters.to),
  })

  const pagination: ErrorRecordsPagination | undefined = data
    ? {
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        onPageChange: setPage,
      }
    : undefined

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteRecord.mutate(deleteTarget.documentId, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 py-2">
        <h1 className="font-heading text-2xl font-semibold text-ink">{t('sections.errors')}</h1>
        <p className="text-sm text-ink-muted">{t('errors.description')}</p>
      </header>

      <ErrorsFilters filters={filters} onChange={handleFiltersChange} onReset={resetFilters} />

      <ErrorsTable
        records={data?.data ?? []}
        pagination={pagination}
        isLoading={isLoading}
        isError={isError}
        hasActiveFilters={hasActiveFilters}
        pendingDocumentId={deleteRecord.variables}
        onRetry={() => void refetch()}
        onSelect={setSelected}
        onDelete={setDeleteTarget}
      />

      <ErrorRecordDetail record={selected} onOpenChange={(open) => !open && setSelected(null)} />

      <ErrorDeleteDialog
        record={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteRecord.isPending}
      />
    </div>
  )
}
