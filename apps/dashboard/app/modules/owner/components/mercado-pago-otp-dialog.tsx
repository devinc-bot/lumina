import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
} from '@repo/ui'
import type { OtpChallengeResponse } from '@repo/types'

type MercadoPagoOtpDialogProps = {
  challenge: OtpChallengeResponse
  isVerifying: boolean
  isResending: boolean
  hasError: boolean
  errorMessage: string
  onCancel: () => void
  onCodeChange: () => void
  onResend: () => void
  onVerify: (code: string) => void
}

export function MercadoPagoOtpDialog({
  challenge,
  isVerifying,
  isResending,
  hasError,
  errorMessage,
  onCancel,
  onCodeChange,
  onResend,
  onVerify,
}: MercadoPagoOtpDialogProps) {
  const { t, i18n } = useTranslation('settings')
  const [code, setCode] = useState('')
  const isBusy = isVerifying || isResending

  const handleOpenChange = (open: boolean) => {
    if (!open && !isBusy) onCancel()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (code.length === 6) onVerify(code)
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        persistent={isBusy}
        showCloseButton={!isBusy}
        closeLabel={t('owner.mercadoPago.otp.cancel')}
      >
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{t('owner.mercadoPago.otp.title')}</DialogTitle>
            <DialogDescription>
              {t('owner.mercadoPago.otp.sent', { email: challenge.maskedDestination })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-on-surface-variant">
              {t('owner.mercadoPago.otp.expires', {
                date: new Date(challenge.expiresAt).toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
            <Label htmlFor="mercado-pago-otp" variant="field">
              {t('owner.mercadoPago.otp.label')}
            </Label>
            <div className="mt-4 flex flex-col items-center space-y-3">
              <InputOTP
                id="mercado-pago-otp"
                value={code}
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                inputMode="numeric"
                disabled={isBusy}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'mercado-pago-otp-error' : undefined}
                onChange={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, 6))
                  onCodeChange()
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} aria-invalid={hasError} />
                  <InputOTPSlot index={1} aria-invalid={hasError} />
                  <InputOTPSlot index={2} aria-invalid={hasError} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} aria-invalid={hasError} />
                  <InputOTPSlot index={4} aria-invalid={hasError} />
                  <InputOTPSlot index={5} aria-invalid={hasError} />
                </InputOTPGroup>
              </InputOTP>
              {hasError ? (
                <p id="mercado-pago-otp-error" role="alert" className="text-sm text-error">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={onResend}
              loading={isResending}
              disabled={isBusy}
            >
              {t('owner.mercadoPago.otp.resend')}
            </Button>
            <div className="flex flex-1 items-center justify-end gap-3 sm:justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
                {t('owner.mercadoPago.otp.cancel')}
              </Button>
              <Button type="submit" loading={isVerifying} disabled={isBusy || code.length !== 6}>
                {t('owner.mercadoPago.otp.verify')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
