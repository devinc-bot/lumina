import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '~/modules/common/components/app-shell'
import { AppErrorBoundaryView } from '~/modules/common/components/error-boundary-view'
import { RequireSession } from '~/modules/common/components/require-session'
import { RolesGuard } from '~/modules/common/components/roles-guard'
import { RequireCurrentLegalAcceptance } from '~/modules/legal-documents/components/require-current-legal-acceptance'

export const Route = createFileRoute('/_app')({
  errorComponent: ({ error, reset }) => {
    const routeError = error instanceof Error ? error : new Error(String(error))

    return <AppErrorBoundaryView error={routeError} reset={reset} />
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <RequireSession>
      <RequireCurrentLegalAcceptance>
        <AppShell>
          <RolesGuard>
            <Outlet />
          </RolesGuard>
        </AppShell>
      </RequireCurrentLegalAcceptance>
    </RequireSession>
  )
}
