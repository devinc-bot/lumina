import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  findConnectedMercadoPagoConnectionByOrganizationId,
  findPublicTicketByDocumentId,
  findSoleOrganizationByOwnerDocumentId,
} from '@repo/db'
import {
  DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM,
  MERCADO_PAGO_SETTLEMENT_FEE_BPS,
  PAYMENT_CURRENCY,
  type PriceBreakdown,
} from '@repo/types'
import type { MarketplacePriceQuoteInput, OwnerMarketplacePriceQuoteInput } from '@repo/validators'
import { calculateMarketplacePriceBreakdown } from './mercado-pago-pricing.policy'

@Injectable()
export class QuoteMercadoPagoPriceUseCase {
  async execute(input: MarketplacePriceQuoteInput): Promise<PriceBreakdown> {
    const ticket = await findPublicTicketByDocumentId(input.ticketId)
    if (!ticket) throw new NotFoundException('Ticket was not found')
    const unitFacePriceAmount = Math.round(ticket.price * 100)
    if (!Number.isSafeInteger(unitFacePriceAmount)) {
      throw new BadRequestException('Ticket price cannot be quoted safely')
    }
    const connection = await findConnectedMercadoPagoConnectionByOrganizationId(
      ticket.organizationId
    )
    return this.calculate({
      unitFacePriceAmount,
      quantity: input.quantity,
      settlementTerm: connection?.settlementTerm,
      currency: PAYMENT_CURRENCY.ARS,
    })
  }

  async executeForOwner(
    ownerDocumentId: string,
    input: OwnerMarketplacePriceQuoteInput
  ): Promise<PriceBreakdown> {
    const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
    if (!organization) throw new NotFoundException('Owner organization was not found')
    const connection = await findConnectedMercadoPagoConnectionByOrganizationId(organization.id)
    return this.calculate({
      unitFacePriceAmount: input.unitFacePriceAmount,
      quantity: input.quantity,
      settlementTerm: connection?.settlementTerm,
      currency: input.currency,
    })
  }

  private calculate(input: {
    unitFacePriceAmount: number
    quantity: number
    settlementTerm: keyof typeof MERCADO_PAGO_SETTLEMENT_FEE_BPS | undefined
    currency: typeof PAYMENT_CURRENCY.ARS
  }): PriceBreakdown {
    const settlementTerm = input.settlementTerm ?? DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM
    return calculateMarketplacePriceBreakdown({
      ...input,
      estimatedProviderFeeBps: MERCADO_PAGO_SETTLEMENT_FEE_BPS[settlementTerm],
    })
  }
}
