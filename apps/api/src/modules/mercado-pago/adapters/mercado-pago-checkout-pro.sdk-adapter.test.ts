import { beforeEach, expect, test, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  createPreference: vi.fn(),
  getPayment: vi.fn(),
  getPreference: vi.fn(),
  updatePreference: vi.fn(),
}))

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class MercadoPagoConfig {},
  Payment: class Payment {
    get = sdk.getPayment
  },
  Preference: class Preference {
    create = sdk.createPreference
    get = sdk.getPreference
    update = sdk.updatePreference
  },
}))

import { MercadoPagoCheckoutProSdkAdapter } from './mercado-pago-checkout-pro.sdk-adapter.ts'

beforeEach(() => {
  vi.clearAllMocks()
})

test('creates a Checkout Pro preference with the Mercado Pago SDK', async () => {
  sdk.createPreference.mockResolvedValue({
    id: 'preference-123',
    init_point: 'https://checkout.mercadopago.com/123',
  })
  const adapter = new MercadoPagoCheckoutProSdkAdapter()

  const result = await adapter.createPreference({
    externalReference: 'order-123',
    title: 'Entrada general',
    amount: 2750,
    marketplaceFeeAmount: 75,
    accessToken: 'seller-access-token',
    idempotencyKey: '5b1af4ed-8669-431d-b46a-39a7ec8b8107',
    notificationUrl: 'https://api.afterdark.test/api/mercado-pago/webhook',
    expiresAt: new Date('2026-09-01T12:15:00.000Z'),
    backUrls: {
      success: 'https://afterdark.test/checkout/order-123/success',
      pending: 'https://afterdark.test/checkout/order-123/pending',
      failure: 'https://afterdark.test/checkout/order-123/error',
    },
  })

  expect(result).toEqual({
    id: 'preference-123',
    initPoint: 'https://checkout.mercadopago.com/123',
  })
  expect(sdk.createPreference).toHaveBeenCalledWith({
    body: {
      items: [{ id: 'order-123', title: 'Entrada general', quantity: 1, unit_price: 2750 }],
      external_reference: 'order-123',
      notification_url: 'https://api.afterdark.test/api/mercado-pago/webhook',
      expires: true,
      expiration_date_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expiration_date_to: '2026-09-01T12:15:00.000Z',
      back_urls: {
        success: 'https://afterdark.test/checkout/order-123/success',
        pending: 'https://afterdark.test/checkout/order-123/pending',
        failure: 'https://afterdark.test/checkout/order-123/error',
      },
      auto_return: 'approved',
      marketplace_fee: 75,
      payment_methods: {
        installments: 1,
        excluded_payment_types: [{ id: 'ticket' }],
      },
    },
    requestOptions: { idempotencyKey: '5b1af4ed-8669-431d-b46a-39a7ec8b8107' },
  })
})

test('retrieves a payment with the Mercado Pago SDK', async () => {
  sdk.getPayment.mockResolvedValue({
    id: 456,
    status: 'approved',
    external_reference: 'order-123',
    transaction_amount: 2500,
    currency_id: 'ARS',
  })
  const adapter = new MercadoPagoCheckoutProSdkAdapter()

  await expect(adapter.getPayment('456', 'seller-access-token')).resolves.toEqual({
    id: '456',
    status: 'approved',
    externalReference: 'order-123',
    amount: 2500,
    currency: 'ARS',
  })
  expect(sdk.getPayment).toHaveBeenCalledWith({ id: '456' })
})

test('expires a Checkout Pro preference with its existing items', async () => {
  const items = [{ id: 'order-123', title: 'Entrada general', quantity: 2, unit_price: 2500 }]
  sdk.getPreference.mockResolvedValue({ id: 'preference-123', items })
  sdk.updatePreference.mockResolvedValue({ id: 'preference-123' })
  const adapter = new MercadoPagoCheckoutProSdkAdapter()

  await adapter.expirePreference('preference-123', 'seller-access-token')

  expect(sdk.getPreference).toHaveBeenCalledWith({ preferenceId: 'preference-123' })
  expect(sdk.updatePreference).toHaveBeenCalledWith({
    id: 'preference-123',
    updatePreferenceRequest: {
      items,
      expires: true,
      expiration_date_to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    },
  })
})

test('does not update a preference without items', async () => {
  sdk.getPreference.mockResolvedValue({ id: 'preference-123' })
  const adapter = new MercadoPagoCheckoutProSdkAdapter()

  await expect(adapter.expirePreference('preference-123', 'seller-access-token')).rejects.toThrow(
    /Mercado Pago preference response is missing items/
  )
  expect(sdk.updatePreference).not.toHaveBeenCalled()
})

test('propagates a Mercado Pago preference expiration failure', async () => {
  sdk.getPreference.mockResolvedValue({
    id: 'preference-123',
    items: [{ id: 'order-123', title: 'Entrada general', quantity: 2, unit_price: 2500 }],
  })
  sdk.updatePreference.mockRejectedValue(new Error('Provider unavailable'))
  const adapter = new MercadoPagoCheckoutProSdkAdapter()

  await expect(adapter.expirePreference('preference-123', 'seller-access-token')).rejects.toThrow(
    'Provider unavailable'
  )
})
