import { z } from 'zod'

export const uuidSchema = z.uuid()

export const booleanStringSchema = z.enum(['true', 'false']).transform((value) => value === 'true')

/** URL-safe public identifier. UUIDs stay reserved for internal contracts. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine((value) => !uuidSchema.safeParse(value).success)

/**
 * Phone: optional leading `+`, digits with spaces/dashes/parens.
 * Requires 8–15 digits (E.164 upper bound); rejects letters/emoji.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(30, 'validation:field.phone.tooLong')
  .refine((value) => {
    if (!/^\+?[\d\s()-]+$/.test(value)) {
      return false
    }

    const digits = value.replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15
  }, 'validation:field.phone.invalid')

/** Accepts empty string / null and coerces valid date strings; yields `undefined` when absent. */
export const optionalCoercedDateSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length === 0 ? undefined : trimmed
  }

  return value
}, z.coerce.date().optional())

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type PaginationInput = z.infer<typeof paginationSchema>
