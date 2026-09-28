import { beforeEach, expect, test, vi } from 'vitest'
import { TICKET_STATUS } from '@repo/types'

const repositories = vi.hoisted(() => ({
  attachProviderPreference: vi.fn(),
  findConnectedMercadoPagoConnectionByOrganizationId: vi.fn(),
  findMercadoPagoConnectionById: vi.fn(),
  findPublicTicketByDocumentId: vi.fn(),
  findUserIdByDocumentId: vi.fn(),
  releaseReservationOnce: vi.fn(),
  reserveSingleTicketCheckout: vi.fn(),
}))

const runtime = vi.hoisted(() => ({
  marketplaceEnabled: false,
}))

vi.mock('@repo/db', () => repositories)
vi.mock('../../../config/env', () => ({
  ENV: {
    API_PUBLIC_URL: 'https://api.lumina.test',
    MERCADOPAGO_ACCESS_TOKEN: 'legacy-platform-token',
    get MERCADOPAGO_MARKETPLACE_ENABLED() {
      return runtime.marketplaceEnabled
    },
    MERCADOPAGO_WEBHOOK_SECRET: 'webhook-secret',
    WEB_URL: 'https://web.lumina.test',
  },
}))
vi.mock('../../mercado-pago/mercado-pago-credential-crypto', () => ({
  encryptMercadoPagoCredential: vi.fn((value: string) => `encrypted:${value}`),
}))

import { CreatePendingOrderUseCase } from './create-pending-order.use-case.ts'

const ticket = {
  id: 17,
  documentId: '799d9f7d-0883-46d8-a4fa-5ba49b42bd50',
  organizationId: 44,
  price: 2500,
  status: TICKET_STATUS.ACTIVE,
  saleStartsAt: null,
  saleEndsAt: null,
  ticketType: { name: 'General' },
}

function createUseCase(
  createPreference = vi.fn(),
  resolve = vi.fn().mockResolvedValue('seller-token')
) {
  return {
    useCase: new CreatePendingOrderUseCase(
      { translateError: (code: string) => code } as never,
      { createPreference } as never,
      { resolve } as never
    ),
    createPreference,
    resolve,
  }
}

beforeEach(() => {
  runtime.marketplaceEnabled = false
  vi.clearAllMocks()
  repositories.findPublicTicketByDocumentId.mockResolvedValue(ticket)
  repositories.findUserIdByDocumentId.mockResolvedValue(7)
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue(null)
  repositories.findMercadoPagoConnectionById.mockResolvedValue({
    refreshTokenEncrypted: 'encrypted-refresh-token',
    accessTokenExpiresAt: new Date('2026-09-25T14:00:00.000Z'),
  })
  repositories.reserveSingleTicketCheckout.mockResolvedValue({
    purchase: {
      documentId: 'purchase-1',
      totalAmount: 2500,
      expiresAt: new Date('2026-09-25T13:15:00.000Z'),
      createdAt: new Date('2026-09-25T13:00:00.000Z'),
      updatedAt: new Date('2026-09-25T13:00:00.000Z'),
    },
    purchaseItem: { quantity: 1 },
    reservation: { documentId: 'reservation-1' },
  })
  repositories.attachProviderPreference.mockResolvedValue({ outcome: 'attached' })
  repositories.releaseReservationOnce.mockResolvedValue({ transitioned: true })
})

test('reserves checkout amounts with the seller connection settlement rate', async () => {
  runtime.marketplaceEnabled = true
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue({
    id: 91,
    sellerId: 'seller-44',
    accessTokenEncrypted: 'encrypted-seller-token',
    settlementTerm: '10_days',
  })
  const { useCase } = createUseCase(
    vi.fn().mockResolvedValue({ id: 'preference-1', initPoint: 'https://checkout.lumina.test/1' })
  )

  await useCase.execute('buyer-1', { ticketId: ticket.documentId, quantity: 1 })

  expect(repositories.reserveSingleTicketCheckout).toHaveBeenCalledWith(
    expect.objectContaining({
      priceBreakdown: expect.objectContaining({
        providerFeeQuotedBps: 439,
        providerFeeQuotedAmount: 14_446,
        providerFeeTaxAmount: 2_508,
        totalAmount: 271_946,
      }),
    })
  )
})

test('does not create a new checkout under a disabled marketplace rollout', async () => {
  const { useCase, createPreference } = createUseCase(
    vi.fn().mockResolvedValue({ id: 'preference-1', initPoint: 'https://checkout.lumina.test/1' })
  )

  await expect(
    useCase.execute('buyer-1', { ticketId: ticket.documentId, quantity: 1 })
  ).rejects.toMatchObject({
    name: 'BadRequestException',
    message: 'order.CHECKOUT_UNAVAILABLE',
  })

  expect(repositories.findConnectedMercadoPagoConnectionByOrganizationId).not.toHaveBeenCalled()
  expect(repositories.reserveSingleTicketCheckout).not.toHaveBeenCalled()
  expect(createPreference).not.toHaveBeenCalled()
})

test('returns the current quote without reserving inventory or creating a preference when the buyer quote is stale', async () => {
  runtime.marketplaceEnabled = true
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue({
    id: 91,
    sellerId: 'seller-44',
    accessTokenEncrypted: 'encrypted-seller-token',
  })
  const { useCase, createPreference } = createUseCase()

  await expect(
    useCase.execute('buyer-1', {
      ticketId: ticket.documentId,
      quantity: 1,
      expectedTotalAmount: 250_000,
    } as never)
  ).rejects.toMatchObject({
    name: 'ConflictException',
    message: 'order.QUOTE_CHANGED',
  })

  expect(repositories.reserveSingleTicketCheckout).not.toHaveBeenCalled()
  expect(createPreference).not.toHaveBeenCalled()
  expect(repositories.attachProviderPreference).not.toHaveBeenCalled()
})
