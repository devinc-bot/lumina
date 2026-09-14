import { describe, expect, test } from 'vitest'
import { API_ROUTES, buildApiPath } from '../src/config/api-routes.ts'

describe('internal jobs routes', () => {
  test('exposes a kebab /internal/jobs prefix', () => {
    expect(API_ROUTES.internalJobs.prefix).toBe('/internal/jobs')
  })

  test('exposes a run path helper under the internal jobs prefix', () => {
    expect(API_ROUTES.internalJobs.path.run()).toBe('/run')
  })

  test('builds POST Scheduler path /api/internal/jobs/run', () => {
    expect(buildApiPath(API_ROUTES.internalJobs, API_ROUTES.internalJobs.path.run())).toBe(
      '/api/internal/jobs/run'
    )
  })
})
