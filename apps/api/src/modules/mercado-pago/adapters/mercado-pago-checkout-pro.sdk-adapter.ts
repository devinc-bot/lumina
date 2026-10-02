import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import { Injectable } from '@nestjs/common'
import { ENV } from '../../../config/env'
import type {
  CreateMercadoPagoPreferenceInput,
  MercadoPagoCheckoutProPort,
  MercadoPagoPaymentResult,
  MercadoPagoPreferenceResult,
} from '../mercado-pago-checkout-pro.port'

type OptionalPaymentDetailsInput = {
  collectorId: unknown
  preferenceId: unknown
  marketplaceFeeAmount: unknown
  providerFeeAmount: unknown
  netReceivedAmount: unknown
}

function getOptionalPaymentDetails(
  input: OptionalPaymentDetailsInput
): Partial<MercadoPagoPaymentResult> {
  const details: Partial<MercadoPagoPaymentResult> = {}

  if (input.collectorId !== undefined) details.sellerId = String(input.collectorId)
  if (typeof input.preferenceId === 'string') details.preferenceId = input.preferenceId
  if (typeof input.marketplaceFeeAmount === 'number') {
    details.marketplaceFeeAmount = input.marketplaceFeeAmount
  }
  if (typeof input.providerFeeAmount === 'number') {
    details.providerFeeAmount = input.providerFeeAmount
  }
  if (typeof input.netReceivedAmount === 'number') {
    details.netReceivedAmount = input.netReceivedAmount
  }

  return details
}

@Injectable()
export class MercadoPagoCheckoutProSdkAdapter implements MercadoPagoCheckoutProPort {
  private createClient(accessToken: string) {
    return new MercadoPagoConfig({ accessToken })
  }

  async createPreference(
    input: CreateMercadoPagoPreferenceInput
  ): Promise<MercadoPagoPreferenceResult> {
    const preference = new Preference(this.createClient(input.accessToken))
    const response = await preference.create({
      body: {
        items: [
          {
            id: input.externalReference,
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
          },
        ],
        external_reference: input.externalReference,
        notification_url: input.notificationUrl,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: input.expiresAt.toISOString(),
        back_urls: input.backUrls,
        auto_return: 'approved',
        marketplace_fee: input.marketplaceFeeAmount,
        payment_methods: {
          installments: 1,
          excluded_payment_types: [{ id: 'ticket' }],
        },
      },
      requestOptions: { idempotencyKey: input.idempotencyKey },
    })
    const initPoint = ENV.MERCADOPAGO_TEST_MODE ? response.sandbox_init_point : response.init_point
    if (response.id === undefined || !initPoint) {
      throw new Error('Mercado Pago preference response is missing id or init point')
    }

    return { id: String(response.id), initPoint }
  }

  async expirePreference(preferenceId: string, accessToken?: string): Promise<void> {
    if (!accessToken) throw new Error('Mercado Pago organization credential is required')
    const preferenceClient = new Preference(this.createClient(accessToken))
    const preference = await preferenceClient.get({ preferenceId })
    if (!preference.items?.length) {
      throw new Error('Mercado Pago preference response is missing items')
    }

    await preferenceClient.update({
      id: preferenceId,
      updatePreferenceRequest: {
        items: preference.items,
        expires: true,
        expiration_date_to: new Date().toISOString(),
      },
    })
  }

  async getPayment(paymentId: string, accessToken?: string): Promise<MercadoPagoPaymentResult> {
    if (!accessToken) throw new Error('Mercado Pago organization credential is required')

    const payment = new Payment(this.createClient(accessToken))

    const response = await payment.get({ id: paymentId })

    if (
      response.id === undefined ||
      !response.status ||
      response.transaction_amount === undefined ||
      !response.currency_id
    ) {
      throw new Error('Mercado Pago payment response is missing verified payment facts')
    }
    // The SDK's PaymentResponse type currently omits fields returned by the
    // Checkout Pro payment API that are needed for marketplace reconciliation.
    const marketplaceResponse = response as typeof response & {
      preference_id?: unknown
      marketplace_fee?: unknown
    }
    const optionalPaymentDetails = getOptionalPaymentDetails({
      collectorId: response.collector_id,
      preferenceId: marketplaceResponse.preference_id,
      marketplaceFeeAmount: marketplaceResponse.marketplace_fee,
      providerFeeAmount: response.fee_details?.[0]?.amount,
      netReceivedAmount: response.transaction_details?.net_received_amount,
    })

    return {
      id: String(response.id),
      status: response.status,
      externalReference: response.external_reference ?? null,
      amount: response.transaction_amount,
      currency: response.currency_id,
      ...optionalPaymentDetails,
    }
  }
}
