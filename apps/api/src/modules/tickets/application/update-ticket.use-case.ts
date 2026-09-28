import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import {
  findEventOwnedByOwnerDocumentId,
  findAvailableTicketTypeByDocumentId,
  findTicketWithRelationsOwnedByOwner,
  updateTicketByDocumentId,
  findConnectedMercadoPagoConnectionByOrganizationId,
} from '@repo/db'
import { TranslationService } from '@repo/i18n/server'
import type { TicketResponse } from '@repo/types'
import type { UpdateTicketInput } from '@repo/validators'
import { TICKET_ERROR_CODE } from '@repo/i18n'
import { TICKET_STATUS } from '@repo/types'
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

    const eventId = await this.resolveEventId(ownerDocumentId, input.eventId)
    if (input.status === TICKET_STATUS.ACTIVE && ENV.MERCADOPAGO_MARKETPLACE_ENABLED) {
      const event = await findEventOwnedByOwnerDocumentId(input.eventId, ownerDocumentId)
      if (
        !event ||
        !(await findConnectedMercadoPagoConnectionByOrganizationId(event.organizationId))
      ) {
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

    try {
      const row = await updateTicketByDocumentId(
        documentId,
        toTicketUpsertInput(input, eventId, ticketType.id)
      )
      return toTicketResponse(row.ticket, row.ticketType, row.event, row.location)
    } catch {
      throw new InternalServerErrorException(this.ts.translateError('ticket.UPDATE_FAILED'))
    }
  }

  private async resolveEventId(
    ownerDocumentId: string,
    eventDocumentId?: string
  ): Promise<number | null> {
    if (!eventDocumentId) {
      return null
    }

    const event = await findEventOwnedByOwnerDocumentId(eventDocumentId, ownerDocumentId)

    if (!event) {
      throw new NotFoundException(this.ts.translateError('ticket.EVENT_NOT_FOUND'))
    }

    return event.id
  }
}
