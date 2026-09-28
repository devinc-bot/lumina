import { expect, test, vi } from 'vitest'
import { PAYMENT_STATUS, type PaymentStatus } from '@repo/types'

type Order = {
  status: PaymentStatus | null
  externalOrderId: string | null
}

const repositorySpies = vi.hoisted(() => ({
  findMercadoPagoConnectionById: vi.fn(),
  releaseReservationOnce: vi.fn(),
}))

const state = vi.hoisted(() => ({
  connection: null as { accessTokenEncrypted: string | null } | null,
  currentOrder: null as Order | null,
  deleteResult: false,
  initialOrder: null as Order | null,
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
let findOrderCallCount = 0

vi.mock('@repo/db', () => ({
  findUserIdByDocumentId: async () => state.userId,
  findOrderByDocumentIdAndUserId: async () => {
    findOrderCallCount += 1
    return findOrderCallCount === 1 ? state.initialOrder : state.currentOrder
  },
  findPendingPurchaseCancellation: async () => state.pendingPurchase,
  findMercadoPagoConnectionById: (...args: unknown[]) =>
    repositorySpies.findMercadoPagoConnectionById(...args),
  deletePendingOrderByDocumentIdAndUserId: async () => state.deleteResult,
  releaseReservationOnce: (...args: unknown[]) => repositorySpies.releaseReservationOnce(...args),
}))

vi.mock('../../mercado-pago/mercado-pago-credential-crypto', () => ({
  decryptMercadoPagoCredential: (value: string) => `decrypted:${value}`,
}))

import { DeletePendingOrderUseCase } from './delete-pending-order.use-case.ts'

function resetState({
  connection = null,
  currentOrder,
  deleteResult,
  initialOrder,
  pendingPurchase = null,
  releaseTransitioned = false,
  userId = 1,
}: {
  connection?: { accessTokenEncrypted: string | null } | null
  currentOrder?: Order | null
  deleteResult: boolean
  initialOrder: Order | null
  pendingPurchase?: typeof state.pendingPurchase
  releaseTransitioned?: boolean
  userId?: number | null
}) {
  vi.clearAllMocks()
  state.connection = connection
  state.currentOrder = currentOrder ?? initialOrder
  state.deleteResult = deleteResult
  state.initialOrder = initialOrder
  state.pendingPurchase = pendingPurchase
  state.releaseTransitioned = releaseTransitioned
  state.userId = userId
  findOrderCallCount = 0
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

test('expires the provider preference before deleting an owned pending order', async () => {
  resetState({
    initialOrder: { status: PAYMENT_STATUS.PENDING, externalOrderId: 'preference-1' },
    deleteResult: true,
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

test('rejects deletion of an owned non-pending order', async () => {
  resetState({
    initialOrder: { status: PAYMENT_STATUS.COMPLETED, externalOrderId: 'preference-1' },
    deleteResult: false,
  })
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'ConflictException',
    message: 'order.DELETE_NOT_PENDING',
  })
})

test('retains the local order when preference expiration fails', async () => {
  resetState({
    initialOrder: { status: PAYMENT_STATUS.PENDING, externalOrderId: 'preference-1' },
    deleteResult: true,
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

test('returns not found when the buyer does not own an order', async () => {
  resetState({ initialOrder: null, deleteResult: false })
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'NotFoundException',
    message: 'order.NOT_FOUND',
  })
})

test('rejects deletion when reconciliation completes the order concurrently', async () => {
  resetState({
    initialOrder: { status: PAYMENT_STATUS.PENDING, externalOrderId: null },
    currentOrder: { status: PAYMENT_STATUS.COMPLETED, externalOrderId: null },
    deleteResult: false,
  })
  const useCase = await createUseCase({ expirePreference: async () => undefined })

  await expect(useCase.execute('buyer-1', 'order-1')).rejects.toMatchObject({
    name: 'ConflictException',
    message: 'order.DELETE_NOT_PENDING',
  })
})

test('uses the payment attempt credential snapshot after its organization reconnects or disconnects', async () => {
  resetState({
    initialOrder: null,
    deleteResult: false,
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
    initialOrder: null,
    deleteResult: false,
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
    initialOrder: null,
    deleteResult: false,
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
