import { z } from 'zod'
import { TICKET_SALES_FILTER, TICKET_STATUS } from '@repo/types'
import { paginationSchema, uuidSchema } from './common.ts'

export const ticketSoldDocumentIdSchema = z.string().trim().min(1).max(255)

export const ticketStatusSchema = z.enum([TICKET_STATUS.ACTIVE, TICKET_STATUS.INACTIVE])

export const ticketTypeDocumentIdSchema = uuidSchema

const ticketFormTypeDocumentIdSchema = z
  .string()
  .trim()
  .min(1, 'validation:field.ticket.typeRequired')
  .pipe(ticketTypeDocumentIdSchema)

export const createTicketTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>

export const ticketSalesFilterSchema = z.enum([
  TICKET_SALES_FILTER.SOLD,
  TICKET_SALES_FILTER.UNSOLD,
])

function isValidDateTimeString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

function isEmptyOrValidDateTimeString(value: string): boolean {
  return value.length === 0 || isValidDateTimeString(value)
}

const saleStartDateTimeStringSchema = z
  .string()
  .trim()
  .min(1, 'validation:field.ticket.saleStartRequired')
  .refine(isEmptyOrValidDateTimeString, 'validation:field.ticket.saleDateInvalid')

const saleEndDateTimeStringSchema = z
  .string()
  .trim()
  .min(1, 'validation:field.ticket.saleEndRequired')
  .refine(isEmptyOrValidDateTimeString, 'validation:field.ticket.saleDateInvalid')

const saleStartDateSchema = z.coerce.date({ message: 'validation:field.ticket.saleStartRequired' })

const saleEndDateSchema = z.coerce.date({ message: 'validation:field.ticket.saleEndRequired' })

const ticketSaleDateRangeRefine = {
  refine: (data: { saleStartsAt: string; saleEndsAt: string }) => {
    if (!data.saleStartsAt || !data.saleEndsAt) {
      return true
    }

    const start = new Date(data.saleStartsAt)
    const end = new Date(data.saleEndsAt)

    return end >= start
  },
  message: 'validation:field.ticket.saleEndAfterStart' as const,
  path: ['saleEndsAt'] as const,
}

const ticketSaleDateRangeRefineApi = {
  refine: (data: { saleStartsAt: Date; saleEndsAt: Date }) => {
    return data.saleEndsAt >= data.saleStartsAt
  },
  message: 'validation:field.ticket.saleEndAfterStart' as const,
  path: ['saleEndsAt'] as const,
}

const ticketBaseSchema = z
  .object({
    ticketTypeId: ticketTypeDocumentIdSchema,
    price: z.coerce.number().positive('validation:field.ticket.price'),
    quantity: z.coerce.number().int().positive('validation:field.ticket.quantity'),
    description: z.string().trim().min(1, 'validation:field.ticket.description'),
    saleStartsAt: saleStartDateSchema,
    saleEndsAt: saleEndDateSchema,
    status: ticketStatusSchema.default(TICKET_STATUS.ACTIVE),
    // Seed and real rows use documentId strings; not all seeds are UUID-shaped.
    eventId: z.string().trim().min(1, 'validation:field.ticket.event'),
  })
  .refine(ticketSaleDateRangeRefineApi.refine, {
    message: ticketSaleDateRangeRefineApi.message,
    path: [...ticketSaleDateRangeRefineApi.path],
  })

const quantityStringSchema = z
  .string()
  .trim()
  .min(1, 'validation:field.ticket.quantity')
  .regex(/^\d+$/, 'validation:field.ticket.quantity')

const priceStringSchema = z.string().trim().min(1, 'validation:field.ticket.price')

export const ticketFormSchema = z
  .object({
    eventId: z.string().trim().min(1, 'validation:field.ticket.event'),
    ticketTypeId: ticketFormTypeDocumentIdSchema,
    price: priceStringSchema,
    quantity: quantityStringSchema,
    description: z.string().trim().min(1, 'validation:field.ticket.description'),
    saleStartsAt: saleStartDateTimeStringSchema,
    saleEndsAt: saleEndDateTimeStringSchema,
    status: ticketStatusSchema,
  })
  .refine(ticketSaleDateRangeRefine.refine, {
    message: ticketSaleDateRangeRefine.message,
    path: [...ticketSaleDateRangeRefine.path],
  })

export type TicketFormValues = z.infer<typeof ticketFormSchema>

export function isTicketSaleEndAtOrBeforeEventStart(
  saleEndsAt: Date,
  eventStartsAt: Date
): boolean {
  return saleEndsAt <= eventStartsAt
}

export function parseTicketFormToCreateInput(values: TicketFormValues): CreateTicketInput {
  return createTicketSchema.parse(values)
}

export function parseTicketFormToUpdateInput(values: TicketFormValues): UpdateTicketInput {
  return updateTicketSchema.parse({
    ticketTypeId: values.ticketTypeId,
    price: values.price,
    quantity: values.quantity,
    description: values.description,
    saleStartsAt: values.saleStartsAt,
    saleEndsAt: values.saleEndsAt,
    status: values.status,
    eventId: values.eventId,
  })
}

export const createTicketSchema = ticketBaseSchema

export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const updateTicketSchema = ticketBaseSchema

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>

export const listTicketsQuerySchema = paginationSchema.extend({
  status: ticketStatusSchema.optional(),
  locationId: uuidSchema.optional(),
  salesFilter: ticketSalesFilterSchema.optional(),
})

export type ListTicketsQueryInput = z.infer<typeof listTicketsQuerySchema>

export const listPurchasedTicketsQuerySchema = paginationSchema

export type ListPurchasedTicketsQueryInput = z.infer<typeof listPurchasedTicketsQuerySchema>

export const ticketCheckInSchema = z.object({
  token: z.string().trim().min(1).max(4096),
})

export type TicketCheckInInput = z.infer<typeof ticketCheckInSchema>

export const listScannedTicketsQuerySchema = paginationSchema.extend({
  eventId: uuidSchema,
})

export type ListScannedTicketsQueryInput = z.infer<typeof listScannedTicketsQuerySchema>
