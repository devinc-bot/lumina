import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  findEventImageAssetsByEventIds,
  findConnectedMercadoPagoConnectionByOrganizationId,
  findLocationImageAssetsByLocationIds,
  findPublishedEventBySlug,
  findTicketsWithCompletedSalesByEventId,
} from '@repo/db'
import { TranslationService } from '@repo/i18n/server'
import { TICKET_STATUS, type PublicEventDetailResponse } from '@repo/types'
import { ENV } from '../../../config/env'
import {
  groupEventImagesByEventId,
  toEventImageResponse,
  toPublicEventDetailResponse,
  toPublicPurchasableTicketResponse,
} from '../mappers/events.mapper'

function isTicketOnSale(ticket: {
  status: string
  saleStartsAt: Date | null
  saleEndsAt: Date | null
}) {
  const now = new Date()

  return (
    ticket.status === TICKET_STATUS.ACTIVE &&
    (!ticket.saleStartsAt || ticket.saleStartsAt <= now) &&
    (!ticket.saleEndsAt || ticket.saleEndsAt >= now)
  )
}

@Injectable()
export class GetPublicEventByDocumentIdUseCase {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  async execute(slug: string): Promise<PublicEventDetailResponse> {
    const row = await findPublishedEventBySlug(slug)

    if (!row) {
      throw new NotFoundException(this.ts.translateError('event.NOT_FOUND'))
    }

    const [eventImageRows, locationImageRows, ticketRows, connection] = await Promise.all([
      findEventImageAssetsByEventIds([row.event.id]),
      findLocationImageAssetsByLocationIds([row.location.id]),
      findTicketsWithCompletedSalesByEventId(row.event.id),
      ENV.MERCADOPAGO_MARKETPLACE_ENABLED
        ? findConnectedMercadoPagoConnectionByOrganizationId(row.event.organizationId)
        : Promise.resolve(null),
    ])

    const imagesByEventId = groupEventImagesByEventId(eventImageRows)
    const locationImages = locationImageRows.map(({ asset }) => toEventImageResponse(asset))

    return toPublicEventDetailResponse(
      row.event,
      row.location,
      row.address,
      imagesByEventId.get(row.event.id) ?? [],
      locationImages,
      row.faqs,
      row.organizer,
      ticketRows
        .filter(({ ticket }) => isTicketOnSale(ticket))
        .map(({ ticket, ticketType, completedSalesQuantity, reservedQuantity }) =>
          toPublicPurchasableTicketResponse(
            ticket,
            ticketType,
            completedSalesQuantity,
            reservedQuantity
          )
        ),
      Boolean(ENV.MERCADOPAGO_MARKETPLACE_ENABLED && connection)
    )
  }
}
