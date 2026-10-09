import { TICKET_STATUS, type TicketResponse } from '@repo/types'
import type { TicketFormValues } from '@repo/validators'
import type { TicketRecordItem } from '~/modules/tickets/components/ticket-record'

export const EMPTY_TICKET_FORM_VALUES: TicketFormValues = {
  eventId: '',
  ticketTypeId: '',
  price: '',
  quantity: '',
  description: '',
  saleStartsAt: '',
  saleEndsAt: '',
  status: TICKET_STATUS.ACTIVE,
}

function formatDateForDatetimeLocal(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function ticketResponseToFormValues(ticket: TicketResponse): TicketFormValues {
  return {
    eventId: ticket.eventId ?? '',
    ticketTypeId: ticket.ticketType.documentId,
    price: String(ticket.price),
    quantity: String(ticket.quantity),
    description: ticket.description,
    saleStartsAt: ticket.saleStartsAt
      ? formatDateForDatetimeLocal(new Date(ticket.saleStartsAt))
      : '',
    saleEndsAt: ticket.saleEndsAt ? formatDateForDatetimeLocal(new Date(ticket.saleEndsAt)) : '',
    status: ticket.status,
  }
}

export function ticketResponseToRecordItem(ticket: TicketResponse): TicketRecordItem {
  return {
    id: ticket.documentId,
    clubName: ticket.locationName ?? '—',
    eventName: ticket.eventName ?? '—',
    eventImageUrl: ticket.eventImageUrl,
    ticketType: ticket.ticketType.name,
    description: ticket.description,
    price: ticket.price,
    quantity: ticket.quantity,
    totalSold: ticket.totalSold,
    revenue: ticket.revenue,
    status: ticket.status,
  }
}
