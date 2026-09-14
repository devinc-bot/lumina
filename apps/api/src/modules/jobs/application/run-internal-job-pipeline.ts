export type InternalJobPipelineStep = {
  name: string
  run: () => Promise<number>
}

export type InternalJobStepResult = {
  name: string
  status: 'success'
  affected: number
  durationMs: number
}

export type InternalJobPipelineResult = {
  steps: InternalJobStepResult[]
}

export type InternalJobPipelineLogger = {
  log: (message: string) => void
  error: (message: string, trace?: unknown) => void
}

const DEFAULT_JOB_NAME = 'run'

export async function runInternalJobPipeline(
  steps: readonly InternalJobPipelineStep[],
  options?: { logger?: InternalJobPipelineLogger; jobName?: string }
): Promise<InternalJobPipelineResult> {
  const jobName = options?.jobName ?? DEFAULT_JOB_NAME
  const logger = options?.logger
  const results: InternalJobStepResult[] = []

  logger?.log(`job=${jobName} status=started`)

  for (const step of steps) {
    const startedAt = Date.now()
    logger?.log(`job=${jobName} step=${step.name} status=started`)

    try {
      const affected = await step.run()
      const durationMs = Date.now() - startedAt
      results.push({
        name: step.name,
        status: 'success',
        affected,
        durationMs,
      })
      logger?.log(
        `job=${jobName} step=${step.name} status=completed duration_ms=${durationMs} affected=${affected}`
      )
    } catch (error) {
      const durationMs = Date.now() - startedAt
      logger?.error(
        `job=${jobName} step=${step.name} status=failed duration_ms=${durationMs}`,
        error
      )
      throw error
    }
  }

  logger?.log(`job=${jobName} status=completed`)
  return { steps: results }
}
