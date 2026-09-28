import { createHmac } from 'node:crypto'
import { beforeEach, expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  findConnectedMercadoPagoConnectionBySellerId: vi.fn(),
  findMercadoPagoPaymentCredentialSnapshotBySellerId: vi.fn(),
  reconcileMercadoPagoPayment: vi.fn(),
}))

const crypto = vi.hoisted(() => ({
  decryptMercadoPagoCredential: vi.fn((value: string) => `decrypted:${value}`),
}))

vi.mock('@repo/db', () => repositories)
vi.mock('../mercado-pago-credential-crypto', () => crypto)

import { ReconcileMercadoPagoWebhookUseCase } from './reconcile-webhook.use-case.ts'

beforeEach(() => {
  vi.clearAllMocks()
  repositories.findConnectedMercadoPagoConnectionBySellerId.mockResolvedValue({
    accessTokenEncrypted: 'encrypted-seller-token',
  })
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockResolvedValue(null)
  repositories.reconcileMercadoPagoPayment.mockResolvedValue(undefined)
})

function createValidSignature(
  paymentId: string,
  requestId: string,
  timestamp = String(Math.floor(Date.now() / 1000))
) {
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')
  return { signature: `ts=${timestamp},v1=${signature}`, timestamp }
}

test('uses the immutable seller payment snapshot before the current seller connection', async () => {
  const paymentId = 'payment-snapshot-1'
  const requestId = 'request-snapshot-1'
  const { signature } = createValidSignature(paymentId, requestId)
  repositories.findConnectedMercadoPagoConnectionBySellerId.mockResolvedValue({
    accessTokenEncrypted: 'encrypted-current-connection-token',
  })
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockResolvedValue({
    accessTokenEncrypted: 'encrypted-historical-snapshot-token',
  })
  const getPayment = vi.fn().mockResolvedValue({
    id: paymentId,
    status: 'pending',
    externalReference: 'purchase-snapshot-1',
    preferenceId: 'preference-snapshot-1',
    amount: 100,
    currency: 'ARS',
  })
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    signature,
    requestId,
    paymentId
  )

  expect(getPayment).toHaveBeenCalledWith(
    paymentId,
    'decrypted:encrypted-historical-snapshot-token'
  )
  expect(crypto.decryptMercadoPagoCredential).toHaveBeenCalledWith(
    'encrypted-historical-snapshot-token'
  )
  expect(crypto.decryptMercadoPagoCredential).not.toHaveBeenCalledWith(
    'encrypted-current-connection-token'
  )
  expect(repositories.findConnectedMercadoPagoConnectionBySellerId).not.toHaveBeenCalled()
})

test('rejects a signed webhook that has no seller identity before querying Mercado Pago', async () => {
  const paymentId = 'payment-without-seller'
  const requestId = 'request-without-seller'
  const { signature } = createValidSignature(paymentId, requestId)
  const getPayment = vi.fn()
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never
  )

  await expect(
    useCase.execute({ type: 'payment', data: { id: paymentId } }, signature, requestId, paymentId)
  ).rejects.toMatchObject({ name: 'ForbiddenException', message: 'order.WEBHOOK_INVALID' })

  expect(getPayment).not.toHaveBeenCalled()
})

test.each([
  { name: 'null', sellerId: null },
  { name: 'an object', sellerId: { id: 'seller-1' } },
  { name: 'a boolean', sellerId: true },
  { name: 'NaN', sellerId: Number.NaN },
  { name: 'an infinite number', sellerId: Number.POSITIVE_INFINITY },
])(
  'rejects a signed webhook whose user_id is $name before credential lookups',
  async ({ sellerId }) => {
    const paymentId = 'payment-invalid-seller'
    const requestId = 'request-invalid-seller'
    const { signature } = createValidSignature(paymentId, requestId)
    const getPayment = vi.fn()
    const useCase = new ReconcileMercadoPagoWebhookUseCase(
      { translateError: (code: string) => code } as never,
      { getPayment } as never
    )

    await expect(
      useCase.execute(
        { type: 'payment', data: { id: paymentId }, user_id: sellerId },
        signature,
        requestId,
        paymentId
      )
    ).rejects.toMatchObject({ name: 'ForbiddenException', message: 'order.WEBHOOK_INVALID' })

    expect(repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId).not.toHaveBeenCalled()
    expect(repositories.findConnectedMercadoPagoConnectionBySellerId).not.toHaveBeenCalled()
    expect(getPayment).not.toHaveBeenCalled()
  }
)

