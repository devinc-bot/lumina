import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { WebhookSignatureValidator } from 'mercadopago'
import {
  findConnectedMercadoPagoConnectionBySellerId,
  findMercadoPagoPaymentCredentialSnapshotBySellerId,
  reconcileMercadoPagoPayment,
} from '@repo/db'
import { TranslationService } from '@repo/i18n/server'
import { ORDER_ERROR_CODE } from '@repo/i18n/constants'
import { MERCADO_PAGO_NOTIFICATION_TYPE, type MercadoPagoNotificationType } from '@repo/types'
import { ENV } from '../../../config/env'
import { decryptMercadoPagoCredential } from '../mercado-pago-credential-crypto'
import type { MercadoPagoCheckoutProPort } from '../mercado-pago-checkout-pro.port'
import { MercadoPagoCredentialResolver } from './mercado-pago-credential-resolver'
import {
  MERCADO_PAGO_CHECKOUT_PRO_PORT,
  MERCADO_PAGO_CREDENTIAL_RESOLVER,
} from '../mercado-pago.tokens'

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60
const CREDENTIAL_EXPIRY_SKEW_MS = 60_000
const WEBHOOK_PROCESSING_FAILURE_MESSAGE = 'Mercado Pago webhook processing failed'

const WEBHOOK_PROCESSING_STAGE = {
  CREDENTIAL_LOOKUP: 'credential_lookup',
  CREDENTIAL_RESOLUTION: 'credential_resolution',
  PROVIDER_PAYMENT: 'provider_payment',
  RECONCILIATION: 'reconciliation',
} as const

type WebhookProcessingStage =
  (typeof WEBHOOK_PROCESSING_STAGE)[keyof typeof WEBHOOK_PROCESSING_STAGE]

type MercadoPagoWebhookPayload = {
  data?: { id?: string | number }
  resource?: string
  topic?: string
  type?: MercadoPagoNotificationType | string
  user_id?: string | number
}

function isPaymentWebhook(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const value = body as MercadoPagoWebhookPayload
  const notificationType = value.type ?? value.topic
  return notificationType === MERCADO_PAGO_NOTIFICATION_TYPE.PAYMENT
}

function getPaymentId(body: unknown, queryPaymentId: string | undefined): string | undefined {
  if (queryPaymentId) return queryPaymentId
  if (!body || typeof body !== 'object') return undefined

  const { data, resource } = body as MercadoPagoWebhookPayload
  const paymentId = data?.id ?? resource
  if (paymentId === undefined) return undefined

  return String(paymentId).split('/').at(-1)
}

function getSellerId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null

  const userId = (body as MercadoPagoWebhookPayload).user_id
  if (typeof userId === 'string') return userId.trim() ? userId : null
  if (typeof userId === 'number' && Number.isFinite(userId)) return String(userId)

  return null
}

@Injectable()
export class ReconcileMercadoPagoWebhookUseCase {
  private readonly logger = new Logger(ReconcileMercadoPagoWebhookUseCase.name)

  constructor(
    @Inject(TranslationService) private readonly ts: TranslationService,
    @Inject(MERCADO_PAGO_CHECKOUT_PRO_PORT)
    private readonly mercadoPagoCheckoutPro: MercadoPagoCheckoutProPort,
    @Inject(MERCADO_PAGO_CREDENTIAL_RESOLVER)
    private readonly credentialResolver: MercadoPagoCredentialResolver
  ) {}

