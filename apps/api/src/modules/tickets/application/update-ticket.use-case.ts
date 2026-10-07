import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import {
  findAvailableTicketTypeByDocumentId,
  findConnectedMercadoPagoConnectionByOrganizationId,
  findEventOwnedByOwnerDocumentId,
  findTicketWithRelationsOwnedByOwner,
  upsertTicketWithinEventCapacity,
} from '@repo/db'
import { TranslationService } from '@repo/i18n/server'
import type { TicketResponse } from '@repo/types'
import { isTicketSaleEndAtOrBeforeEventStart, type UpdateTicketInput } from '@repo/validators'
import { TICKET_ERROR_CODE } from '@repo/i18n'
import { TICKET_CAPACITY_RESULT, TICKET_STATUS } from '@repo/types'
import { ENV } from '../../../config/env'
import { toTicketResponse, toTicketUpsertInput } from '../mappers/tickets.mapper'

@Injectable()
export class UpdateTicketUseCase {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  async execute(
    ownerDocumentId: string,
    documentId: string,
    input: UpdateTicketInput
  ): Promise<TicketResponse> {
    const existing = await findTicketWithRelationsOwnedByOwner(documentId, ownerDocumentId)

    if (!existing) {
      throw new NotFoundException(this.ts.translateError('ticket.NOT_FOUND'))
    }

    const event = await this.resolveEvent(ownerDocumentId, input.eventId)
    if (!isTicketSaleEndAtOrBeforeEventStart(input.saleEndsAt, event.startsAt)) {
      throw new BadRequestException(
        this.ts.translateError(TICKET_ERROR_CODE.SALE_END_AFTER_EVENT_START)
      )
    }

    if (input.status === TICKET_STATUS.ACTIVE && ENV.MERCADOPAGO_MARKETPLACE_ENABLED) {
      if (!(await findConnectedMercadoPagoConnectionByOrganizationId(event.organizationId))) {
        throw new BadRequestException(
          this.ts.translateError(TICKET_ERROR_CODE.MERCADO_PAGO_CONNECTION_REQUIRED)
        )
      }
    }
    const ticketType = await findAvailableTicketTypeByDocumentId(
      input.ticketTypeId,
      ownerDocumentId
    )

    if (!ticketType) {
      throw new NotFoundException(this.ts.translateError('ticketType.NOT_FOUND'))
    }

    let result: Awaited<ReturnType<typeof upsertTicketWithinEventCapacity>>
    try {
      result = await upsertTicketWithinEventCapacity(
        toTicketUpsertInput(input, event.id, ticketType.id),
        documentId
      )
    } catch {
      throw new InternalServerErrorException(this.ts.translateError('ticket.UPDATE_FAILED'))
    }

    if (result.status === TICKET_CAPACITY_RESULT.CAPACITY_EXCEEDED) {
      throw new BadRequestException(this.ts.translateError(TICKET_ERROR_CODE.CAPACITY_EXCEEDED))
    }

    return toTicketResponse(
      result.ticket.ticket,
      result.ticket.ticketType,
      result.ticket.event,
      result.ticket.location
    )
  }

  private async resolveEvent(ownerDocumentId: string, eventDocumentId: string) {
    const event = await findEventOwnedByOwnerDocumentId(eventDocumentId, ownerDocumentId)

    if (!event) {
      throw new NotFoundException(this.ts.translateError('ticket.EVENT_NOT_FOUND'))
    }

    return event
  }
}
