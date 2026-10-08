import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import { resolvePostAuthPath } from '~/modules/legal-documents/services/legal-documents.service'
import { refreshAuthSession } from '~/modules/common/services/session.service'
import { useSessionStore } from '~/modules/common/stores/session.store'
import { saveAuthSession } from '~/modules/auth/utils/auth-storage.utils'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function complete() {
      try {
        saveAuthSession(await refreshAuthSession())
        await useSessionStore.getState().loadSession()
        const to = await resolvePostAuthPath(DASHBOARD_ROUTES.home())
        await navigate({ to: to as '/dashboard' | '/legal-acceptance', replace: true })
      } catch {
        await navigate({
          to: DASHBOARD_ROUTES.login(),
          search: { error: 'google_failed' },
          replace: true,
        })
      }
    }

    void complete()
  }, [navigate])

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <p className="text-sm text-on-surface-variant">{t('login.submitting')}</p>
    </main>
  )
}
