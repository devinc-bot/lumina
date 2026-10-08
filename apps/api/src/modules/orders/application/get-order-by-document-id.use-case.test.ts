import { expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId: vi.fn(),
}))

vi.mock('@repo/db', () => repositories)

import { GetOrderByDocumentIdUseCase } from './get-order-by-document-id.use-case.ts'

test('returns not found from normalized purchases without a legacy order fallback', async () => {
  repositories.findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId.mockResolvedValue(null)
  const useCase = new GetOrderByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  await expect(useCase.execute('buyer-1', 'purchase-1')).rejects.toMatchObject({
    name: 'NotFoundException',
    message: 'order.NOT_FOUND',
  })
})

test('returns the owned purchase details needed by the checkout confirmation ticket', async () => {
  const purchase = {
    documentId: 'purchase-1',
    purchaseStatus: 'confirmed',
    paymentStatus: 'approved',
    amount: 2500,
    quantity: 1,
    provider: 'mercado_pago',
    paidAt: new Date('2026-10-06T12:00:00.000Z'),
    createdAt: new Date('2026-10-06T11:55:00.000Z'),
    updatedAt: new Date('2026-10-06T12:00:00.000Z'),
    ticketId: 'ticket-1',
    ticketType: { documentId: 'ticket-type-1', name: 'General' },
    eventId: 'event-1',
    eventName: 'Late night',
    eventStartsAt: new Date('2026-10-10T22:00:00.000Z'),
  }
  repositories.findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId.mockResolvedValue(purchase)
  const useCase = new GetOrderByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  await expect(useCase.execute('buyer-1', 'purchase-1')).resolves.toMatchObject({
    documentId: 'purchase-1',
    eventName: 'Late night',
    ticketType: { name: 'General' },
    status: 'completed',
  })
  expect(repositories.findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId).toHaveBeenCalledWith(
    'purchase-1',
    'buyer-1'
  )
})
