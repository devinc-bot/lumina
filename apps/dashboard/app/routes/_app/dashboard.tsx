import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { USER_ROLE } from '@repo/types'
import { Loader } from '@repo/ui'
import { useSession } from '~/modules/common/hooks/use-session'
import { OwnerPanelView } from '~/modules/owner'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === USER_ROLE.STAFF) {
      void navigate({ to: DASHBOARD_ROUTES.qrTicket(), replace: true })
    }
  }, [navigate, user?.role])

  if (user?.role === USER_ROLE.OWNER) {
    return <OwnerPanelView />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <Loader size={24} />
      </div>
    )
  }

  return null
}
