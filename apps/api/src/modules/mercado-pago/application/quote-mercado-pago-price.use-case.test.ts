import { beforeEach, expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  findConnectedMercadoPagoConnectionByOrganizationId: vi.fn(),
  findPublicTicketByDocumentId: vi.fn(),
}))

vi.mock('@repo/db', () => repositories)

import { QuoteMercadoPagoPriceUseCase } from './quote-mercado-pago-price.use-case.ts'

beforeEach(() => {
  vi.clearAllMocks()
  repositories.findPublicTicketByDocumentId.mockResolvedValue({
    organizationId: 44,
    price: 100,
  })
  repositories.findConnectedMercadoPagoConnectionByOrganizationId.mockResolvedValue({
    id: 91,
    settlementTerm: '10_days',
  })
})

test('quotes a public ticket with its organization connection settlement rate', async () => {
  const useCase = new QuoteMercadoPagoPriceUseCase()

  await expect(
    useCase.execute({
      ticketId: '799d9f7d-0883-46d8-a4fa-5ba49b42bd50',
      quantity: 1,
      currency: 'ARS',
    })
  ).resolves.toMatchObject({
    providerFeeQuotedBps: 439,
    providerFeeQuotedAmount: 578,
    providerFeeTaxAmount: 101,
    totalAmount: 10_878,
  })

  expect(repositories.findConnectedMercadoPagoConnectionByOrganizationId).toHaveBeenCalledWith(44)
})
