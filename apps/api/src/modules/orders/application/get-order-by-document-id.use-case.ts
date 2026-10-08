import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId } from '@repo/db'
import { ORDER_ERROR_CODE } from '@repo/i18n'
import { TranslationService } from '@repo/i18n/server'
import { type BuyerOrderSummaryResponse } from '@repo/types'
import { toBuyerPurchaseSummaryResponse } from '../mappers/orders.mapper'

@Injectable()
export class GetOrderByDocumentIdUseCase {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  async execute(
    userDocumentId: string,
    orderDocumentId: string
  ): Promise<BuyerOrderSummaryResponse> {
    const purchase = await findBuyerPurchaseSummaryByDocumentIdAndUserDocumentId(
      orderDocumentId,
      userDocumentId
    )
    if (purchase) {
      return toBuyerPurchaseSummaryResponse(purchase)
    }

    throw new NotFoundException(this.ts.translateError(ORDER_ERROR_CODE.NOT_FOUND))
  }
}
