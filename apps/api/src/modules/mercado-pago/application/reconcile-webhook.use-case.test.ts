import { createHmac } from 'node:crypto'
import { beforeEach, expect, test, vi } from 'vitest'
import { Logger } from '@nestjs/common'

const repositories = vi.hoisted(() => ({
  findConnectedMercadoPagoConnectionBySellerId: vi.fn(),
  findMercadoPagoPaymentCredentialSnapshotBySellerId: vi.fn(),
  reconcileMercadoPagoPayment: vi.fn(),
}))

const crypto = vi.hoisted(() => ({
  decryptMercadoPagoCredential: vi.fn((value: string) => `decrypted:${value}`),
}))

const credentialResolver = vi.hoisted(() => ({
  resolve: vi.fn(),
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
  credentialResolver.resolve.mockResolvedValue('resolved-current-seller-token')
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

function createValidWebhookInput(paymentId: string, requestId: string) {
  const { signature } = createValidSignature(paymentId, requestId)
  return {
    body: { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    signature,
    requestId,
  }
}

function createApprovedProviderPayment(paymentId: string) {
  return {
    id: paymentId,
    status: 'approved',
    externalReference: `purchase-${paymentId}`,
    preferenceId: `preference-${paymentId}`,
    amount: 100,
    currency: 'ARS',
  }
}

async function expectOperationalFailure({
  useCase,
  paymentId,
  requestId,
  stage,
}: {
  useCase: ReconcileMercadoPagoWebhookUseCase
  paymentId: string
  requestId: string
  stage: 'credential_lookup' | 'credential_resolution' | 'provider_payment' | 'reconciliation'
}) {
  const { body, signature } = createValidWebhookInput(paymentId, requestId)
  const loggedErrors: unknown[][] = []
  const loggerError = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation((...args: unknown[]) => {
      loggedErrors.push(args)
    })

  try {
    await expect(useCase.execute(body, signature, requestId, paymentId)).rejects.toMatchObject({
      name: 'ServiceUnavailableException',
      message: 'order.WEBHOOK_PROCESSING_FAILED',
    })
    expect(loggedErrors).toEqual([
      [
        'Mercado Pago webhook processing failed',
        { stage, paymentId, sellerId: 'seller-1', requestId },
      ],
    ])
  } finally {
    loggerError.mockRestore()
  }
}

test('returns a generic processing error and safe correlated log when credential lookup fails', async () => {
  const paymentId = 'payment-credential-lookup-failure'
  const requestId = 'request-credential-lookup-failure'
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockRejectedValue(
    new Error('database failure: encrypted-token=secret')
  )
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment: vi.fn() } as never,
    credentialResolver as never
  )

  await expectOperationalFailure({ useCase, paymentId, requestId, stage: 'credential_lookup' })
})

test('returns a generic processing error and safe correlated log when Mercado Pago lookup fails', async () => {
  const paymentId = 'payment-provider-failure'
  const requestId = 'request-provider-failure'
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: vi.fn().mockRejectedValue(new Error('provider response: access_token=secret')),
    } as never,
    credentialResolver as never
  )

  await expectOperationalFailure({ useCase, paymentId, requestId, stage: 'provider_payment' })
})

test('returns a generic processing error and safe correlated log when credential resolution fails', async () => {
  const paymentId = 'payment-credential-resolution-failure'
  const requestId = 'request-credential-resolution-failure'
  repositories.findConnectedMercadoPagoConnectionBySellerId.mockResolvedValue({
    id: 91,
    organizationId: 17,
    accessTokenEncrypted: 'encrypted-current-connection-token',
    refreshTokenEncrypted: 'encrypted-current-refresh-token',
    accessTokenExpiresAt: new Date(Date.now() - 1),
  })
  credentialResolver.resolve.mockRejectedValue(new Error('refresh failed: refresh_token=secret'))
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment: vi.fn() } as never,
    credentialResolver as never
  )

  await expectOperationalFailure({ useCase, paymentId, requestId, stage: 'credential_resolution' })
})

test('returns a generic processing error when decrypting a valid payment snapshot fails', async () => {
  const paymentId = 'payment-snapshot-decryption-failure'
  const requestId = 'request-snapshot-decryption-failure'
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockResolvedValue({
    accessTokenEncrypted: 'encrypted-payment-snapshot-token',
  })
  crypto.decryptMercadoPagoCredential.mockImplementationOnce(() => {
    throw new Error('decryption failed: key=secret')
  })
  const getPayment = vi.fn()
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never,
    credentialResolver as never
  )

  await expectOperationalFailure({ useCase, paymentId, requestId, stage: 'credential_resolution' })

  expect(getPayment).not.toHaveBeenCalled()
})

test('returns a generic processing error and safe correlated log when reconciliation fails', async () => {
  const paymentId = 'payment-reconciliation-failure'
  const requestId = 'request-reconciliation-failure'
  repositories.reconcileMercadoPagoPayment.mockRejectedValue(
    new Error('database constraint details must remain internal')
  )
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment: vi.fn().mockResolvedValue(createApprovedProviderPayment(paymentId)) } as never,
    credentialResolver as never
  )

  await expectOperationalFailure({ useCase, paymentId, requestId, stage: 'reconciliation' })
})

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
    { getPayment } as never,
    credentialResolver as never
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
  expect(credentialResolver.resolve).not.toHaveBeenCalled()
})

