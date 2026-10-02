import { expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  findPurchasesPaginatedByUserDocumentId: vi.fn(),
}))

vi.mock('@repo/db', () => repositories)

import { ListMyOrdersUseCase } from './list-my-orders.use-case.ts'

test('returns normalized purchase history with the established pagination contract', async () => {
  repositories.findPurchasesPaginatedByUserDocumentId.mockResolvedValue({
    rows: [purchase('purchase-new', 40), purchase('purchase-old', 20)],
    total: 2,
  })
  const useCase = new ListMyOrdersUseCase({ translateError: (code: string) => code } as never)

  const result = await useCase.execute('buyer-1', { page: 2, limit: 2 })

  expect(result).toMatchObject({
    total: 2,
    page: 2,
    limit: 2,
    totalPages: 1,
    data: [{ documentId: 'purchase-new' }, { documentId: 'purchase-old' }],
  })
  expect(repositories.findPurchasesPaginatedByUserDocumentId).toHaveBeenCalledWith({
    userDocumentId: 'buyer-1',
    page: 2,
    limit: 2,
  })
})

function purchase(documentId: string, createdAt: number) {
  return {
    documentId,
    purchaseStatus: 'confirmed',
    paymentStatus: 'approved',
    amount: 2500,
    quantity: 1,
    provider: 'mercado_pago',
    paidAt: new Date(createdAt),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    ticketId: 'ticket-document-id',
    ticketType: { documentId: 'type-general', name: 'General' },
    eventId: 'event-document-id',
    eventName: 'After party',
    eventStartsAt: new Date(createdAt),
  }
}
