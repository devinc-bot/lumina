import { z } from 'zod'
import { paginationSchema, uuidSchema } from './common.ts'

export const createOrderSchema = z.object({
  ticketId: uuidSchema,
  quantity: z.coerce.number().int().positive('validation:field.order.quantity'),
  expectedTotalAmount: z.coerce.number().int().nonnegative().optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const listOrdersQuerySchema = paginationSchema

export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>
