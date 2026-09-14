import { expect, test } from 'vitest'
import { runInternalJobPipeline } from './run-internal-job-pipeline.ts'

test('runs steps in the given order and returns structured per-step success results', async () => {
  const calls: string[] = []

  const result = await runInternalJobPipeline([
    {
      name: 'step-a',
      run: async () => {
        calls.push('step-a')
        return 2
      },
    },
    {
      name: 'step-b',
      run: async () => {
        calls.push('step-b')
        return 0
      },
    },
    {
      name: 'step-c',
      run: async () => {
        calls.push('step-c')
        return 5
      },
    },
  ])

  expect(calls).toEqual(['step-a', 'step-b', 'step-c'])
  expect(result.steps).toHaveLength(3)
  expect(result.steps[0]).toMatchObject({ name: 'step-a', status: 'success', affected: 2 })
  expect(result.steps[1]).toMatchObject({ name: 'step-b', status: 'success', affected: 0 })
  expect(result.steps[2]).toMatchObject({ name: 'step-c', status: 'success', affected: 5 })
  for (const step of result.steps) {
    expect(step.durationMs).toBeGreaterThanOrEqual(0)
    expect(typeof step.durationMs).toBe('number')
  }
})

test('stops on the first step failure and does not run later steps', async () => {
  const calls: string[] = []
  const failure = new Error('step-b failed')

  await expect(
    runInternalJobPipeline([
      {
        name: 'step-a',
        run: async () => {
          calls.push('step-a')
          return 1
        },
      },
      {
        name: 'step-b',
        run: async () => {
          calls.push('step-b')
          throw failure
        },
      },
      {
        name: 'step-c',
        run: async () => {
          calls.push('step-c')
          return 3
        },
      },
    ])
  ).rejects.toBe(failure)

  expect(calls).toEqual(['step-a', 'step-b'])
})

test('does not swallow step errors (unlike runCleanupJob)', async () => {
  const failure = new Error('database unavailable')

  await expect(
    runInternalJobPipeline([
      {
        name: 'only-step',
        run: async () => {
          throw failure
        },
      },
    ])
  ).rejects.toThrow('database unavailable')
})
