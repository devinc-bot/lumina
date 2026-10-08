import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui'
import {
  MERCADO_PAGO_SETTLEMENT_FEE_BPS,
  MERCADO_PAGO_SETTLEMENT_TERM,
  MERCADO_PAGO_OTP_ERROR_MESSAGE,
  OTP_TYPE,
  ORGANIZATION_PAYMENT_CONNECTION_STATUS,
  type MercadoPagoSettlementTerm,
  type OtpChallengeResponse,
  type OrganizationPaymentConnectionStatus,
} from '@repo/types'
import { FormSection } from '~/modules/common/components/form-section'
import { MercadoPagoOtpDialog } from './mercado-pago-otp-dialog'
import {
  getMercadoPagoConnection,
  requestMercadoPagoConnectionOtp,
  requestMercadoPagoDisconnectionOtp,
  updateMercadoPagoSettlementTerm,
  verifyMercadoPagoConnectionOtp,
  verifyMercadoPagoDisconnectionOtp,
} from '~/modules/owner/services/mercado-pago-connection.service'

const MERCADO_PAGO_CONNECTION_QUERY_KEY = ['mercado-pago', 'connection'] as const
const MERCADO_PAGO_SETTLEMENT_TERMS = [
  MERCADO_PAGO_SETTLEMENT_TERM.INSTANT,
  MERCADO_PAGO_SETTLEMENT_TERM.DAYS_10,
  MERCADO_PAGO_SETTLEMENT_TERM.DAYS_18,
  MERCADO_PAGO_SETTLEMENT_TERM.DAYS_35,
] as const

function getConnectionStatusKey(status: OrganizationPaymentConnectionStatus | undefined) {
  if (status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED) return 'connected'
  if (status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTING) return 'connecting'
  if (status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.REFRESH_FAILED) return 'refreshFailed'
  if (status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.RECONNECT_REQUIRED)
    return 'reconnectRequired'
  if (status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.DISCONNECT_PENDING)
    return 'disconnectPending'
  return 'disconnected'
}

function getErrorMessage(
  error: unknown,
  messages: { fallback: string; invalidOrExpired: string; requestLimitReached: string }
): string {
  if (!(error instanceof Error)) return messages.fallback

  if (error.message === MERCADO_PAGO_OTP_ERROR_MESSAGE.INVALID_OR_EXPIRED) {
    return messages.invalidOrExpired
  }
  if (error.message === MERCADO_PAGO_OTP_ERROR_MESSAGE.REQUEST_LIMIT_REACHED) {
    return messages.requestLimitReached
  }
  return messages.fallback
}

export function MercadoPagoConnectionSection() {
  const { t, i18n } = useTranslation('settings')
  const queryClient = useQueryClient()
  const connectionQuery = useQuery({
    queryKey: MERCADO_PAGO_CONNECTION_QUERY_KEY,
    queryFn: getMercadoPagoConnection,
  })
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(null)
  const connectMutation = useMutation({
    mutationFn: requestMercadoPagoConnectionOtp,
    onSuccess: setChallenge,
  })
  const disconnectMutation = useMutation({
    mutationFn: requestMercadoPagoDisconnectionOtp,
    onSuccess: setChallenge,
  })
  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!challenge) throw new Error('Missing OTP challenge')
      const input = { otpDocumentId: challenge.otpDocumentId, code }
      return challenge.type === OTP_TYPE.MERCADO_PAGO_CONNECTION
        ? verifyMercadoPagoConnectionOtp(input)
        : verifyMercadoPagoDisconnectionOtp(input)
    },
    onSuccess: (result) => {
      if (challenge?.type === OTP_TYPE.MERCADO_PAGO_CONNECTION) {
        window.location.assign((result as { authorizationUrl: string }).authorizationUrl)
        return
      }
      setChallenge(null)
      queryClient.invalidateQueries({ queryKey: MERCADO_PAGO_CONNECTION_QUERY_KEY })
    },
  })
  const settlementTermMutation = useMutation({
    mutationFn: updateMercadoPagoSettlementTerm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mercado-pago'] }),
  })
  const statusKey = getConnectionStatusKey(connectionQuery.data?.status)
  const isConnected =
    connectionQuery.data?.status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED
  const connectionError =
    connectionQuery.error ??
    connectMutation.error ??
    disconnectMutation.error ??
    verifyMutation.error ??
    settlementTermMutation.error
  const errorMessage = getErrorMessage(connectionError, {
    fallback: t('owner.mercadoPago.error'),
    invalidOrExpired: t('owner.mercadoPago.otp.errors.invalidOrExpired'),
    requestLimitReached: t('owner.mercadoPago.otp.errors.requestLimitReached'),
  })

  return (
    <FormSection
      id="mercado-pago-connection"
      title={t('owner.mercadoPago.title')}
      description={t('owner.mercadoPago.description')}
    >
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-on-surface">
            {connectionQuery.isLoading
              ? t('owner.mercadoPago.loading')
              : t(`owner.mercadoPago.status.${statusKey}`)}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t(`owner.mercadoPago.hint.${statusKey}`)}
          </p>
          {isConnected ? (
            <div className="mt-4 grid max-w-sm gap-2">
              <Label htmlFor="mercado-pago-settlement-term" variant="field">
                {t('owner.mercadoPago.settlementTerm.label')}
              </Label>
              <Select
                value={connectionQuery.data?.settlementTerm}
                onValueChange={(value) =>
                  settlementTermMutation.mutate(value as MercadoPagoSettlementTerm)
                }
                disabled={settlementTermMutation.isPending}
              >
                <SelectTrigger id="mercado-pago-settlement-term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MERCADO_PAGO_SETTLEMENT_TERMS.map((settlementTerm) => (
                    <SelectItem key={settlementTerm} value={settlementTerm}>
                      {t(`owner.mercadoPago.settlementTerm.options.${settlementTerm}`, {
                        rate: (
                          MERCADO_PAGO_SETTLEMENT_FEE_BPS[settlementTerm] / 100
                        ).toLocaleString(i18n.language, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                {t('owner.mercadoPago.settlementTerm.hint')}
              </p>
            </div>
          ) : null}
          {connectionError ? (
            <p role="alert" className="mt-2 text-sm text-error">
              {errorMessage}
            </p>
          ) : null}
        </div>
        {challenge ? null : isConnected ? (
          <Button
            type="button"
            variant="outline"
            loading={disconnectMutation.isPending}
            onClick={() => disconnectMutation.mutate()}
          >
            {t('owner.mercadoPago.disconnect')}
          </Button>
        ) : (
          <Button
            type="button"
            loading={connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {statusKey === 'reconnectRequired' || statusKey === 'refreshFailed'
              ? t('owner.mercadoPago.reconnect')
              : t('owner.mercadoPago.connect')}
          </Button>
        )}
      </Card>
      {challenge ? (
        <MercadoPagoOtpDialog
          key={challenge.otpDocumentId}
          challenge={challenge}
          isVerifying={verifyMutation.isPending}
          isResending={connectMutation.isPending || disconnectMutation.isPending}
          hasError={verifyMutation.isError || connectMutation.isError || disconnectMutation.isError}
          errorMessage={errorMessage}
          onCancel={() => setChallenge(null)}
          onCodeChange={verifyMutation.reset}
          onResend={() =>
            challenge.type === OTP_TYPE.MERCADO_PAGO_CONNECTION
              ? connectMutation.mutate()
              : disconnectMutation.mutate()
          }
          onVerify={(code) => verifyMutation.mutate(code)}
        />
      ) : null}
    </FormSection>
  )
}