test('rejects a seller whose connection and immutable snapshot have no credential', async () => {
  const paymentId = 'payment-without-credential'
  const requestId = 'request-without-credential'
  const { signature } = createValidSignature(paymentId, requestId)
  repositories.findConnectedMercadoPagoConnectionBySellerId.mockResolvedValue({
    accessTokenEncrypted: null,
  })
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockResolvedValue({
    accessTokenEncrypted: null,
  })
  const getPayment = vi.fn()
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never
  )

  await expect(
    useCase.execute(
      { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
      signature,
      requestId,
      paymentId
    )
  ).rejects.toMatchObject({ name: 'ForbiddenException', message: 'order.WEBHOOK_INVALID' })

  expect(getPayment).not.toHaveBeenCalled()
})

test('accepts a legacy payment notification with its resource as the payment ID', async () => {
  const requestId = 'request-123'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-123'
  const manifest = `request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')
  let receivedPaymentId: string | undefined
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: async (id: string) => {
        receivedPaymentId = id
        return {
          id,
          status: 'pending',
          externalReference: 'purchase-123',
          preferenceId: 'preference-123',
          amount: 100,
          currency: 'ARS',
        }
      },
    } as never
  )

  await useCase.execute(
    { resource: paymentId, topic: 'payment', user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    requestId,
    undefined
  )

  expect(receivedPaymentId).toBe(paymentId)
})

test('includes the query payment ID in the webhook signature manifest', async () => {
  const requestId = 'request-456'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-456'
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')
  let receivedPaymentId: string | undefined
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: async (id: string) => {
        receivedPaymentId = id
        return {
          id,
          status: 'pending',
          externalReference: 'purchase-456',
          preferenceId: 'preference-456',
          amount: 100,
          currency: 'ARS',
        }
      },
    } as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    requestId,
    paymentId
  )

  expect(receivedPaymentId).toBe(paymentId)
})

test('omits a missing request ID from the webhook signature manifest', async () => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-789'
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(`ts:${timestamp};`)
    .digest('hex')
  let receivedPaymentId: string | undefined
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: async (id: string) => {
        receivedPaymentId = id
        return {
          id,
          status: 'pending',
          externalReference: 'purchase-789',
          preferenceId: 'preference-789',
          amount: 100,
          currency: 'ARS',
        }
      },
    } as never
  )

  await useCase.execute(
    { resource: paymentId, topic: 'payment', user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    undefined,
    undefined
  )

  expect(receivedPaymentId).toBe(paymentId)
})

test('rejects a valid signature outside the webhook replay window', async () => {
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment: async () => ({}) } as never
  )
  const requestId = 'request-123'
  const timestamp = String(Math.floor(Date.now() / 1000) - 301)
  const manifest = `id:payment-123;request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')

  await expect(
    useCase.execute(
      { type: 'payment', data: { id: 'payment-123' } },
      `ts=${timestamp},v1=${signature}`,
      requestId,
      'payment-123'
    )
  ).rejects.toThrow()
})

test('reconciles verified provider facts without replacing the legacy order projection', async () => {
  const requestId = 'request-987'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-987'
  const externalReference = 'purchase-987'
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: async () => ({
        id: paymentId,
        status: 'approved',
        externalReference,
        preferenceId: 'legacy-preference-987',
        amount: 2500,
        currency: 'ARS',
      }),
    } as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    requestId,
    paymentId
  )

  expect(repositories.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
    expect.objectContaining({
      providerPaymentId: paymentId,
      providerStatus: 'approved',
      externalReference,
      amount: 2500,
      currency: 'ARS',
      payload: { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    })
  )
  expect(repositories.reconcileMercadoPagoPayment).toHaveBeenCalledTimes(1)
})

test('passes the verified provider preference identity to reconciliation', async () => {
  const requestId = 'request-preference-1'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-preference-1'
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(manifest)
    .digest('hex')
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: async () => ({
        id: paymentId,
        status: 'approved',
        externalReference: 'purchase-preference-1',
        amount: 2750,
        currency: 'ARS',
        sellerId: 'seller-1',
        preferenceId: 'preference-expected-1',
        marketplaceFeeAmount: 75,
        providerFeeAmount: 125,
        netReceivedAmount: 2500,
      }),
    } as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    requestId,
    paymentId
  )

  expect(repositories.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
    expect.objectContaining({
      externalReference: 'purchase-preference-1',
      providerPreferenceId: 'preference-expected-1',
    })
  )
})
