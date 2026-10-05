import { and, eq, sql } from 'drizzle-orm'
import {
  INVENTORY_RESERVATION_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_RECONCILIATION_ERROR,
  PAYMENT_WEBHOOK_EVENT_STATUS,
  PURCHASE_STATUS,
} from '@repo/types'
import { db, type Transaction } from '../../client.ts'
import { inventoryReservations } from '../../schema/inventory-reservation.ts'
import { payments } from '../../schema/payment.ts'
import { paymentWebhookEvents } from '../../schema/payment-webhook-event.ts'
import { purchases } from '../../schema/purchase.ts'
import { issueTicketsSoldForPurchaseItem } from './issue-tickets-sold-for-purchase-item.ts'

const MERCADO_PAGO_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const

export type ReconcileMercadoPagoPaymentInput = {
  providerPaymentId: string
  providerStatus: string
  externalReference: string
  providerPreferenceId: string | null
  amount: number
  currency: string
  sellerId: string | null
  marketplaceFeeAmount: number | null
  providerFeeAmount: number | null
  netReceivedAmount: number | null
  payload: Record<string, unknown>
  now: Date
}

type StoredMercadoPagoPaymentFacts = {
  amount: number
  currency: string
  providerPreferenceId: string | null
  sellerId: string | null
  marketplaceFeeAmount: number | null
}

type MercadoPagoReconciliationRow = {
  receiptId: number
  receiptStatus: string
  paymentId: number
  purchaseId: number
  purchaseItemId: number
  ticketId: number
  purchaseDocumentId: string
  paymentAmount: number | string
  platformFeeAmount: number | string | null
  paymentCurrency: string
  providerSellerId: string | null
  paymentStatus: string
  providerPreferenceId: string | null
  purchaseStatus: string
  reservationStatus: string | null
  reservationExpiresAt: Date | null
}

