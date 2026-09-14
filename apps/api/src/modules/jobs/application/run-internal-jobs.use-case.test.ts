import { beforeEach, expect, test, vi } from 'vitest'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const db = vi.hoisted(() => ({
  findExpiredActiveReservationDocumentIds: vi.fn(),
  releaseReservationOnce: vi.fn(),
  deleteStalePendingOrders: vi.fn(),
  deleteApiErrorRecordsBefore: vi.fn(),
  deleteExpiredUserRegistrationTokens: vi.fn(),
  deleteExpiredOwnerRegistrationTokens: vi.fn(),
  deleteExpiredPasswordResetTokens: vi.fn(),
  deleteExpiredOrRevokedAccountSessionsBefore: vi.fn(),
  deleteExpiredAndCancelledInvitations: vi.fn(),
}))

vi.mock('@repo/db', () => db)

import { INTERNAL_JOB_STEP, INTERNAL_JOB_STEP_ORDER } from './internal-job-steps.ts'
import { RunInternalJobsUseCase } from './run-internal-jobs.use-case.ts'

const EXPECTED_STEP_ORDER = [
  INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
  INTERNAL_JOB_STEP.CLEANUP_STALE_PENDING_ORDERS,
  INTERNAL_JOB_STEP.CLEANUP_API_ERROR_RECORDS,
  INTERNAL_JOB_STEP.CLEANUP_USER_REGISTRATION_TOKENS,
  INTERNAL_JOB_STEP.CLEANUP_OWNER_REGISTRATION_TOKENS,
  INTERNAL_JOB_STEP.CLEANUP_PASSWORD_RESET_TOKENS,
  INTERNAL_JOB_STEP.CLEANUP_ACCOUNT_SESSIONS,
  INTERNAL_JOB_STEP.CLEANUP_STAFF_INVITATIONS,
] as const

beforeEach(() => {
  vi.clearAllMocks()
  db.findExpiredActiveReservationDocumentIds.mockResolvedValue([])
  db.releaseReservationOnce.mockResolvedValue({ transitioned: false })
  db.deleteStalePendingOrders.mockResolvedValue(0)
  db.deleteApiErrorRecordsBefore.mockResolvedValue(0)
  db.deleteExpiredUserRegistrationTokens.mockResolvedValue(0)
  db.deleteExpiredOwnerRegistrationTokens.mockResolvedValue(0)
  db.deleteExpiredPasswordResetTokens.mockResolvedValue(0)
  db.deleteExpiredOrRevokedAccountSessionsBefore.mockResolvedValue(0)
  db.deleteExpiredAndCancelledInvitations.mockResolvedValue(0)
})

test('exposes the fixed eight-step Scheduler pipeline order', () => {
  expect(INTERNAL_JOB_STEP_ORDER).toEqual(EXPECTED_STEP_ORDER)
})

test('runs all hygiene steps after expiry and returns per-step results in catalog order', async () => {
  db.findExpiredActiveReservationDocumentIds.mockResolvedValue(['res-1'])
  db.releaseReservationOnce.mockResolvedValue({ transitioned: true })
  db.deleteStalePendingOrders.mockResolvedValue(1)
  db.deleteApiErrorRecordsBefore.mockResolvedValue(2)
  db.deleteExpiredUserRegistrationTokens.mockResolvedValue(3)
  db.deleteExpiredOwnerRegistrationTokens.mockResolvedValue(4)
  db.deleteExpiredPasswordResetTokens.mockResolvedValue(5)
  db.deleteExpiredOrRevokedAccountSessionsBefore.mockResolvedValue(6)
  db.deleteExpiredAndCancelledInvitations.mockResolvedValue(undefined)

  const result = await new RunInternalJobsUseCase().execute()

  expect(result.steps.map((step) => step.name)).toEqual([...EXPECTED_STEP_ORDER])
  expect(result.steps.every((step) => step.status === 'success')).toBe(true)
  expect(result.steps.map((step) => step.affected)).toEqual([1, 1, 2, 3, 4, 5, 6, 0])
})

test('expiry step requests a bounded batch of 100 expired active reservations', async () => {
  await new RunInternalJobsUseCase().execute()

  expect(db.findExpiredActiveReservationDocumentIds).toHaveBeenCalledOnce()
  const [, limit] = db.findExpiredActiveReservationDocumentIds.mock.calls[0]!
  expect(limit).toBe(100)
})

