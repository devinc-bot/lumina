import { sql } from 'drizzle-orm'
import {
  INVENTORY_RESERVATION_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_WEBHOOK_EVENT_STATUS,
  PURCHASE_STATUS,
} from '@repo/types'
import { db } from '../../client.ts'

const RETENTION_DAYS = {
  reservationAndPayload: 90,
  buyerDissociation: 365,
} as const

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export type CheckoutDataRetentionMode = 'dry-run' | 'apply'

export type RunCheckoutDataRetentionInput = {
  now: Date
  mode: CheckoutDataRetentionMode
  batchSize: number
}

export type CheckoutDataRetentionResult = {
  deletedReservations: number
  minimizedWebhookPayloads: number
  dissociatedPurchases: number
}

type RetentionCandidate = { id: number }

type RetentionTransaction = Pick<typeof db, 'execute'>

export async function runCheckoutDataRetention(
  input: RunCheckoutDataRetentionInput
): Promise<CheckoutDataRetentionResult> {
  const reservationAndPayloadCutoff = new Date(
    input.now.getTime() - RETENTION_DAYS.reservationAndPayload * DAY_IN_MILLISECONDS
  )
  const buyerDissociationCutoff = new Date(
    input.now.getTime() - RETENTION_DAYS.buyerDissociation * DAY_IN_MILLISECONDS
  )

  return db.transaction(async (tx) => {
    const reservationCandidates = await findReservationCandidates(
      tx,
      reservationAndPayloadCutoff,
      input.batchSize
    )
    const receiptCandidates = await findReceiptCandidates(
      tx,
      reservationAndPayloadCutoff,
      input.batchSize
    )
    const purchaseCandidates = await findBuyerDissociationCandidates(
      tx,
      buyerDissociationCutoff,
      input.batchSize
    )

    const result = {
      deletedReservations: reservationCandidates.length,
      minimizedWebhookPayloads: receiptCandidates.length,
      dissociatedPurchases: purchaseCandidates.length,
    }
    if (input.mode === 'dry-run') return result

    if (receiptCandidates.length > 0) {
      await tx.execute(sql`
        update payment_webhook_events
        set payload = '{}'::jsonb, updated_at = ${input.now}
        where id in (${sql.join(
          receiptCandidates.map(({ id }) => sql`${id}`),
          sql`, `
        )})
      `)
    }
    if (reservationCandidates.length > 0) {
      await tx.execute(sql`
        delete from inventory_reservations
        where id in (${sql.join(
          reservationCandidates.map(({ id }) => sql`${id}`),
          sql`, `
        )})
      `)
    }
    if (purchaseCandidates.length > 0) {
      await tx.execute(sql`
        update purchases
        set user_id = null, updated_at = ${input.now}
        where id in (${sql.join(
          purchaseCandidates.map(({ id }) => sql`${id}`),
          sql`, `
        )})
      `)
    }

    return result
  })
}

function findReservationCandidates(tx: RetentionTransaction, cutoff: Date, batchSize: number) {
  return tx
    .execute<RetentionCandidate>(sql`
    select r.id
    from inventory_reservations r
    join purchase_items pi on pi.id = r.purchase_item_id
    join purchases p on p.id = pi.purchase_id
    where r.status in (${INVENTORY_RESERVATION_STATUS.EXPIRED}, ${INVENTORY_RESERVATION_STATUS.RELEASED})
      and r.released_at <= ${cutoff}
      and ${eligibleNonEconomicPurchaseSql()}
    order by r.released_at, r.id
    limit ${batchSize}
    for update of r, pi, p skip locked
  `)
    .then((result) => result.rows)
}

function findReceiptCandidates(tx: RetentionTransaction, cutoff: Date, batchSize: number) {
  return tx
    .execute<RetentionCandidate>(sql`
    select receipt.id
    from payment_webhook_events receipt
    join payments pay on pay.id = receipt.payment_id
    join purchases p on p.id = pay.purchase_id
    where receipt.status = ${PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED}
      and receipt.processed_at <= ${cutoff}
      and receipt.payload <> '{}'::jsonb
      and receipt.last_error is null
      and p.legal_hold_at is null
      and pay.status <> ${PAYMENT_ATTEMPT_STATUS.PENDING}
      and pay.reconciliation_error is null
    order by receipt.processed_at, receipt.id
    limit ${batchSize}
    for update of receipt, pay, p skip locked
  `)
    .then((result) => result.rows)
}

function findBuyerDissociationCandidates(
  tx: RetentionTransaction,
  cutoff: Date,
  batchSize: number
) {
  return tx
    .execute<RetentionCandidate>(sql`
    select p.id
    from purchases p
    where p.user_id is not null
      and p.terminal_at <= ${cutoff}
      and ${eligibleNonEconomicPurchaseSql()}
    order by p.terminal_at, p.id
    limit ${batchSize}
    for update of p skip locked
  `)
    .then((result) => result.rows)
}

function eligibleNonEconomicPurchaseSql() {
  return sql`
    p.legal_hold_at is null
    and p.status in (${PURCHASE_STATUS.EXPIRED}, ${PURCHASE_STATUS.CANCELLED})
    and not exists (
      select 1
      from payments all_pay
      where all_pay.purchase_id = p.id
        and (
          all_pay.status not in (${PAYMENT_ATTEMPT_STATUS.CANCELLED}, ${PAYMENT_ATTEMPT_STATUS.REJECTED})
          or all_pay.provider_payment_id is null
          or all_pay.paid_at is not null
          or all_pay.reconciliation_error is not null
        )
    )
    and exists (
      select 1
      from payment_webhook_events terminal_receipt
      join payments receipt_payment on receipt_payment.id = terminal_receipt.payment_id
      where receipt_payment.purchase_id = p.id
        and terminal_receipt.status = ${PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED}
    )
    and not exists (
      select 1
      from purchase_items issued_pi
      join tickets_sold ts on ts.purchase_item_id = issued_pi.id
      where issued_pi.purchase_id = p.id
    )
    and not exists (
      select 1
      from payment_webhook_events unresolved_receipt
      join payments receipt_payment on receipt_payment.id = unresolved_receipt.payment_id
      where receipt_payment.purchase_id = p.id
        and (
          unresolved_receipt.status <> ${PAYMENT_WEBHOOK_EVENT_STATUS.PROCESSED}
          or unresolved_receipt.last_error is not null
        )
    )
  `
}