export async function reconcileMercadoPagoPayment(input: ReconcileMercadoPagoPaymentInput) {
  return db.transaction(async (tx) => {
    await tx
      .insert(paymentWebhookEvents)
      .values({
        provider: PAYMENT_PROVIDER.MERCADO_PAGO,
        providerPaymentId: input.providerPaymentId,
        payload: input.payload,
        updatedAt: input.now,
      })
      .onConflictDoNothing({
        target: [paymentWebhookEvents.provider, paymentWebhookEvents.providerPaymentId],
        where: sql`${paymentWebhookEvents.providerPaymentId} is not null`,
      })

    const receipt = await tx.execute<MercadoPagoReconciliationRow>(sql`
      select
        receipt.id as "receiptId",
        receipt.status as "receiptStatus",
        pay.id as "paymentId",
        p.id as "purchaseId",
        p.document_id as "purchaseDocumentId",
        pi.id as "purchaseItemId",
        pi.ticket_id as "ticketId",
        pay.amount as "paymentAmount",
        p.platform_fee_amount as "platformFeeAmount",
        pay.currency as "paymentCurrency",
        pay.provider_seller_id as "providerSellerId",
        pay.status as "paymentStatus",
        pay.provider_preference_id as "providerPreferenceId",
        p.status as "purchaseStatus",
        r.status as "reservationStatus",
        r.expires_at as "reservationExpiresAt"
      from payment_webhook_events receipt
      join purchases p on p.document_id = ${input.externalReference}
      join payments pay on pay.purchase_id = p.id
      join purchase_items pi on pi.purchase_id = p.id
      left join inventory_reservations r on r.purchase_item_id = pi.id
      where receipt.provider = ${PAYMENT_PROVIDER.MERCADO_PAGO}
        and receipt.provider_payment_id = ${input.providerPaymentId}
        and pay.provider = ${PAYMENT_PROVIDER.MERCADO_PAGO}
        and pay.provider_preference_id is not null
        and (
          pay.provider_preference_id = cast(${input.providerPreferenceId} as text)
          or (
            (
              select count(*)
              from payments matching_payment
              where matching_payment.purchase_id = p.id
                and matching_payment.provider = ${PAYMENT_PROVIDER.MERCADO_PAGO}
            ) = 1
          )
        )
      for update of receipt, p, pay, pi
    `)

    const row = receipt.rows[0]

    if (!row || row.receiptStatus === PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED) return

    await tx
      .update(paymentWebhookEvents)
      .set({
        status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSING,
        processingAttempts: sql`${paymentWebhookEvents.processingAttempts} + 1`,
        updatedAt: input.now,
      })
      .where(eq(paymentWebhookEvents.id, row.receiptId))

    const storedPaymentFacts: StoredMercadoPagoPaymentFacts = {
      amount: typeof row.paymentAmount === 'number' ? row.paymentAmount : Number(row.paymentAmount),
      currency: row.paymentCurrency,
      providerPreferenceId: row.providerPreferenceId,
      sellerId: row.providerSellerId,
      marketplaceFeeAmount: row.platformFeeAmount === null ? null : Number(row.platformFeeAmount),
    }

    const factsMatch = matchesMercadoPagoPaymentFacts(storedPaymentFacts, input)

    const [webhookEvent] = await tx
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.id, row.receiptId))
      .limit(1)
    if (!webhookEvent) throw new Error('Webhook receipt returned no row')

    if (!factsMatch) {
      await tx
        .update(paymentWebhookEvents)
        .set({
          paymentId: row.paymentId,
          status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED,
          lastError: PAYMENT_RECONCILIATION_ERROR.PROVIDER_FACT_MISMATCH,
          processedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(paymentWebhookEvents.id, row.receiptId))
      return
    }

    if (row.paymentStatus !== PAYMENT_ATTEMPT_STATUS.PENDING) {
      await reconcileNonPendingPayment(tx, row, input)
      return
    }

    const terminalPaymentStatus = getTerminalPaymentStatus(input.providerStatus)

    if (terminalPaymentStatus) {
      await tx
        .update(payments)
        .set({
          status: terminalPaymentStatus,
          providerPaymentId: input.providerPaymentId,
          reconciledAt: input.now,
          providerFeeActualAmount: input.providerFeeAmount,
          marketplaceFeeActualAmount: input.marketplaceFeeAmount,
          ownerNetAmount: input.netReceivedAmount,
          updatedAt: input.now,
        })
        .where(eq(payments.id, row.paymentId))

      const [purchase] = await tx
        .update(purchases)
        .set({
          updatedAt: input.now,
          stateVersion: sql`${purchases.stateVersion} + 1`,
        })
        .where(eq(purchases.id, row.purchaseId))
        .returning()

      if (!purchase) throw new Error('Payment transition did not return its purchase')

      await tx
        .update(paymentWebhookEvents)
        .set({
          paymentId: row.paymentId,
          status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED,
          processedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(paymentWebhookEvents.id, row.receiptId))
      return
    }

    if (input.providerStatus !== MERCADO_PAGO_STATUS.APPROVED) {
      await tx
        .update(paymentWebhookEvents)
        .set({
          paymentId: row.paymentId,
          status: PAYMENT_WEBHOOK_EVENT_STATUS.RECEIVED,
          updatedAt: input.now,
        })
        .where(eq(paymentWebhookEvents.id, row.receiptId))
      return
    }

    // if the reservation has expired
    const reservationExpiresAt = row.reservationExpiresAt
      ? new Date(row.reservationExpiresAt).getTime()
      : Number.NaN

    const canConfirm =
      row.purchaseStatus === PURCHASE_STATUS.PENDING &&
      row.reservationStatus === INVENTORY_RESERVATION_STATUS.ACTIVE &&
      Number.isFinite(reservationExpiresAt) &&
      reservationExpiresAt > input.now.getTime()

    if (!canConfirm) {
      await tx
        .update(payments)
        .set({
          status: PAYMENT_ATTEMPT_STATUS.APPROVED,
          providerPaymentId: input.providerPaymentId,
          paidAt: input.now,
          reconciledAt: input.now,
          providerFeeActualAmount: input.providerFeeAmount,
          marketplaceFeeActualAmount: input.marketplaceFeeAmount,
          ownerNetAmount: input.netReceivedAmount,
          reconciliationError: PAYMENT_RECONCILIATION_ERROR.LATE_APPROVED_REQUIRES_MANUAL_REVIEW,
          updatedAt: input.now,
        })
        .where(eq(payments.id, row.paymentId))

      const [purchase] = await tx
        .update(purchases)
        .set({
          updatedAt: input.now,
          stateVersion: sql`${purchases.stateVersion} + 1`,
        })
        .where(eq(purchases.id, row.purchaseId))
        .returning()

      if (!purchase) throw new Error('Late payment transition did not return its purchase')

      await tx
        .update(paymentWebhookEvents)
        .set({
          paymentId: row.paymentId,
          status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED,
          processedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(paymentWebhookEvents.id, row.receiptId))
      return
    }

    await tx
      .update(payments)
      .set({
        status: PAYMENT_ATTEMPT_STATUS.APPROVED,
        providerPaymentId: input.providerPaymentId,
        paidAt: input.now,
        reconciledAt: input.now,
        providerFeeActualAmount: input.providerFeeAmount,
        marketplaceFeeActualAmount: input.marketplaceFeeAmount,
        ownerNetAmount: input.netReceivedAmount,
        updatedAt: input.now,
      })
      .where(
        and(eq(payments.id, row.paymentId), eq(payments.status, PAYMENT_ATTEMPT_STATUS.PENDING))
      )

    await tx
      .update(inventoryReservations)
      .set({
        status: INVENTORY_RESERVATION_STATUS.CONSUMED,
        consumedAt: input.now,
        updatedAt: input.now,
      })
      .where(eq(inventoryReservations.purchaseItemId, row.purchaseItemId))

    const [purchase] = await tx
      .update(purchases)
      .set({
        status: PURCHASE_STATUS.CONFIRMED,
        confirmedAt: input.now,
        updatedAt: input.now,
        stateVersion: sql`${purchases.stateVersion} + 1`,
      })
      .where(eq(purchases.id, row.purchaseId))
      .returning()

    if (!purchase) throw new Error('Confirmed payment transition did not return its purchase')

    await issueTicketsSoldForPurchaseItem(row.purchaseItemId, tx)

    await tx
      .update(paymentWebhookEvents)
      .set({
        paymentId: row.paymentId,
        status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED,
        processedAt: input.now,
        updatedAt: input.now,
      })
      .where(eq(paymentWebhookEvents.id, row.receiptId))
  })
}

async function reconcileNonPendingPayment(
  tx: Transaction,
  row: MercadoPagoReconciliationRow,
  input: ReconcileMercadoPagoPaymentInput
) {
  const markReceiptProcessed = () =>
    tx
      .update(paymentWebhookEvents)
      .set({
        paymentId: row.paymentId,
        status: PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED,
        processedAt: input.now,
        updatedAt: input.now,
      })
      .where(eq(paymentWebhookEvents.id, row.receiptId))

  const isLateApproval =
    input.providerStatus === MERCADO_PAGO_STATUS.APPROVED &&
    row.paymentStatus !== PAYMENT_ATTEMPT_STATUS.APPROVED &&
    row.purchaseStatus !== PURCHASE_STATUS.CONFIRMED

  if (isLateApproval) {
    await tx
      .update(payments)
      .set({
        status: PAYMENT_ATTEMPT_STATUS.APPROVED,
        providerPaymentId: input.providerPaymentId,
        paidAt: input.now,
        reconciledAt: input.now,
        providerFeeActualAmount: input.providerFeeAmount,
        marketplaceFeeActualAmount: input.marketplaceFeeAmount,
        ownerNetAmount: input.netReceivedAmount,
        reconciliationError: PAYMENT_RECONCILIATION_ERROR.LATE_APPROVED_REQUIRES_MANUAL_REVIEW,
        updatedAt: input.now,
      })
      .where(eq(payments.id, row.paymentId))

    await tx
      .update(purchases)
      .set({
        updatedAt: input.now,
        stateVersion: sql`${purchases.stateVersion} + 1`,
      })
      .where(eq(purchases.id, row.purchaseId))

    await markReceiptProcessed()
    return
  }

  if (!getTerminalPaymentStatus(input.providerStatus)) {
    await markReceiptProcessed()
    return
  }

  await tx
    .update(payments)
    .set({
      providerPaymentId: input.providerPaymentId,
      reconciledAt: input.now,
      updatedAt: input.now,
    })
    .where(eq(payments.id, row.paymentId))

  await markReceiptProcessed()
}

function getTerminalPaymentStatus(providerStatus: string) {
  if (providerStatus === MERCADO_PAGO_STATUS.REJECTED) {
    return PAYMENT_ATTEMPT_STATUS.REJECTED
  }
  if (providerStatus === MERCADO_PAGO_STATUS.CANCELLED) {
    return PAYMENT_ATTEMPT_STATUS.CANCELLED
  }
  return null
}

function matchesMercadoPagoPaymentFacts(
  stored: StoredMercadoPagoPaymentFacts,
  reported: ReconcileMercadoPagoPaymentInput
): boolean {
  const hasMatchingPaymentDetails =
    stored.amount === reported.amount && stored.currency === reported.currency
  const hasMatchingPreference =
    reported.providerPreferenceId === null ||
    stored.providerPreferenceId === reported.providerPreferenceId
  const hasMatchingSeller = stored.sellerId === null || stored.sellerId === reported.sellerId
  const hasMatchingMarketplaceFee =
    reported.marketplaceFeeAmount === null ||
    stored.marketplaceFeeAmount === null ||
    stored.marketplaceFeeAmount === reported.marketplaceFeeAmount

  return (
    hasMatchingPaymentDetails &&
    hasMatchingPreference &&
    hasMatchingSeller &&
    hasMatchingMarketplaceFee
  )
}
