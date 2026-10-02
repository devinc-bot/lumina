import { expect, test, vi } from 'vitest'
const repositorySpies = vi.hoisted(() => ({
  findMercadoPagoConnectionById: vi.fn(),
  releaseReservationOnce: vi.fn(),
}))

const state = vi.hoisted(() => ({
  connection: null as { accessTokenEncrypted: string | null } | null,
  normalizedPurchase: null as { purchase: { status: string } } | null,
  pendingPurchase: null as {
    reservation: { documentId: string }
    payment: {
      providerPreferenceId: string | null
      credentialSource: string
      organizationPaymentConnectionId: number | null
      credentialAccessTokenEncrypted?: string | null
    }
  } | null,
  releaseTransitioned: false,
  userId: null as number | null,
}))
vi.mock('@repo/db', () => ({
  findUserIdByDocumentId: async () => state.userId,
  findPendingPurchaseCancellation: async () => state.pendingPurchase,
  findPurchaseByDocumentIdAndUserId: async () => state.normalizedPurchase,
  findMercadoPagoConnectionById: (...args: unknown[]) =>
    repositorySpies.findMercadoPagoConnectionById(...args),
  releaseReservationOnce: (...args: unknown[]) => repositorySpies.releaseReservationOnce(...args),
}))

vi.mock('../../mercado-pago/mercado-pago-credential-crypto', () => ({
  decryptMercadoPagoCredential: (value: string) => `decrypted:${value}`,
}))

import { DeletePendingOrderUseCase } from './delete-pending-order.use-case.ts'

function resetState({
  connection = null,
  normalizedPurchase = null,
  pendingPurchase = null,
  releaseTransitioned = false,
  userId = 1,
}: {
  connection?: { accessTokenEncrypted: string | null } | null
  normalizedPurchase?: typeof state.normalizedPurchase
  pendingPurchase?: typeof state.pendingPurchase
  releaseTransitioned?: boolean
  userId?: number | null
}) {
  vi.clearAllMocks()
  state.connection = connection
  state.normalizedPurchase = normalizedPurchase
  state.pendingPurchase = pendingPurchase
  state.releaseTransitioned = releaseTransitioned
  state.userId = userId
  repositorySpies.findMercadoPagoConnectionById.mockResolvedValue(connection)
  repositorySpies.releaseReservationOnce.mockResolvedValue({ transitioned: releaseTransitioned })
}

function createUseCase({
  expirePreference,
}: {
  expirePreference: (preferenceId: string, accessToken?: string) => Promise<void>
}) {
  return new DeletePendingOrderUseCase(
    { translateError: (code: string) => code } as never,
    { expirePreference } as never
  )
}

test('expires the provider preference before releasing an owned pending purchase', async () => {
  resetState({
    pendingPurchase: {
      reservation: { documentId: 'reservation-1' },
      payment: {
        providerPreferenceId: 'preference-1',
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
        credentialAccessTokenEncrypted: 'payment-token',
      },
    },
    releaseTransitioned: true,
  })
  const expiredPreferences: string[] = []
  const useCase = await createUseCase({
    expirePreference: async (preferenceId) => {
      expiredPreferences.push(preferenceId)
    },
  })

  await useCase.execute('buyer-1', 'order-1')

  expect(expiredPreferences).toEqual(['preference-1'])
})

test('rejects deletion when an owned normalized purchase is not pending', async () => {
  resetState({ normalizedPurchase: { purchase: { status: 'confirmed' } } })
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'ConflictException',
    message: 'order.DELETE_NOT_PENDING',
  })
})

test('retains the local order when preference expiration fails', async () => {
  resetState({
    pendingPurchase: {
      reservation: { documentId: 'reservation-1' },
      payment: {
        providerPreferenceId: 'preference-1',
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
        credentialAccessTokenEncrypted: 'payment-token',
      },
    },
    releaseTransitioned: true,
  })
  const useCase = await createUseCase({
    expirePreference: async () => {
      throw new Error('Mercado Pago unavailable')
    },
  })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'InternalServerErrorException',
    message: 'order.DELETE_FAILED',
  })
})

test('returns not found when the buyer does not own a pending purchase', async () => {
  resetState({})
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'NotFoundException',
    message: 'order.NOT_FOUND',
  })
})

test('rejects deletion when reconciliation completes the purchase concurrently', async () => {
  resetState({
    pendingPurchase: {
      reservation: { documentId: 'reservation-1' },
      payment: {
        providerPreferenceId: null,
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
      },
    },
    releaseTransitioned: false,
  })
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'ConflictException',
    message: 'order.DELETE_NOT_PENDING',
  })
})

test('uses the payment attempt credential snapshot after its organization reconnects or disconnects', async () => {
  resetState({
    connection: { accessTokenEncrypted: 'replacement-connection-token' },
    pendingPurchase: {
      reservation: { documentId: 'reservation-1' },
      payment: {
        providerPreferenceId: 'historical-preference',
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
        credentialAccessTokenEncrypted: 'historical-attempt-token',
      },
    },
    releaseTransitioned: true,
  })
  const expirePreference = vi.fn().mockResolvedValue(undefined)
  const useCase = await createUseCase({ expirePreference })

  await useCase.execute('buyer-1', 'purchase-1')

  expect(expirePreference).toHaveBeenCalledWith(
    'historical-preference',
    'decrypted:historical-attempt-token'
  )
  expect(repositorySpies.findMercadoPagoConnectionById).not.toHaveBeenCalled()
})

test('uses the current organization connection only when a historical payment has no credential snapshot', async () => {
  resetState({
    connection: { accessTokenEncrypted: 'current-connection-token' },
    pendingPurchase: {
      reservation: { documentId: 'reservation-connection-fallback' },
      payment: {
        providerPreferenceId: 'connection-fallback-preference',
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
        credentialAccessTokenEncrypted: null,
      },
    },
    releaseTransitioned: true,
  })
  const expirePreference = vi.fn().mockResolvedValue(undefined)
  const useCase = await createUseCase({ expirePreference })

  await useCase.execute('buyer-1', 'purchase-connection-fallback')

  expect(repositorySpies.findMercadoPagoConnectionById).toHaveBeenCalledWith(91)
  expect(expirePreference).toHaveBeenCalledWith(
    'connection-fallback-preference',
    'decrypted:current-connection-token'
  )
})

test('fails closed without releasing inventory when neither snapshot nor connection provides a credential', async () => {
  resetState({
    connection: null,
    pendingPurchase: {
      reservation: { documentId: 'reservation-no-credential' },
      payment: {
        providerPreferenceId: 'no-credential-preference',
        credentialSource: 'organization_connection',
        organizationPaymentConnectionId: 91,
        credentialAccessTokenEncrypted: null,
      },
    },
    releaseTransitioned: true,
  })
  const expirePreference = vi.fn()
  const useCase = await createUseCase({ expirePreference })

  await expect(useCase.execute('buyer-1', 'purchase-no-credential')).rejects.toMatchObject({
    name: 'InternalServerErrorException',
    message: 'order.DELETE_FAILED',
  })

  expect(expirePreference).not.toHaveBeenCalled()
  expect(repositorySpies.releaseReservationOnce).not.toHaveBeenCalled()
})
