import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { API_ROUTES } from '@repo/common'
import { RunInternalJobsUseCase } from '../application/run-internal-jobs.use-case'
import { InternalJobsOidcGuard } from './internal-jobs-oidc.guard'

/**
 * Cloud Scheduler target. Auth: Google OIDC (see InternalJobsOidcGuard).
 * Local DX: leave INTERNAL_JOBS_OIDC_* empty to bypass; never do that in production.
 */
@SkipThrottle()
@UseGuards(InternalJobsOidcGuard)
@Controller(API_ROUTES.internalJobs.prefix)
export class InternalJobsController {
  constructor(private readonly runInternalJobsUseCase: RunInternalJobsUseCase) {}

  @Post(API_ROUTES.internalJobs.path.run())
  @HttpCode(HttpStatus.OK)
  run() {
    return this.runInternalJobsUseCase.execute()
  }
}
