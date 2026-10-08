import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { OTP_TYPE } from '@repo/types'
import { createBaseColumns } from './base.ts'

export const otps = pgTable(
  'otps',
  {
    ...createBaseColumns('otps'),
    type: text('type', {
      enum: [OTP_TYPE.MERCADO_PAGO_CONNECTION, OTP_TYPE.MERCADO_PAGO_DISCONNECTION],
    }).notNull(),
    subjectDocumentId: text('subject_document_id').notNull(),
    scope: text('scope').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
  },
  (table) => [
    index('otps_subject_type_created_idx').on(table.subjectDocumentId, table.type, table.createdAt),
    index('otps_type_expiry_idx').on(table.type, table.expiresAt),
    check(
      'otps_type_valid',
      sql`${table.type} in (${OTP_TYPE.MERCADO_PAGO_CONNECTION}, ${OTP_TYPE.MERCADO_PAGO_DISCONNECTION})`
    ),
    check(
      'otps_failed_attempts_valid',
      sql`${table.failedAttempts} >= 0 AND ${table.failedAttempts} <= 4`
    ),
  ]
)

export type OtpSelect = typeof otps.$inferSelect
export type OtpInsert = typeof otps.$inferInsert
