import { Module } from '@nestjs/common'
import { ENV } from '../../config/env'
import { GoogleAuthLibraryOidcTokenVerifier } from './adapters/google-auth-library-oidc-token-verifier'
import { RunInternalJobsUseCase } from './application/run-internal-jobs.use-case'
import { GOOGLE_OIDC_TOKEN_VERIFIER } from './google-oidc-token-verifier.port'
import {
  INTERNAL_JOBS_OIDC_OPTIONS,
  parseInternalJobsOidcOptions,
} from './internal-jobs-oidc.options'
import { InternalJobsController } from './presentation/internal-jobs.controller'
import { InternalJobsOidcGuard } from './presentation/internal-jobs-oidc.guard'
import { resolveInProcessSchedulerProviders } from './resolve-in-process-scheduler-providers'

@Module({
  controllers: [InternalJobsController],
  providers: [
    ...resolveInProcessSchedulerProviders(ENV.ENABLE_IN_PROCESS_SCHEDULERS),
    RunInternalJobsUseCase,
    {
      provide: INTERNAL_JOBS_OIDC_OPTIONS,
      useValue: parseInternalJobsOidcOptions({
        audience: ENV.INTERNAL_JOBS_OIDC_AUDIENCE,
        allowedServiceAccounts: ENV.INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS,
      }),
    },
    GoogleAuthLibraryOidcTokenVerifier,
    {
      provide: GOOGLE_OIDC_TOKEN_VERIFIER,
      useExisting: GoogleAuthLibraryOidcTokenVerifier,
    },
    InternalJobsOidcGuard,
  ],
})
export class JobsModule {}
