import { check, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import {
  DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM,
  MERCADO_PAGO_SETTLEMENT_TERM,
  ORGANIZATION_PAYMENT_CONNECTION_STATUS,
  PAYMENT_PROVIDER,
} from '@repo/types'
import { createBaseColumns } from './base.ts'
import { organizations } from './organization.ts'

export const organizationPaymentConnections = pgTable(
  'organization_payment_connections',
  {
    ...createBaseColumns('organization_payment_connections'),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    provider: text('provider', { enum: [PAYMENT_PROVIDER.MERCADO_PAGO] }).notNull(),
    sellerId: text('seller_id'),
    status: text('status').notNull().default(ORGANIZATION_PAYMENT_CONNECTION_STATUS.DISCONNECTED),
    settlementTerm: text('settlement_term', {
      enum: [
        MERCADO_PAGO_SETTLEMENT_TERM.INSTANT,
        MERCADO_PAGO_SETTLEMENT_TERM.DAYS_10,
        MERCADO_PAGO_SETTLEMENT_TERM.DAYS_18,
        MERCADO_PAGO_SETTLEMENT_TERM.DAYS_35,
      ],
    })
      .notNull()
      .default(DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM),
    isLiveMode: integer('is_live_mode').notNull().default(0),
    grantedScopes: text('granted_scopes').array().notNull().default([]),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshLockToken: text('refresh_lock_token'),
    refreshLockExpiresAt: timestamp('refresh_lock_expires_at', { withTimezone: true }),
    encryptionKeyVersion: text('encryption_key_version'),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }),
    reconnectRequiredAt: timestamp('reconnect_required_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    failureCode: text('failure_code'),
  },
  (table) => [
    uniqueIndex('organization_payment_connections_provider_organization_unique').on(
      table.organizationId,
      table.provider
    ),
    uniqueIndex('organization_payment_connections_provider_seller_unique')
      .on(table.provider, table.sellerId)
      .where(sql`${table.sellerId} is not null`),
    check(
      'organization_payment_connections_settlement_term_valid',
      sql`${table.settlementTerm} in ('instant', '10_days', '18_days', '35_days')`
    ),
    index('organization_payment_connections_active_lookup_idx').on(
      table.organizationId,
      table.status
    ),
  ]
)

export type OrganizationPaymentConnectionSelect = typeof organizationPaymentConnections.$inferSelect
