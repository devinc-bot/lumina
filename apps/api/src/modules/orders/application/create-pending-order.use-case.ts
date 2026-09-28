import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import {
  attachProviderPreference,
  findConnectedMercadoPagoConnectionByOrganizationId,
  findMercadoPagoConnectionById,
  findPublicTicketByDocumentId,
  findUserIdByDocumentId,
  releaseReservationOnce,
  reserveSingleTicketCheckout,
} from '@repo/db'
import { API_PREFIX, API_ROUTES, CLIENT_ROUTES } from '@repo/common'
import { ORDER_ERROR_CODE } from '@repo/i18n'
import { TranslationService } from '@repo/i18n/server'
import {
  PAYMENT_PROVIDER,
  PAYMENT_CREDENTIAL_SOURCE,
  PAYMENT_CURRENCY,
  PAYMENT_STATUS,
  MERCADO_PAGO_SETTLEMENT_FEE_BPS,
  DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM,
  CHECKOUT_RESERVATION_DURATION_MS,
  INVENTORY_RESERVATION_STATUS,
  PURCHASE_STATUS,
  TICKET_STATUS,
  type CreateOrderResponse,
} from '@repo/types'
import type { CreateOrderInput } from '@repo/validators'
import { ENV } from '../../../config/env'
import { calculateMarketplacePriceBreakdown } from '../../mercado-pago/application/mercado-pago-pricing.policy'
import { MercadoPagoCredentialResolver } from '../../mercado-pago/application/mercado-pago-credential-resolver'
import { encryptMercadoPagoCredential } from '../../mercado-pago/mercado-pago-credential-crypto'
import type { MercadoPagoCheckoutProPort } from '../../mercado-pago/mercado-pago-checkout-pro.port'
import {
  MERCADO_PAGO_CHECKOUT_PRO_PORT,
  MERCADO_PAGO_CREDENTIAL_RESOLVER,
} from '../../mercado-pago/mercado-pago.tokens'
import { isTicketOnSale } from '../utils/orders'

@Injectable()
export class CreatePendingOrderUseCase {
  private readonly logger = new Logger(CreatePendingOrderUseCase.name)

  constructor(
    @Inject(TranslationService) private readonly ts: TranslationService,
    @Inject(MERCADO_PAGO_CHECKOUT_PRO_PORT)
    private readonly mercadoPagoCheckoutPro: MercadoPagoCheckoutProPort,
    @Inject(MERCADO_PAGO_CREDENTIAL_RESOLVER)
    private readonly credentialResolver?: MercadoPagoCredentialResolver
  ) {}

