import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { MARKETPLACE_PRICING_POLICY_VERSION, PAYMENT_CREDENTIAL_SOURCE } from '@repo/types'
import { loadTestDatabaseEnv } from '../../config/env.loader.ts'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

type CheckoutDataRetentionResult = {
  deletedReservations: number
  minimizedWebhookPayloads: number
  dissociatedPurchases: number
}

type CheckoutDataRetentionRepositories = {
  runCheckoutDataRetention(input: {
    now: Date
    mode: 'dry-run' | 'apply'
    batchSize: number
  }): Promise<CheckoutDataRetentionResult>
}

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
    const retentionRepositories = repositories as typeof repositories &
      CheckoutDataRetentionRepositories
    const now = new Date('2026-09-01T12:00:00.000Z')
    let fixtureSequence = 0
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
      const fixtureId = ++fixtureSequence
      const user = await pool.query<{ id: number }>(
        "insert into users (name, last_name, phone) values ('Integration', 'Buyer', '000') returning id"
      )
      const ticketType = await pool.query<{ id: number }>(
        'insert into ticket_types (name) values ($1) returning id',
        [`Integration-${fixtureId}`]
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

    async function createTerminalNonEconomicCheckout(terminalAt: Date) {
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(terminalAt.getTime() - 60 * 1000),
          now: new Date(terminalAt.getTime() - 2 * 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')

      const providerPreferenceId = `retention-preference-${checkout.payment.id}`
      const providerPaymentId = `retention-payment-${checkout.payment.id}`
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId,
        now: new Date(terminalAt.getTime() - 90 * 1000),
      })
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: terminalAt,
      })
      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId,
        providerStatus: 'rejected',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId,
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: {
          buyer: { email: 'buyer@example.com' },
          id: providerPaymentId,
        },
        now: terminalAt,
      })

      return { checkout, providerPaymentId, userId }
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
        pool.query('select status from payments where id = $1', [checkout.payment.id])
      ).resolves.toMatchObject({ rows: [{ status: 'cancelled' }] })
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

    test('records a provider cancellation for a locally cancelled checkout and processes its receipt', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkoutExpiresAt = new Date(now.getTime() - 2 * 60 * 1000)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: checkoutExpiresAt,
          now: new Date(checkoutExpiresAt.getTime() - 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')

      const providerPreferenceId = 'locally-cancelled-preference'
      const providerPaymentId = 'provider-cancelled-payment'
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId,
        now: new Date(checkoutExpiresAt.getTime() - 30 * 1000),
      })
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: new Date(checkoutExpiresAt.getTime() + 1),
      })

      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId,
        providerStatus: 'cancelled',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId,
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { id: providerPaymentId },
        now,
      })

      await expect(
        pool.query(
          `select status, provider_payment_id, reconciled_at is not null as "isReconciled"
           from payments
           where id = $1`,
          [checkout.payment.id]
        )
      ).resolves.toMatchObject({
        rows: [
          {
            status: 'cancelled',
            provider_payment_id: providerPaymentId,
            isReconciled: true,
          },
        ],
      })
      await expect(
        pool.query(
          `select status, payment_id, processed_at is not null as "isProcessed"
           from payment_webhook_events
           where provider_payment_id = $1`,
          [providerPaymentId]
        )
      ).resolves.toMatchObject({
        rows: [{ status: 'processed', payment_id: checkout.payment.id, isProcessed: true }],
      })
    })

    test('records a late approval for a locally cancelled checkout after its reservation is removed', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkoutExpiresAt = new Date(now.getTime() - 2 * 60 * 1000)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: checkoutExpiresAt,
          now: new Date(checkoutExpiresAt.getTime() - 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')

      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'expired-preference',
        now: new Date(checkoutExpiresAt.getTime() - 30 * 1000),
      })
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: new Date(checkoutExpiresAt.getTime() + 1),
      })

      // This is the post-retention shape: the terminal purchase and payment remain,
      // while the obsolete reservation has been safely removed.
      await pool.query('delete from inventory_reservations where id = $1', [
        checkout.reservation.id,
      ])

      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId: 'late-approved-after-reservation-deletion',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: 'expired-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: {
          buyer: { email: 'buyer@example.com' },
          id: 'late-approved-after-reservation-deletion',
        },
        now,
      })

      await expect(
        pool.query(
          `select status, provider_payment_id, reconciliation_error
           from payments
           where id = $1`,
          [checkout.payment.id]
        )
      ).resolves.toMatchObject({
        rows: [
          {
            status: 'approved',
            provider_payment_id: 'late-approved-after-reservation-deletion',
            reconciliation_error: 'late_approved_requires_manual_review',
          },
        ],
      })
      await expect(
        pool.query(
          `select status, payment_id, processed_at is not null as "isProcessed"
           from payment_webhook_events
           where provider_payment_id = $1`,
          ['late-approved-after-reservation-deletion']
        )
      ).resolves.toMatchObject({
        rows: [{ status: 'processed', payment_id: checkout.payment.id, isProcessed: true }],
      })
      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    })

    test('keeps a processed late-webhook receipt idempotent after its raw payload is minimized', async () => {
      const { ticketId, userId } = await createTicket(1)
      const checkoutExpiresAt = new Date(now.getTime() - 2 * 60 * 1000)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: checkoutExpiresAt,
          now: new Date(checkoutExpiresAt.getTime() - 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')

      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'minimized-receipt-preference',
        now: new Date(checkoutExpiresAt.getTime() - 30 * 1000),
      })
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: new Date(checkoutExpiresAt.getTime() + 1),
      })
      await pool.query('delete from inventory_reservations where id = $1', [
        checkout.reservation.id,
      ])

      const webhook = {
        providerPaymentId: 'minimized-late-approval',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: 'minimized-receipt-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { buyer: { email: 'buyer@example.com' }, id: 'minimized-late-approval' },
        now,
      }
      await repositories.reconcileMercadoPagoPayment(webhook)
      await pool.query(
        "update payment_webhook_events set payload = '{}'::jsonb where provider_payment_id = $1",
        [webhook.providerPaymentId]
      )

      await repositories.reconcileMercadoPagoPayment(webhook)

      await expect(
        pool.query(
          `select payload, status, payment_id
           from payment_webhook_events
           where provider_payment_id = $1`,
          [webhook.providerPaymentId]
        )
      ).resolves.toMatchObject({
        rows: [{ payload: {}, status: 'processed', payment_id: checkout.payment.id }],
      })
      await expect(
        pool.query(
          'select count(*)::int as count from payment_webhook_events where provider_payment_id = $1',
          [webhook.providerPaymentId]
        )
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    })

    test('reports 90-day terminal cleanup candidates without changing data in dry-run mode', async () => {
      const terminalAt = new Date(now.getTime() - 91 * DAY_IN_MILLISECONDS)
      const { checkout, providerPaymentId, userId } =
        await createTerminalNonEconomicCheckout(terminalAt)

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'dry-run', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 1,
        minimizedWebhookPayloads: 1,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query(
          `select payload, provider, provider_payment_id, status
           from payment_webhook_events
           where provider_payment_id = $1`,
          [providerPaymentId]
        )
      ).resolves.toMatchObject({
        rows: [
          {
            payload: { buyer: { email: 'buyer@example.com' }, id: providerPaymentId },
            provider: 'mercado_pago',
            provider_payment_id: providerPaymentId,
            status: 'processed',
          },
        ],
      })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
    })

    test('deletes an eligible 90-day reservation and minimizes its terminal receipt idempotently', async () => {
      const terminalAt = new Date(now.getTime() - 91 * DAY_IN_MILLISECONDS)
      const { checkout, providerPaymentId } = await createTerminalNonEconomicCheckout(terminalAt)

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 1,
        minimizedWebhookPayloads: 1,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
      await expect(
        pool.query(
          `select payload, provider, provider_payment_id, payment_id, status
           from payment_webhook_events
           where provider_payment_id = $1`,
          [providerPaymentId]
        )
      ).resolves.toMatchObject({
        rows: [
          {
            payload: {},
            provider: 'mercado_pago',
            provider_payment_id: providerPaymentId,
            payment_id: checkout.payment.id,
            status: 'processed',
          },
        ],
      })

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        minimizedWebhookPayloads: 0,
        dissociatedPurchases: 0,
      })
    })

    test('dissociates the buyer from an eligible unsuccessful purchase after 12 months', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { checkout } = await createTerminalNonEconomicCheckout(terminalAt)

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 1,
        minimizedWebhookPayloads: 1,
        dissociatedPurchases: 1,
      })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: null }],
      })
      await expect(
        pool.query('select count(*)::int as count from payments where purchase_id = $1', [
          checkout.purchase.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
    })

    test('skips every retention action when a purchase is under legal hold', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { checkout, providerPaymentId, userId } =
        await createTerminalNonEconomicCheckout(terminalAt)
      await pool.query('update purchases set legal_hold_at = $1 where id = $2', [
        now,
        checkout.purchase.id,
      ])

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        minimizedWebhookPayloads: 0,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          providerPaymentId,
        ])
      ).resolves.toMatchObject({
        rows: [{ payload: { buyer: { email: 'buyer@example.com' }, id: providerPaymentId } }],
      })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
    })

    test('excludes economic, issued, pending, and unresolved checkout records from retention', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const [approved, manualReview, issuedTicket, pending, unresolvedWebhook] = await Promise.all([
        createTerminalNonEconomicCheckout(terminalAt),
        createTerminalNonEconomicCheckout(terminalAt),
        createTerminalNonEconomicCheckout(terminalAt),
        createTerminalNonEconomicCheckout(terminalAt),
        createTerminalNonEconomicCheckout(terminalAt),
      ])

      await pool.query("update payments set status = 'approved', paid_at = $1 where id = $2", [
        terminalAt,
        approved.checkout.payment.id,
      ])
      await pool.query(
        "update payments set reconciliation_error = 'late_approved_requires_manual_review' where id = $1",
        [manualReview.checkout.payment.id]
      )
      await pool.query(
        'insert into tickets_sold (purchase_item_id, unit_index, qr_code) values ($1, 0, $2)',
        [issuedTicket.checkout.purchaseItem.id, 'retention-issued-ticket']
      )
      await pool.query("update payments set status = 'pending' where id = $1", [
        pending.checkout.payment.id,
      ])
      await pool.query(
        "update payment_webhook_events set status = 'failed' where provider_payment_id = $1",
        [unresolvedWebhook.providerPaymentId]
      )

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        minimizedWebhookPayloads: 2,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          approved.providerPaymentId,
        ])
      ).resolves.toMatchObject({ rows: [{ payload: {} }] })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          issuedTicket.providerPaymentId,
        ])
      ).resolves.toMatchObject({ rows: [{ payload: {} }] })
      for (const protectedCheckout of [manualReview, pending, unresolvedWebhook]) {
        await expect(
          pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
            protectedCheckout.providerPaymentId,
          ])
        ).resolves.toMatchObject({
          rows: [
            {
              payload: {
                buyer: { email: 'buyer@example.com' },
                id: protectedCheckout.providerPaymentId,
              },
            },
          ],
        })
      }
      await expect(
        pool.query(
          `select count(*)::int as count
           from inventory_reservations
           where id = any($1::int[])`,
          [
            [
              approved.checkout.reservation.id,
              manualReview.checkout.reservation.id,
              issuedTicket.checkout.reservation.id,
              pending.checkout.reservation.id,
              unresolvedWebhook.checkout.reservation.id,
            ],
          ]
        )
      ).resolves.toMatchObject({ rows: [{ count: 5 }] })
    })

    test('does not retain-clean locally cancelled checkout data without a terminal provider receipt', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(terminalAt.getTime() - 60 * 1000),
          now: new Date(terminalAt.getTime() - 2 * 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: terminalAt,
      })

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        minimizedWebhookPayloads: 0,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
    })

    test('minimizes a processed paid receipt while preserving its confirmed sale and issued ticket', async () => {
      const paymentAt = new Date(now.getTime() - 91 * DAY_IN_MILLISECONDS)
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: new Date(paymentAt.getTime() + 15 * 60 * 1000),
          now: paymentAt,
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.attachProviderPreference({
        purchaseDocumentId: checkout.purchase.documentId,
        provider: 'mercado_pago',
        providerPreferenceId: 'paid-receipt-retention-preference',
        now: paymentAt,
      })
      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId: 'paid-receipt-retention-payment',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: 'paid-receipt-retention-preference',
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { buyer: { email: 'buyer@example.com' }, id: 'paid-receipt-retention-payment' },
        now: paymentAt,
      })

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        minimizedWebhookPayloads: 1,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query(
          `select status, provider_payment_id, paid_at is not null as "isPaid"
           from payments
           where id = $1`,
          [checkout.payment.id]
        )
      ).resolves.toMatchObject({
        rows: [
          {
            status: 'approved',
            provider_payment_id: 'paid-receipt-retention-payment',
            isPaid: true,
          },
        ],
      })
      await expect(
        pool.query('select count(*)::int as count from tickets_sold where purchase_item_id = $1', [
          checkout.purchaseItem.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          'paid-receipt-retention-payment',
        ])
      ).resolves.toMatchObject({ rows: [{ payload: {} }] })
    })

    test('does not reconcile a preference-less webhook against an arbitrary payment attempt', async () => {
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
        providerPreferenceId: 'attempt-one-preference',
        now,
      })
      const secondPayment = await pool.query<{ id: number }>(
        `insert into payments (purchase_id, provider, status, amount, currency, provider_preference_id)
         values ($1, 'mercado_pago', 'pending', $2, 'ARS', 'attempt-two-preference')
         returning id`,
        [checkout.purchase.id, checkout.purchase.totalAmount]
      )
      if (!secondPayment.rows[0]?.id) throw new Error('Expected the second payment attempt')

      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId: 'preference-less-multi-attempt-payment',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: null,
        providerPreferenceId: null,
        marketplaceFeeAmount: checkout.purchase.platformFeeAmount,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { id: 'preference-less-multi-attempt-payment' },
        now,
      })

      await expect(
        pool.query('select status from payments where purchase_id = $1 order by id', [
          checkout.purchase.id,
        ])
      ).resolves.toMatchObject({ rows: [{ status: 'pending' }, { status: 'pending' }] })
      await expect(
        pool.query('select status from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({ rows: [{ status: 'pending' }] })
      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    })

    test('uses the local terminal transition instead of a stale checkout deadline for buyer dissociation', async () => {
      const staleExpiry = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const terminalAt = new Date(now.getTime() - DAY_IN_MILLISECONDS)
      const { ticketId, userId } = await createTicket(1)
      const checkout = await repositories.reserveSingleTicketCheckout(
        marketplaceCheckoutInput({
          userId,
          ticketId,
          quantity: 1,
          expiresAt: staleExpiry,
          now: new Date(staleExpiry.getTime() - 60 * 1000),
        })
      )
      if (!checkout) throw new Error('Expected the integration checkout reservation')
      await repositories.releaseReservationOnce({
        reservationDocumentId: checkout.reservation.documentId,
        purchaseStatus: 'expired',
        reservationStatus: 'expired',
        now: terminalAt,
      })

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({ dissociatedPurchases: 0 })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
    })

    test('keeps a concurrent retention apply idempotent across both workers', async () => {
      const terminalAt = new Date(now.getTime() - 91 * DAY_IN_MILLISECONDS)
      const { checkout } = await createTerminalNonEconomicCheckout(terminalAt)

      const results = await Promise.all([
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 }),
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 }),
      ])

      expect(results.reduce((total, result) => total + result.deletedReservations, 0)).toBe(1)
      expect(results.reduce((total, result) => total + result.minimizedWebhookPayloads, 0)).toBe(1)
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    })

    test('keeps held checkout data intact across repeated retention applies', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { checkout, providerPaymentId, userId } =
        await createTerminalNonEconomicCheckout(terminalAt)
      await pool.query('update purchases set legal_hold_at = $1 where id = $2', [
        now,
        checkout.purchase.id,
      ])

      const results = await Promise.all([
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 }),
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 }),
      ])

      expect(results).toEqual([
        { deletedReservations: 0, minimizedWebhookPayloads: 0, dissociatedPurchases: 0 },
        { deletedReservations: 0, minimizedWebhookPayloads: 0, dissociatedPurchases: 0 },
      ])
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          providerPaymentId,
        ])
      ).resolves.toMatchObject({
        rows: [{ payload: { buyer: { email: 'buyer@example.com' }, id: providerPaymentId } }],
      })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
    })

    test('preserves a processed receipt payload when it records a provider fact mismatch', async () => {
      const terminalAt = new Date(now.getTime() - 91 * DAY_IN_MILLISECONDS)
      const { providerPaymentId } = await createTerminalNonEconomicCheckout(terminalAt)
      await pool.query(
        "update payment_webhook_events set last_error = 'provider_fact_mismatch' where provider_payment_id = $1",
        [providerPaymentId]
      )

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({ minimizedWebhookPayloads: 0 })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          providerPaymentId,
        ])
      ).resolves.toMatchObject({
        rows: [{ payload: { buyer: { email: 'buyer@example.com' }, id: providerPaymentId } }],
      })
    })

    test('keeps checkout data when a second processed receipt has provider fact mismatch evidence', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { checkout, userId } = await createTerminalNonEconomicCheckout(terminalAt)
      const discrepantProviderPaymentId = 'retention-provider-fact-mismatch'
      await pool.query(
        `insert into payment_webhook_events (
          provider, provider_payment_id, payment_id, status, payload, processed_at, last_error
        ) values ('mercado_pago', $1, $2, 'processed', $3::jsonb, $4, 'provider_fact_mismatch')`,
        [
          discrepantProviderPaymentId,
          checkout.payment.id,
          JSON.stringify({
            buyer: { email: 'buyer@example.com' },
            id: discrepantProviderPaymentId,
          }),
          terminalAt,
        ]
      )

      await expect(
        retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })
      ).resolves.toMatchObject({
        deletedReservations: 0,
        dissociatedPurchases: 0,
      })
      await expect(
        pool.query('select count(*)::int as count from inventory_reservations where id = $1', [
          checkout.reservation.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
      await expect(
        pool.query('select user_id from purchases where id = $1', [checkout.purchase.id])
      ).resolves.toMatchObject({
        rows: [{ user_id: userId }],
      })
      await expect(
        pool.query('select payload from payment_webhook_events where provider_payment_id = $1', [
          discrepantProviderPaymentId,
        ])
      ).resolves.toMatchObject({
        rows: [
          { payload: { buyer: { email: 'buyer@example.com' }, id: discrepantProviderPaymentId } },
        ],
      })
    })

    test('omits a dissociated purchase from buyer history while preserving its financial record', async () => {
      const terminalAt = new Date(now.getTime() - 366 * DAY_IN_MILLISECONDS)
      const { checkout, userId } = await createTerminalNonEconomicCheckout(terminalAt)
      const user = await pool.query<{ document_id: string }>(
        'select document_id from users where id = $1',
        [userId]
      )
      const userDocumentId = user.rows[0]?.document_id
      if (!userDocumentId) throw new Error('Expected the integration user document ID')

      await retentionRepositories.runCheckoutDataRetention({ now, mode: 'apply', batchSize: 10 })

      await expect(
        repositories.findPurchasesPaginatedByUserDocumentId({
          userDocumentId,
          page: 1,
          limit: 10,
        })
      ).resolves.toMatchObject({ rows: [], total: 0 })
      await expect(
        pool.query('select count(*)::int as count from payments where purchase_id = $1', [
          checkout.purchase.id,
        ])
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
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

    test('confirms a payment when Mercado Pago omits optional preference and marketplace fee facts', async () => {
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
        providerPreferenceId: 'optional-facts-preference',
        now,
      })

      await repositories.reconcileMercadoPagoPayment({
        providerPaymentId: 'optional-facts-payment',
        providerStatus: 'approved',
        externalReference: checkout.purchase.documentId,
        amount: checkout.purchase.totalAmount,
        currency: 'ARS',
        sellerId: 'seller-expected',
        providerPreferenceId: null,
        marketplaceFeeAmount: null,
        providerFeeAmount: null,
        netReceivedAmount: null,
        payload: { id: 'optional-facts-payment' },
        now,
      })

      await expect(
        pool.query('select count(*)::int as count from tickets_sold')
      ).resolves.toMatchObject({ rows: [{ count: 1 }] })
    })

    test('accepts matching facts and rejects mismatched verified Mercado Pago facts', async () => {
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
        { name: 'preference', facts: { providerPreferenceId: 'different-preference' } },
        { name: 'seller', facts: { sellerId: 'seller-other' } },
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
      ).resolves.toMatchObject({ rows: [{ count: 4 }] })
    })
  })
} else {
  describe.skip('purchase lifecycle transactions', () => {
    test('requires DATABASE_TEST_URL', () => {})
  })
}
