import { expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  findPurchaseByDocumentIdAndUserId: vi.fn(),
  findUserIdByDocumentId: vi.fn(),
}))

vi.mock('@repo/db', () => repositories)

import { GetOrderByDocumentIdUseCase } from './get-order-by-document-id.use-case.ts'

test('returns not found from normalized purchases without a legacy order fallback', async () => {
  repositories.findUserIdByDocumentId.mockResolvedValue(1)
  repositories.findPurchaseByDocumentIdAndUserId.mockResolvedValue(null)
  const useCase = new GetOrderByDocumentIdUseCase({
    translateError: (code: string) => code,
  } as never)

  await expect(useCase.execute('buyer-1', 'purchase-1')).rejects.toMatchObject({
    name: 'NotFoundException',
    message: 'order.NOT_FOUND',
  })
})
