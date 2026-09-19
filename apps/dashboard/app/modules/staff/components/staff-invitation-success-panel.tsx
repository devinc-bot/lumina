import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, toast } from '@repo/ui'
import { Check, Copy } from 'lucide-react'
import { STAFF_INVITATION_EXPIRY_OPTIONS } from '@repo/validators'
import type { StaffInvitationSuccess } from '~/modules/staff/components/staff-user-form'
import { formatInvitationTimeRemaining } from '~/modules/staff/utils/staff-invitation.utils'

type StaffInvitationSuccessPanelProps = {
  invitation: StaffInvitationSuccess
  onClose: () => void
}

export function StaffInvitationSuccessPanel({
  invitation,
  onClose,
}: StaffInvitationSuccessPanelProps) {
  const { t } = useTranslation('staff')
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(() =>
    formatInvitationTimeRemaining(invitation.expiresAt)
  )
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeRemaining(formatInvitationTimeRemaining(invitation.expiresAt))
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [invitation.expiresAt])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.url)
      setCopied(true)
      toast.success(t('invitation.copied'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('form.error'))
    }
  }

  const isExpired = invitation.expiresAt <= now
  const hasSecurityWord = invitation.hasSecurityWord
  const expiryDuration =
    (
      {
        [STAFF_INVITATION_EXPIRY_OPTIONS['12h']]: t('form.expires12h'),
        [STAFF_INVITATION_EXPIRY_OPTIONS['24h']]: t('form.expires24h'),
        [STAFF_INVITATION_EXPIRY_OPTIONS['48h']]: t('form.expires48h'),
        [STAFF_INVITATION_EXPIRY_OPTIONS['7d']]: t('form.expires7d'),
      } as Record<number, string>
    )[invitation.expiresInMs] ?? t('form.expires48h')

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
        <div>
          <h3 className="font-heading text-lg font-semibold text-ink">
            {t('invitation.successTitle')}
          </h3>
          <p className="mt-2 text-sm text-ink-muted">
            {t('invitation.successDescription', { duration: expiryDuration })}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="staff-invitation-link" className="text-sm font-medium text-ink">
            {t('invitation.linkLabel')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="staff-invitation-link"
              readOnly
              value={invitation.url}
              className="font-mono text-xs sm:text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              iconLeft={copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              onClick={() => void handleCopy()}
            >
              {copied ? t('invitation.copied') : t('invitation.copy')}
            </Button>
          </div>
        </div>

        <p className={isExpired ? 'text-sm font-medium text-error' : 'text-sm text-ink-muted'}>
          {isExpired ? t('invitation.expired') : t('invitation.expiresIn', { time: timeRemaining })}
        </p>

        {hasSecurityWord ? (
          <p className="text-sm text-ink-muted">{t('invitation.securityWordNote')}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-hairline px-6 py-6 sm:px-8">
        <Button type="button" className="w-full sm:ml-auto sm:w-auto" onClick={onClose}>
          {t('invitation.close')}
        </Button>
      </div>
    </div>
  )
}
