import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { findPurchasesPaginatedByUserDocumentId } from '@repo/db'
import { ORDER_ERROR_CODE } from '@repo/i18n/constants'
import { TranslationService } from '@repo/i18n/server'
import type { BuyerOrderSummaryResponse, PaginatedResponse } from '@repo/types'
import type { ListOrdersQueryInput } from '@repo/validators'
import { toBuyerPurchaseSummaryResponse } from '../mappers/orders.mapper'

@Injectable()
export class ListMyOrdersUseCase {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  async execute(
    userDocumentId: string,
    query: ListOrdersQueryInput
  ): Promise<PaginatedResponse<BuyerOrderSummaryResponse>> {
    try {
      const result = await findPurchasesPaginatedByUserDocumentId({
        userDocumentId,
        page: query.page,
        limit: query.limit,
      })

      return {
        data: result.rows.map(toBuyerPurchaseSummaryResponse),
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
      }
    } catch {
      throw new InternalServerErrorException(this.ts.translateError(ORDER_ERROR_CODE.LIST_FAILED))
    }
  }
}
