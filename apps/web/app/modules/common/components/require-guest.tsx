import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SessionLoading } from '~/modules/common/components/session-loading'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { useSession } from '~/modules/common/hooks/use-session'

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated } = useSession()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: WEB_ROUTES.events(), replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return <SessionLoading />
  }

  if (isAuthenticated) {
    return null
  }

  return children
}
