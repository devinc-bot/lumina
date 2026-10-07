import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { SessionLoading } from '../../common/components/session-loading'
import { QUERY_KEYS } from '../../common/constants/query-keys'
import { WEB_ROUTES } from '../../common/constants/routes'
import { getPendingLegalAcceptance } from '../services/legal-documents.service'
import { WebErrorBoundaryView } from '../../common/components/route-error-views'

export function RequireCurrentLegalAcceptance({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAcceptancePage = pathname === WEB_ROUTES.legalAcceptance()
  const pending = useQuery({
    queryKey: QUERY_KEYS.pendingLegalAcceptance,
    queryFn: getPendingLegalAcceptance,
  })

  useEffect(() => {
    if (!pending.isSuccess) {
      return
    }

    const isStale = pending.data.staleTypes.length > 0
    if (isStale && !isAcceptancePage) {
      void navigate({ to: WEB_ROUTES.legalAcceptance(), replace: true })
    }
    if (!isStale && isAcceptancePage) {
      void navigate({ to: WEB_ROUTES.events(), replace: true })
    }
  }, [isAcceptancePage, navigate, pending.data, pending.isSuccess])

  if (pending.isPending) {
    return <SessionLoading />
  }

  if (pending.isError) {
    return (
      <WebErrorBoundaryView
        error={pending.error instanceof Error ? pending.error : new Error('pending legal')}
        reset={() => {
          void pending.refetch()
        }}
      />
    )
  }

  if (pending.data.staleTypes.length > 0 && !isAcceptancePage) {
    return <SessionLoading />
  }

  return children
}
