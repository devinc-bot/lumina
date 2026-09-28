import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  ORGANIZATION_PAYMENT_CONNECTION_STATUS,
  type MercadoPagoSettlementTerm,
  type OrganizationPaymentConnectionStatus,
} from '@repo/types'
import { FormSection } from '~/modules/common/components/form-section'
import {
  disconnectMercadoPagoConnection,
  getMercadoPagoConnection,
  startMercadoPagoConnection,
  updateMercadoPagoSettlementTerm,
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

export function MercadoPagoConnectionSection() {
  const { t, i18n } = useTranslation('settings')
  const queryClient = useQueryClient()
  const connectionQuery = useQuery({
    queryKey: MERCADO_PAGO_CONNECTION_QUERY_KEY,
    queryFn: getMercadoPagoConnection,
  })
  const connectMutation = useMutation({
    mutationFn: startMercadoPagoConnection,
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
  })
  const disconnectMutation = useMutation({
    mutationFn: disconnectMercadoPagoConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MERCADO_PAGO_CONNECTION_QUERY_KEY }),
  })
  const settlementTermMutation = useMutation({
    mutationFn: updateMercadoPagoSettlementTerm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mercado-pago'] }),
  })
  const statusKey = getConnectionStatusKey(connectionQuery.data?.status)
  const isConnected =
    connectionQuery.data?.status === ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED

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
          {connectionQuery.isError ||
          connectMutation.isError ||
          disconnectMutation.isError ||
          settlementTermMutation.isError ? (
            <p role="alert" className="mt-2 text-sm text-error">
              {t('owner.mercadoPago.error')}
            </p>
          ) : null}
        </div>
        {isConnected ? (
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
    </FormSection>
  )
}