test('uses the current seller connection when the immutable payment snapshot token is close to expiry', async () => {
  const paymentId = 'payment-expired-snapshot-1'
  const requestId = 'request-expired-snapshot-1'
  const { signature } = createValidSignature(paymentId, requestId)
  repositories.findMercadoPagoPaymentCredentialSnapshotBySellerId.mockResolvedValue({
    accessTokenEncrypted: 'expired-payment-snapshot-token',
    accessTokenExpiresAt: new Date(Date.now() + 59_999),
  })
  repositories.findConnectedMercadoPagoConnectionBySellerId.mockResolvedValue({
    id: 91,
    organizationId: 17,
    accessTokenEncrypted: 'encrypted-current-connection-token',
    refreshTokenEncrypted: 'encrypted-current-refresh-token',
    accessTokenExpiresAt: new Date(Date.now() - 1),
  })
  const getPayment = vi.fn().mockResolvedValue({
    id: paymentId,
    status: 'approved',
    externalReference: 'purchase-expired-snapshot-1',
    preferenceId: 'preference-expired-snapshot-1',
    amount: 100,
    currency: 'ARS',
  })
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never,
    credentialResolver as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    signature,
    requestId,
    paymentId
  )

  expect(getPayment).toHaveBeenCalledWith(paymentId, 'resolved-current-seller-token')
  expect(credentialResolver.resolve).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 91,
      accessTokenExpiresAt: expect.any(Date),
    })
  )
})

test('rejects a signed webhook that has no seller identity before querying Mercado Pago', async () => {
  const paymentId = 'payment-without-seller'
  const requestId = 'request-without-seller'
  const { signature } = createValidSignature(paymentId, requestId)
  const getPayment = vi.fn()
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never,
    credentialResolver as never
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
      { getPayment } as never,
      credentialResolver as never
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
  credentialResolver.resolve.mockRejectedValue(
    new Error('Mercado Pago connection requires reconnection')
  )
  const getPayment = vi.fn()
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never,
    credentialResolver as never
  )

  await expect(
    useCase.execute(
      { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
      signature,
      requestId,
      paymentId
    )
  ).rejects.toMatchObject({
    name: 'ServiceUnavailableException',
    message: 'order.WEBHOOK_PROCESSING_FAILED',
  })
  expect(getPayment).not.toHaveBeenCalled()
})

test('accepts a payment notification with its resource as the payment ID', async () => {
  const requestId = 'request-123'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-123'
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
          externalReference: 'purchase-123',
          preferenceId: 'preference-123',
          amount: 100,
          currency: 'ARS',
        }
      },
    } as never,
    credentialResolver as never
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
    } as never,
    credentialResolver as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    `ts=${timestamp},v1=${signature}`,
    requestId,
    paymentId
  )

  expect(receivedPaymentId).toBe(paymentId)
})

test('reconciles a signed payment.created body when data.id is numeric and no query ID is present', async () => {
  const requestId = 'request-payment-created-1'
  const paymentId = 987654321
  const { signature } = createValidSignature(String(paymentId), requestId)
  const getPayment = vi.fn().mockResolvedValue({
    id: String(paymentId),
    status: 'approved',
    externalReference: 'purchase-payment-created-1',
    preferenceId: 'preference-payment-created-1',
    amount: 2500,
    currency: 'ARS',
  })
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    { getPayment } as never,
    credentialResolver as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    signature,
    requestId,
    undefined
  )

  expect(getPayment).toHaveBeenCalledWith(String(paymentId), 'resolved-current-seller-token')
  expect(repositories.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
    expect.objectContaining({
      providerPaymentId: String(paymentId),
      externalReference: 'purchase-payment-created-1',
    })
  )
})

test('reconciles a verified payment without optional preference or marketplace fee facts', async () => {
  const paymentId = 'payment-without-optional-facts'
  const requestId = 'request-without-optional-facts'
  const { signature } = createValidSignature(paymentId, requestId)
  const useCase = new ReconcileMercadoPagoWebhookUseCase(
    { translateError: (code: string) => code } as never,
    {
      getPayment: vi.fn().mockResolvedValue({
        id: paymentId,
        status: 'approved',
        externalReference: 'purchase-without-optional-facts',
        sellerId: 'seller-1',
        amount: 2500,
        currency: 'ARS',
      }),
    } as never,
    credentialResolver as never
  )

  await useCase.execute(
    { type: 'payment', data: { id: paymentId }, user_id: 'seller-1' },
    signature,
    requestId,
    paymentId
  )

  expect(repositories.reconcileMercadoPagoPayment).toHaveBeenCalledWith(
    expect.objectContaining({
      providerPaymentId: paymentId,
      externalReference: 'purchase-without-optional-facts',
      sellerId: 'seller-1',
      amount: 2500,
      currency: 'ARS',
      providerPreferenceId: null,
      marketplaceFeeAmount: null,
    })
  )
})

test('omits a missing request ID from the webhook signature manifest', async () => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const paymentId = 'payment-789'
  const signature = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')
    .update(`id:${paymentId};ts:${timestamp};`)
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
    } as never,
    credentialResolver as never
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
    { getPayment: async () => ({}) } as never,
    credentialResolver as never
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

test('reconciles verified provider facts without replacing the normalized purchase projection', async () => {
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
    } as never,
    credentialResolver as never
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
    } as never,
    credentialResolver as never
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
