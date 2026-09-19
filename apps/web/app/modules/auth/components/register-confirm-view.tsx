import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui'
import { WEB_ROUTES } from '../../common/constants/routes'
import { useConfirmUserRegistration } from '../mutations/use-auth-mutations'

type RegisterConfirmViewProps = {
  token: string
}

export function RegisterConfirmView({ token }: RegisterConfirmViewProps) {
  const { t } = useTranslation('auth')
  const confirm = useConfirmUserRegistration()
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
      <div className="w-full">
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-on-surface md:text-4xl">
          {t('register.confirm.expiredTitle')}
        </h1>
        <p role="alert" className="mt-3 text-sm leading-relaxed text-error">
          {errorMessage || t('register.confirm.invalidToken')}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          {t('register.confirm.expiredDescription')}
        </p>
        <div className="mt-10 flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to={WEB_ROUTES.register()}>{t('register.confirm.backToRegister')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to={WEB_ROUTES.login()}>{t('register.confirm.goToLogin')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-on-surface md:text-4xl">
        {t('register.confirm.title')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        {t('register.confirm.loading')}
      </p>
    </div>
  )
}
