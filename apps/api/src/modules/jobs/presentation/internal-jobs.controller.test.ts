import 'reflect-metadata'
import { expect, test } from 'vitest'
import { API_ROUTES, buildApiPath } from '@repo/common'
import { InternalJobsController } from './internal-jobs.controller.ts'
import { InternalJobsOidcGuard } from './internal-jobs-oidc.guard.ts'

const GUARDS_METADATA = '__guards__'

test('Scheduler-facing route is POST /api/internal/jobs/run', () => {
  expect(buildApiPath(API_ROUTES.internalJobs, API_ROUTES.internalJobs.path.run())).toBe(
    '/api/internal/jobs/run'
  )
})

test('wires InternalJobsOidcGuard on the controller class', () => {
  const classGuards = (Reflect.getMetadata(GUARDS_METADATA, InternalJobsController) ??
    []) as unknown[]
  const methodGuards = (Reflect.getMetadata(
    GUARDS_METADATA,
    InternalJobsController.prototype.run
  ) ?? []) as unknown[]

  expect(classGuards).toContain(InternalJobsOidcGuard)
  expect(methodGuards).toEqual([])
})

test('delegates run to the aggregated use-case and returns its result', async () => {
  const payload = {
    steps: [
      {
        name: 'expire-purchase-reservations',
        status: 'success' as const,
        affected: 1,
        durationMs: 12,
      },
    ],
  }
  const calls: unknown[] = []
  const runInternalJobsUseCase = {
    execute: async () => {
      calls.push('execute')
      return payload
    },
  }

  const controller = new InternalJobsController(runInternalJobsUseCase as never)

  await expect(controller.run()).resolves.toBe(payload)
  expect(calls).toEqual(['execute'])
})

test('propagates use-case failures so the HTTP layer does not return 2xx', async () => {
  const failure = new Error('cleanup failed')
  const runInternalJobsUseCase = {
    execute: async () => {
      throw failure
    },
  }

  const controller = new InternalJobsController(runInternalJobsUseCase as never)

  await expect(controller.run()).rejects.toBe(failure)
})
