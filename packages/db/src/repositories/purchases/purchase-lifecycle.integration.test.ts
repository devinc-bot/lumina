import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { MARKETPLACE_PRICING_POLICY_VERSION, PAYMENT_CREDENTIAL_SOURCE } from '@repo/types'
import { loadTestDatabaseEnv } from '../../config/env.loader.ts'

const testDatabaseUrl = process.env.DATABASE_TEST_URL
const integration = testDatabaseUrl
  ? await (async () => {
      const { DATABASE_TEST_URL } = loadTestDatabaseEnv()
      process.env.DATABASE_URL = DATABASE_TEST_URL
      const [{ Pool }, { closeDatabaseConnection }, repositories] = await Promise.all([
        import('pg'),
        import('../../client.ts'),
        import('./index.ts'),
      ])
      return {
        closeDatabaseConnection,
        pool: new Pool({ connectionString: DATABASE_TEST_URL }),
        repositories,
      }
    })()
  : null

if (integration) {
  describe('purchase lifecycle transactions', () => {
    const { closeDatabaseConnection, pool, repositories } = integration
    const now = new Date('2026-09-01T12:00:00.000Z')
    function marketplaceCheckoutInput(input: {
      userId: number
      ticketId: number
      quantity: number
      expiresAt: Date
      now: Date
      providerSellerId?: string | null
    }) {
      const subtotalAmount = 10_000 * input.quantity
      const platformFeeAmount = Math.ceil((subtotalAmount * 300) / 10_000)
      const totalAmount = Math.ceil(
        ((subtotalAmount + platformFeeAmount) * 10_000 * 10_000) /
          (10_000 * 10_000 - 500 * (10_000 + 2_100))
      )
      const providerFeeQuotedAmount = totalAmount - subtotalAmount - platformFeeAmount
      const providerFeeTaxAmount = Math.ceil((providerFeeQuotedAmount * 2_100) / 12_100)
      const marketplacePriceBreakdown = {
        subtotalAmount,
        platformFeeAmount,
        providerFeeQuotedAmount,
        providerFeeTaxAmount,
        totalAmount,
        expectedOwnerProceedsAmount: subtotalAmount,
        currency: 'ARS' as const,
        platformFeeBps: 300,
        providerFeeQuotedBps: 500,
        pricingPolicyVersion: MARKETPLACE_PRICING_POLICY_VERSION,
        isProviderFeeEstimated: true,
      }
      return {
        ...input,
        currency: 'ARS' as const,
        priceBreakdown: marketplacePriceBreakdown,
        credentialSource: PAYMENT_CREDENTIAL_SOURCE.ORGANIZATION_CONNECTION,
        organizationPaymentConnectionId: null,
        providerSellerId: input.providerSellerId ?? null,
        credentialAccessTokenEncrypted: null,
        credentialRefreshTokenEncrypted: null,
        credentialAccessTokenExpiresAt: null,
      }
    }

    async function createTicket(quantity: number): Promise<{ ticketId: number; userId: number }> {
      const user = await pool.query<{ id: number }>(
        "insert into users (name, last_name, phone) values ('Integration', 'Buyer', '000') returning id"
      )
      const ticketType = await pool.query<{ id: number }>(
        "insert into ticket_types (name) values ('Integration') returning id"
      )
      const ticket = await pool.query<{ id: number }>(
        'insert into tickets (price, quantity, description, ticket_type_id) values (100.00, $1, $2, $3) returning id',
        [quantity, 'Integration ticket', ticketType.rows[0]?.id]
      )
      const userId = user.rows[0]?.id
      const ticketId = ticket.rows[0]?.id
      if (!userId || !ticketId) throw new Error('Integration fixture insertion failed')
      return { ticketId, userId }
    }

    beforeEach(async () => {
      await pool.query(`
      truncate table
        payment_webhook_events,
        tickets_sold,
        inventory_reservations,
        payments,
        purchase_items,
        purchases,
        tickets,
        ticket_types,
        users
      restart identity cascade
    `)
    })

    afterAll(async () => {
      await pool.end()
      await closeDatabaseConnection()
    })

    test('allows exactly one concurrent reservation for the final ticket', async () => {
      const { ticketId, userId } = await createTicket(1)
      const input = marketplaceCheckoutInput({
        userId,
        ticketId,
        quantity: 1,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        now,
      })

      const reservations = await Promise.all([
        repositories.reserveSingleTicketCheckout(input),
        repositories.reserveSingleTicketCheckout(input),
      ])

      expect(reservations.filter(Boolean)).toHaveLength(1)
      await expect(
        pool.query('select count(*)::int as count from purchases')
      ).resolves.toMatchObject({
        rows: [{ count: 1 }],
      })
    })

    test('releases an expired reservation exactly once and makes its stock available again', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(now.getTime() - 1),
          now: new Date(now.getTime() - 2),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')

      const releases = await Promise.all([
        repositories.releaseReservationOnce({
          reservationDocumentId: checkout.reservation.documentId,
          purchaseStatus: 'expired',
          reservationStatus: 'expired',
          now,
        }),
        repositories.releaseReservationOnce({
          reservationDocumentId: checkout.reservation.documentId,
          purchaseStatus: 'expired',
          reservationStatus: 'expired',
          now,
        }),
      ])

      expect(releases.filter((release) => release.transitioned)).toHaveLength(1)
      await expect(
        repositories.reserveSingleTicketCheckout(
          marketplaceCheckoutInput({
            userId,
            ticketId,
            quantity: 1,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
            now,
          })
        )
      ).resolves.not.toBeNull()
    })

    test('issues each admission once for concurrent and replayed approved webhooks', async () => {
      const { ticketId, userId } = await createTicket(2)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 2,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          now,
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'integration-preference',
        now,
      })
      const webhook = {
        providerPaymentId: 'integration-payment',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: 'integration-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { id: 'integration-payment' },
        now,
      }

      await Promise.all([
        repositories.reconcileMercadoPagoPayment(webhook),
        repositories.reconcileMercadoPagoPayment(webhook),
      ])
      await repositories.reconcileMercadoPagoPayment(webhook)

      await expect(
        pool.query('select count(*)::int as count from payment_webhook_events')
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query(
          'select unit_index from tickets_sold where purchase_item_id = $1 order by unit_index',
          [checkout.purchaseItem.id]
        )
      ).resolves.toMatchObject({ rows: [{ unit_index: 0 }, { unit_index: 1 }] })
    })

    test('does not reconcile a payment whose verified preference differs from the attempt snapshot', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          now,
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'expected-preference',
        now,
      })

      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId: 'mismatched-preference-payment',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: 'different-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { id: 'mismatched-preference-payment' },
        now,
      })

      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    })

    test('accepts matching facts and rejects each missing or mismatched Mercado Pago fact', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          now,
          providerSellerId: 'seller-expected',
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'facts-match-preference',
        now,
      })

      const verifiedFacts = {
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS' as const,
        sellerId: 'seller-expected',
        providerPreferenceId: 'facts-match-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        now,
      }
      const mismatches = [
        { name: 'amount', facts: { amount: checkout.purchase.totalAmount + 1 } },
        { name: 'currency', facts: { currency: 'USD' as const } },
        { name: 'preference', facts: { providerPreferenceId: null } },
        { name: 'seller', facts: { sellerId: 'seller-other' } },
        { name: 'missing marketplace fee', facts: { marketplaceFeeAmount: null } },
      ]

      await repositories.reconcileMercadoPagoPayment({
        ...verifiedFacts,
        providerPaymentId: 'facts-match-success',
        payload: { id: 'facts-match-success' },
      })
      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })

      for (const mismatch of mismatches) {
        await repositories.reconcileMercadoPagoPayment({
          ...verifiedFacts,
          ...mismatch.facts,
          providerPaymentId: `facts-match-${mismatch.name}`,
          payload: { id: `facts-match-${mismatch.name}` },
        })
      }

      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query(
          "select count(*)::int as count from payment_webhook_events where last_error = 'provider_fact_mismatch'"
        )
      ).resolves.toMatchObject({ rows: [{ count: 5 }] })
    })
  })
} else {
  describe.skip('purchase lifecycle transactions', () => {
    test('requires DATABASE_TEST_URL', () => {})
  })
}
