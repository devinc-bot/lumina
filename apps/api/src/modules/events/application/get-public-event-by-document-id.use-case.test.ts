import { beforeEach, expect, test, vi } from 'vitest'
import { ORGANIZATION_PAYMENT_CONNECTION_STATUS, TICKET_STATUS } from '@repo/types'

const repositories = vi.hoisted(() => ({
  findConnectedMercadoPagoConnectionByOrganizationId: vi.fn(),
  findEventImageAssetsByEventIds: vi.fn(),
  findLocationImageAssetsByLocationIds: vi.fn(),
  findPublishedEventBySlug: vi.fn(),
  findTicketsWithCompletedSalesByEventId: vi.fn(),
}))

const runtime = vi.hoisted(() => ({ marketplaceEnabled: true }))

vi.mock('@repo/db', () => repositories)
vi.mock('../../../config/env', () => ({
  ENV: {
    API_PUBLIC_URL: 'https://api.lumina.test',
    MERCADOPAGO_ACCESS_TOKEN: 'legacy-platform-token',
    get MERCADOPAGO_MARKETPLACE_ENABLED() {
      return runtime.marketplaceEnabled
    },
    MERCADOPAGO_WEBHOOK_SECRET: 'webhook-secret',
  },
}))

import { GetPublicEventByDocumentIdUseCase } from './get-public-event-by-document-id.use-case.ts'

const event = {
  id: 31,
  documentId: '4f6f155e-1eb1-4ec6-9bfc-23bfc93a0226',
  slug: 'noche-en-el-parque',
  name: 'Noche en el parque',
  description: 'Una fiesta al aire libre',
  startsAt: new Date('2026-10-12T22:00:00.000Z'),
  endsAt: new Date('2026-10-13T04:00:00.000Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  runtime.marketplaceEnabled = true
  repositories.findPublishedEventBySlug.mockResolvedValue({
    event: { ...event, organizationId: 72 },
    location: { id: 19, name: 'Parque Central' },
    address: null,
    faqs: [],
    organizer: {
      documentId: 'owner-1',
      slug: 'organizador',
      organizationName: 'Eventos Lumina',
      name: 'Ada',
      lastName: 'Lovelace',
      avatar: null,
    },
  })
  repositories.findEventImageAssetsByEventIds.mockResolvedValue([])
  repositories.findLocationImageAssetsByLocationIds.mockResolvedValue([])
  repositories.findTicketsWithCompletedSalesByEventId.mockResolvedValue([
    {
      ticket: {
        documentId: 'ticket-1',
        price: 2500,
        quantity: 100,
        status: TICKET_STATUS.ACTIVE,
        saleStartsAt: null,
        saleEndsAt: null,
      },
      ticketType: { documentId: 'general', name: 'General' },
      completedSalesQuantity: 0,
      reservedQuantity: 0,
    },
  ])
})

test('returns public payment readiness from the event organization connection, not the platform credential', async () => {
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue({
    id: 83,
    status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED,
  })
  const useCase = new GetPublicEventByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  const response = await useCase.execute(event.slug)

  expect(repositories.findConnectedMercadoPagoConnectionByOrganizationId).toHaveBeenCalledWith(72)
  expect(response.paymentsReady).toBe(true)
})

test('reports payment unavailable when this event organization has no connected seller account', async () => {
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue(null)
  const useCase = new GetPublicEventByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  const response = await useCase.execute(event.slug)

  expect(repositories.findConnectedMercadoPagoConnectionByOrganizationId).toHaveBeenCalledWith(72)
  expect(response.paymentsReady).toBe(false)
})

test('reports payment unavailable when marketplace checkout is disabled even if the organization remains connected', async () => {
  runtime.marketplaceEnabled = false
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue({
    id: 83,
    status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED,
  })
  const useCase = new GetPublicEventByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  const response = await useCase.execute(event.slug)

  expect(repositories.findConnectedMercadoPagoConnectionByOrganizationId).not.toHaveBeenCalled()
  expect(response.paymentsReady).toBe(false)
})