  async execute(userDocumentId: string, input: CreateOrderInput): Promise<CreateOrderResponse> {
    if (!ENV.MERCADOPAGO_MARKETPLACE_ENABLED) {
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.CHECKOUT_UNAVAILABLE))
    }

    const [ticket, userId] = await Promise.all([
      findPublicTicketByDocumentId(input.ticketId),
      findUserIdByDocumentId(userDocumentId),
    ])
    if (!ticket || ticket.status !== TICKET_STATUS.ACTIVE || !isTicketOnSale(ticket)) {
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.NOT_ON_SALE))
    }

    if (!userId) {
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.NOT_FOUND))
    }

    const connection = await findConnectedMercadoPagoConnectionByOrganizationId(
      ticket.organizationId
    )
    if (!connection) {
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.CHECKOUT_UNAVAILABLE))
    }
    const breakdown = calculateMarketplacePriceBreakdown({
      unitFacePriceAmount: Math.round(ticket.price * 100),
      quantity: input.quantity,
      estimatedProviderFeeBps:
        MERCADO_PAGO_SETTLEMENT_FEE_BPS[
          connection.settlementTerm ?? DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM
        ],
      currency: PAYMENT_CURRENCY.ARS,
    })
    if (
      input.expectedTotalAmount !== undefined &&
      input.expectedTotalAmount !== breakdown.totalAmount
    ) {
      throw new ConflictException(this.ts.translateError(ORDER_ERROR_CODE.QUOTE_CHANGED))
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + CHECKOUT_RESERVATION_DURATION_MS)
    const marketplaceAccessToken = await this.resolveConnectionAccessToken(connection, now)
    const credentialSnapshot = await findMercadoPagoConnectionById(connection.id)
    const checkout = await reserveSingleTicketCheckout({
      userId,
      ticketId: ticket.id,
      quantity: input.quantity,
      currency: PAYMENT_CURRENCY.ARS,
      expiresAt,
      now,
      priceBreakdown: breakdown,
      credentialSource: PAYMENT_CREDENTIAL_SOURCE.ORGANIZATION_CONNECTION,
      organizationPaymentConnectionId: connection.id,
      providerSellerId: connection.sellerId,
      credentialAccessTokenEncrypted: encryptMercadoPagoCredential(marketplaceAccessToken),
      credentialRefreshTokenEncrypted: credentialSnapshot?.refreshTokenEncrypted ?? null,
      credentialAccessTokenExpiresAt: credentialSnapshot?.accessTokenExpiresAt ?? null,
    })
    if (!checkout) {
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.OUT_OF_STOCK))
    }

    try {
      const preference = await this.mercadoPagoCheckoutPro.createPreference({
        externalReference: checkout.purchase.documentId,
        title: ticket.ticketType.name,
        amount: checkout.purchase.totalAmount,
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount ?? 0,
        accessToken: marketplaceAccessToken,
        idempotencyKey: checkout.purchase.documentId,
        notificationUrl: this.getWebhookUrl(),
        expiresAt: checkout.purchase.expiresAt ?? expiresAt,
        backUrls: this.getBackUrls(checkout.purchase.documentId),
      })
      const attachment = await attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: PAYMENT_PROVIDER.MERCADO_PAGO,
        providerPreferenceId: preference.id,
        now,
      })
      if (attachment.outcome === 'not_attachable')
        throw new Error('Provider preference is not attachable')

      return {
        documentId: checkout.purchase.documentId,
        ticketId: ticket.documentId,
        status: PAYMENT_STATUS.PENDING,
        amount: checkout.purchase.totalAmount,
        quantity: checkout.purchaseItem.quantity,
        provider: PAYMENT_PROVIDER.MERCADO_PAGO,
        paidAt: null,
        createdAt: checkout.purchase.createdAt,
        updatedAt: checkout.purchase.updatedAt,
        checkoutUrl: preference.initPoint,
        breakdown,
      }
    } catch {
      this.logger.error('Mercado Pago preference creation failed')
      await releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: PURCHASE_STATUS.CANCELLED,
        reservationStatus: INVENTORY_RESERVATION_STATUS.RELEASED,
        now,
      })
      throw new BadRequestException(this.ts.translateError(ORDER_ERROR_CODE.CHECKOUT_FAILED))
    }
  }

  private getWebhookUrl(): string {
    return new URL(
      `/${API_PREFIX}${API_ROUTES.mercadoPago.prefix}${API_ROUTES.mercadoPago.path.webhook()}`,
      ENV.API_PUBLIC_URL
    ).toString()
  }

  private async resolveConnectionAccessToken(
    connection: NonNullable<
      Awaited<ReturnType<typeof findConnectedMercadoPagoConnectionByOrganizationId>>
    >,
    now: Date
  ): Promise<string> {
    if (!this.credentialResolver) {
      throw new Error('Mercado Pago credential resolver is unavailable')
    }
    return this.credentialResolver.resolve(connection, now)
  }

  private getBackUrls(orderDocumentId: string) {
    return {
      success: new URL(CLIENT_ROUTES.checkoutSuccess(orderDocumentId), ENV.WEB_URL).toString(),
      pending: new URL(CLIENT_ROUTES.checkoutPending(orderDocumentId), ENV.WEB_URL).toString(),
      failure: new URL(CLIENT_ROUTES.checkoutError(orderDocumentId), ENV.WEB_URL).toString(),
    }
  }
}