  async execute(
    body: unknown,
    signature: string | undefined,
    requestId: string | undefined,
    dataId: string | undefined
  ): Promise<void> {
    const paymentId = getPaymentId(body, dataId)
    if (
      !paymentId ||
      !isPaymentWebhook(body) ||
      !this.isSignatureValid(paymentId, signature, requestId)
    ) {
      throw new ForbiddenException(this.ts.translateError('order.WEBHOOK_INVALID'))
    }

    const sellerId = getSellerId(body)
    if (!sellerId) {
      throw new ForbiddenException(this.ts.translateError('order.WEBHOOK_INVALID'))
    }

    const snapshot = await this.runOperationalStage(
      WEBHOOK_PROCESSING_STAGE.CREDENTIAL_LOOKUP,
      paymentId,
      sellerId,
      requestId,
      () => findMercadoPagoPaymentCredentialSnapshotBySellerId(sellerId)
    )

    const accessToken = await this.getSellerAccessToken({
      snapshot,
      paymentId,
      sellerId,
      requestId,
    })

    const providerPayment = await this.runOperationalStage(
      WEBHOOK_PROCESSING_STAGE.PROVIDER_PAYMENT,
      paymentId,
      sellerId,
      requestId,
      () => this.mercadoPagoCheckoutPro.getPayment(paymentId, accessToken)
    )

    const { externalReference, preferenceId } = providerPayment

    if (!externalReference) {
      throw new ForbiddenException(this.ts.translateError('order.WEBHOOK_INVALID'))
    }

    await this.runOperationalStage(
      WEBHOOK_PROCESSING_STAGE.RECONCILIATION,
      paymentId,
      sellerId,
      requestId,
      () =>
        reconcileMercadoPagoPayment({
          providerPaymentId: providerPayment.id,
          providerStatus: providerPayment.status,
          externalReference,
          providerPreferenceId: preferenceId ?? null,
          amount: providerPayment.amount,
          currency: providerPayment.currency,
          sellerId: providerPayment.sellerId ?? null,
          marketplaceFeeAmount: providerPayment.marketplaceFeeAmount ?? null,
          providerFeeAmount: providerPayment.providerFeeAmount ?? null,
          netReceivedAmount: providerPayment.netReceivedAmount ?? null,
          payload: body as Record<string, unknown>,
          now: new Date(),
        })
    )
  }

  private async getSellerAccessToken({
    snapshot,
    paymentId,
    sellerId,
    requestId,
  }: {
    snapshot: Awaited<ReturnType<typeof findMercadoPagoPaymentCredentialSnapshotBySellerId>>
    paymentId: string
    sellerId: string
    requestId: string | undefined
  }): Promise<string> {
    const snapshotAccessTokenEncrypted = snapshot?.accessTokenEncrypted
    if (
      snapshotAccessTokenEncrypted &&
      (!snapshot.accessTokenExpiresAt ||
        snapshot.accessTokenExpiresAt.getTime() > Date.now() + CREDENTIAL_EXPIRY_SKEW_MS)
    ) {
      return this.runOperationalStage(
        WEBHOOK_PROCESSING_STAGE.CREDENTIAL_RESOLUTION,
        paymentId,
        sellerId,
        requestId,
        () => Promise.resolve(decryptMercadoPagoCredential(snapshotAccessTokenEncrypted))
      )
    }

    const connection = await this.runOperationalStage(
      WEBHOOK_PROCESSING_STAGE.CREDENTIAL_LOOKUP,
      paymentId,
      sellerId,
      requestId,
      () => findConnectedMercadoPagoConnectionBySellerId(sellerId)
    )

    if (!connection) {
      throw new ForbiddenException(this.ts.translateError('order.WEBHOOK_INVALID'))
    }

    return this.runOperationalStage(
      WEBHOOK_PROCESSING_STAGE.CREDENTIAL_RESOLUTION,
      paymentId,
      sellerId,
      requestId,
      () => this.credentialResolver.resolve(connection)
    )
  }

  private async runOperationalStage<T>(
    stage: WebhookProcessingStage,
    paymentId: string,
    sellerId: string,
    requestId: string | undefined,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch {
      this.logger.error(WEBHOOK_PROCESSING_FAILURE_MESSAGE, {
        stage,
        paymentId,
        sellerId,
        requestId,
      })
      throw new ServiceUnavailableException(
        this.ts.translateError(ORDER_ERROR_CODE.WEBHOOK_PROCESSING_FAILED)
      )
    }
  }

  private isSignatureValid(
    paymentId: string,
    signature: string | undefined,
    requestId: string | undefined
  ): boolean {
    try {
      WebhookSignatureValidator.validate({
        xSignature: signature,
        xRequestId: requestId,
        dataId: paymentId,
        secret: ENV.MERCADOPAGO_WEBHOOK_SECRET,
        toleranceSeconds: WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
      })
      return true
    } catch {
      return false
    }
  }
}
