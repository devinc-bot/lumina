import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminUserListItemResponse } from '@repo/types'
import { useAdminUsers } from '~/modules/users/queries/use-users-queries'
import { useUpdateAdminUserStatus } from '~/modules/users/mutations/use-update-admin-user-status'
import {
  FILTER_ALL,
  UsersFilters,
  type AdminUsersFilters,
} from '~/modules/users/components/users-filters'
import { UsersTable, type AdminUsersPagination } from '~/modules/users/components/users-table'
import { UserDetail } from '~/modules/users/components/user-detail'
import { type AdminUserRole } from '~/modules/users/constants/admin-user-roles'

const USERS_PAGE_SIZE = 10

const DEFAULT_FILTERS: AdminUsersFilters = {
  email: '',
  role: FILTER_ALL,
}

export function UsersView() {
  const { t } = useTranslation('admin')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AdminUsersFilters>(DEFAULT_FILTERS)
  const [selected, setSelected] = useState<AdminUserListItemResponse | null>(null)
  const updateStatus = useUpdateAdminUserStatus()

  const hasActiveFilters = filters.email.trim() !== '' || filters.role !== FILTER_ALL

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handleFiltersChange(nextFilters: AdminUsersFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  const { data, isError, isLoading, refetch } = useAdminUsers({
    page,
    limit: USERS_PAGE_SIZE,
    email: filters.email.trim() || undefined,
    role: filters.role === FILTER_ALL ? undefined : (filters.role as AdminUserRole),
  })

  const pagination: AdminUsersPagination | undefined = data
    ? {
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        onPageChange: setPage,
      }
    : undefined

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 py-2">
        <h1 className="font-heading text-2xl font-semibold text-ink">{t('sections.users')}</h1>
        <p className="text-sm text-ink-muted">{t('users.description')}</p>
      </header>

      <UsersFilters filters={filters} onChange={handleFiltersChange} onReset={resetFilters} />

      <UsersTable
        users={data?.data ?? []}
        pagination={pagination}
        isLoading={isLoading}
        isError={isError}
        hasActiveFilters={hasActiveFilters}
        pendingDocumentId={updateStatus.variables?.documentId}
        onRetry={() => void refetch()}
        onSelect={setSelected}
        onStatusChange={(documentId, status) => updateStatus.mutate({ documentId, status })}
      />

      <UserDetail user={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
