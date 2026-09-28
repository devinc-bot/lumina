import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_PROVIDER } from '@repo/types/enums'
import { createBaseColumns } from './base.ts'
import { purchases } from './purchase.ts'
import { organizationPaymentConnections } from './organization-payment-connection.ts'

export const payments = pgTable(
  'payments',
  {
    ...createBaseColumns('payments'),
    purchaseId: integer('purchase_id')
      .notNull()
      .references(() => purchases.id),
    provider: text('provider', { enum: [PAYMENT_PROVIDER.MERCADO_PAGO] }).notNull(),
    status: text('status', {
      enum: [
        PAYMENT_ATTEMPT_STATUS.PENDING,
        PAYMENT_ATTEMPT_STATUS.APPROVED,
        PAYMENT_ATTEMPT_STATUS.REJECTED,
        PAYMENT_ATTEMPT_STATUS.CANCELLED,
      ],
    })
      .notNull()
      .default(PAYMENT_ATTEMPT_STATUS.PENDING),
    amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    credentialSource: text('credential_source').notNull().default('organization_connection'),
    organizationPaymentConnectionId: integer('organization_payment_connection_id').references(
      () => organizationPaymentConnections.id
    ),
    providerSellerId: text('provider_seller_id'),
    credentialAccessTokenEncrypted: text('credential_access_token_encrypted'),
    credentialRefreshTokenEncrypted: text('credential_refresh_token_encrypted'),
    credentialAccessTokenExpiresAt: timestamp('credential_access_token_expires_at', {
      withTimezone: true,
    }),
    providerPreferenceId: text('provider_preference_id'),
    providerPaymentId: text('provider_payment_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    reconciliationError: text('reconciliation_error'),
    providerFeeActualAmount: numeric('provider_fee_actual_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    providerFinancingFeeAmount: numeric('provider_financing_fee_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    providerTaxesAmount: numeric('provider_taxes_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    marketplaceFeeActualAmount: numeric('marketplace_fee_actual_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    ownerNetAmount: numeric('owner_net_amount', { precision: 12, scale: 2, mode: 'number' }),
  },
  (table) => [
    check('payments_amount_non_negative', sql`${table.amount} >= 0`),
    check('payments_provider_valid', sql`${table.provider} = ${PAYMENT_PROVIDER.MERCADO_PAGO}`),
    check(
      'payments_status_valid',
      sql`${table.status} in (${PAYMENT_ATTEMPT_STATUS.PENDING}, ${PAYMENT_ATTEMPT_STATUS.APPROVED}, ${PAYMENT_ATTEMPT_STATUS.REJECTED}, ${PAYMENT_ATTEMPT_STATUS.CANCELLED})`
    ),
    index('payments_purchase_created_at_idx').on(table.purchaseId, table.createdAt),
    uniqueIndex('payments_provider_preference_unique')
      .on(table.provider, table.providerPreferenceId)
      .where(sql`${table.providerPreferenceId} is not null`),
    uniqueIndex('payments_provider_payment_unique')
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} is not null`),
  ]
)

export type PaymentSelect = typeof payments.$inferSelect
export type PaymentInsert = typeof payments.$inferInsert
