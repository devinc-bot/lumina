import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createBaseColumns } from './base.ts'
import { organizations } from './organization.ts'

export const mercadoPagoOAuthStates = pgTable(
  'mercado_pago_oauth_states',
  {
    ...createBaseColumns('mercado_pago_oauth_states'),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    ownerDocumentId: text('owner_document_id').notNull(),
    stateHash: text('state_hash').notNull().unique('mercado_pago_oauth_states_hash_unique'),
    codeVerifierEncrypted: text('code_verifier_encrypted').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    otpVerifiedAt: timestamp('otp_verified_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [index('mercado_pago_oauth_states_expiry_idx').on(table.expiresAt)]
)
