import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { PURCHASE_STATUS } from '@repo/types/enums'
import { createBaseColumns } from './base.ts'
import { users } from './user.ts'

export const purchases = pgTable(
  'purchases',
  {
    ...createBaseColumns('purchases'),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', {
      enum: [
        PURCHASE_STATUS.PENDING,
        PURCHASE_STATUS.CONFIRMED,
        PURCHASE_STATUS.EXPIRED,
        PURCHASE_STATUS.CANCELLED,
      ],
    })
      .notNull()
      .default(PURCHASE_STATUS.PENDING),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2, mode: 'number' }),
    platformFeeAmount: numeric('platform_fee_amount', { precision: 12, scale: 2, mode: 'number' }),
    providerFeeQuotedAmount: numeric('provider_fee_quoted_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    pricingPolicyVersion: varchar('pricing_policy_version', { length: 64 }),
    isProviderFeeEstimated: integer('is_provider_fee_estimated'),
    currency: varchar('currency', { length: 3 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    stateVersion: integer('state_version').notNull().default(0),
  },
  (table) => [
    check('purchases_total_amount_non_negative', sql`${table.totalAmount} >= 0`),
    check(
      'purchases_status_valid',
      sql`${table.status} in (${PURCHASE_STATUS.PENDING}, ${PURCHASE_STATUS.CONFIRMED}, ${PURCHASE_STATUS.EXPIRED}, ${PURCHASE_STATUS.CANCELLED})`
    ),
    index('purchases_user_created_at_idx').on(table.userId, table.createdAt),
    index('purchases_pending_expires_at_idx')
      .on(table.expiresAt)
      .where(sql`${table.status} = ${PURCHASE_STATUS.PENDING}`),
  ]
)

export type PurchaseSelect = typeof purchases.$inferSelect
export type PurchaseInsert = typeof purchases.$inferInsert