test('expiry step counts only idempotent transitioned releases', async () => {
  db.findExpiredActiveReservationDocumentIds.mockResolvedValue(['res-1', 'res-2', 'res-3'])
  db.releaseReservationOnce
    .mockResolvedValueOnce({ transitioned: true })
    .mockResolvedValueOnce({ transitioned: false })
    .mockResolvedValueOnce({ transitioned: true })

  const result = await new RunInternalJobsUseCase().execute()

  expect(db.releaseReservationOnce).toHaveBeenCalledTimes(3)
  expect(result.steps[0]).toMatchObject({
    name: INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
    status: 'success',
    affected: 2,
  })
})

test('duplicate run invocations stay safe after reservations are already released', async () => {
  db.findExpiredActiveReservationDocumentIds
    .mockResolvedValueOnce(['res-1'])
    .mockResolvedValueOnce([])
  db.releaseReservationOnce.mockResolvedValueOnce({ transitioned: true })

  const first = await new RunInternalJobsUseCase().execute()
  const second = await new RunInternalJobsUseCase().execute()

  expect(first.steps[0]).toMatchObject({
    name: INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
    status: 'success',
    affected: 1,
  })
  expect(second.steps[0]).toMatchObject({
    name: INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
    status: 'success',
    affected: 0,
  })
  expect(db.releaseReservationOnce).toHaveBeenCalledTimes(1)
  expect(second.steps.every((step) => step.status === 'success')).toBe(true)
})

test('duplicate run with stale expired ids counts zero when release is a no-op', async () => {
  db.findExpiredActiveReservationDocumentIds.mockResolvedValue(['res-1'])
  db.releaseReservationOnce
    .mockResolvedValueOnce({ transitioned: true })
    .mockResolvedValueOnce({ transitioned: false })

  const first = await new RunInternalJobsUseCase().execute()
  const second = await new RunInternalJobsUseCase().execute()

  expect(first.steps[0]).toMatchObject({
    name: INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
    status: 'success',
    affected: 1,
  })
  expect(second.steps[0]).toMatchObject({
    name: INTERNAL_JOB_STEP.EXPIRE_PURCHASE_RESERVATIONS,
    status: 'success',
    affected: 0,
  })
  expect(db.releaseReservationOnce).toHaveBeenCalledTimes(2)
})

test('account session cleanup uses a 7-day retention cutoff', async () => {
  const now = new Date('2026-09-11T15:00:00.000Z')
  vi.useFakeTimers()
  vi.setSystemTime(now)

  try {
    await new RunInternalJobsUseCase().execute()

    expect(db.deleteExpiredOrRevokedAccountSessionsBefore).toHaveBeenCalledOnce()
    expect(db.deleteExpiredOrRevokedAccountSessionsBefore.mock.calls[0]![0]).toEqual(
      new Date(now.getTime() - 7 * DAY_IN_MILLISECONDS)
    )
  } finally {
    vi.useRealTimers()
  }
})

test('propagates the first step failure without running later repository cleanups', async () => {
  const failure = new Error('expiry failed')
  db.findExpiredActiveReservationDocumentIds.mockRejectedValue(failure)

  await expect(new RunInternalJobsUseCase().execute()).rejects.toBe(failure)

  expect(db.deleteStalePendingOrders).not.toHaveBeenCalled()
  expect(db.deleteApiErrorRecordsBefore).not.toHaveBeenCalled()
  expect(db.deleteExpiredUserRegistrationTokens).not.toHaveBeenCalled()
  expect(db.deleteExpiredOwnerRegistrationTokens).not.toHaveBeenCalled()
  expect(db.deleteExpiredPasswordResetTokens).not.toHaveBeenCalled()
  expect(db.deleteExpiredOrRevokedAccountSessionsBefore).not.toHaveBeenCalled()
  expect(db.deleteExpiredAndCancelledInvitations).not.toHaveBeenCalled()
})

test('propagates a mid-pipeline failure after earlier steps succeeded', async () => {
  const failure = new Error('api error cleanup failed')
  db.deleteApiErrorRecordsBefore.mockRejectedValue(failure)

  await expect(new RunInternalJobsUseCase().execute()).rejects.toBe(failure)

  expect(db.findExpiredActiveReservationDocumentIds).toHaveBeenCalledOnce()
  expect(db.deleteStalePendingOrders).toHaveBeenCalledOnce()
  expect(db.deleteExpiredUserRegistrationTokens).not.toHaveBeenCalled()
})
