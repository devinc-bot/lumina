import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui'
import { DASHBOARD_ROUTES } from '../../common/constants/routes'
import { useConfirmOwnerRegistration } from '../mutations/use-auth-mutations'

type RegisterConfirmViewProps = {
  token: string
}

export function RegisterConfirmView({ token }: RegisterConfirmViewProps) {
  const { t } = useTranslation('auth')
  const confirm = useConfirmOwnerRegistration()
  const startedRef = useRef(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || startedRef.current) return
    startedRef.current = true

    void confirm.mutateAsync({ token }).catch((error: unknown) => {
      const message =
        error instanceof Error && error.message ? error.message : t('register.confirm.invalidToken')
      setLocalError(message)
    })
  }, [confirm, token, t])

  const errorMessage = localError ?? (confirm.isError ? confirm.error.message : null)

  if (!token || errorMessage) {
    return (
      <div className="space-y-7">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-balance text-on-surface">
            {t('register.confirm.expiredTitle')}
          </h2>
          <p role="alert" className="mt-3 text-sm leading-relaxed text-error">
            {errorMessage || t('register.confirm.invalidToken')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            {t('register.confirm.expiredDescription')}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to={DASHBOARD_ROUTES.register()}>{t('register.confirm.backToRegister')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to={DASHBOARD_ROUTES.login()}>{t('register.confirm.goToLogin')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <h2 className="font-display text-2xl font-bold tracking-tight text-balance text-on-surface">
        {t('register.confirm.title')}
      </h2>
      <p className="text-sm leading-relaxed text-on-surface-variant">
        {t('register.confirm.loading')}
      </p>
    </div>
  )
}
