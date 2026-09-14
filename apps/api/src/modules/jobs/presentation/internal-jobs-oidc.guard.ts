import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { extractBearerToken } from '../../common/utils/extract-bearer-token'
import {
  GOOGLE_OIDC_TOKEN_VERIFIER,
  type GoogleOidcTokenVerifier,
} from '../google-oidc-token-verifier.port'
import {
  INTERNAL_JOBS_OIDC_OPTIONS,
  type InternalJobsOidcOptions,
} from '../internal-jobs-oidc.options'

/**
 * Nest guard for POST /api/internal/jobs/run (Google OIDC, fail closed).
 *
 * Local invoke (non-production): leave INTERNAL_JOBS_OIDC_AUDIENCE and
 * INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS empty so options.bypassAuth is true.
 * Partial OIDC config is rejected even locally. Production requires both via env schema.
 */
@Injectable()
export class InternalJobsOidcGuard implements CanActivate {
  constructor(
    @Inject(INTERNAL_JOBS_OIDC_OPTIONS)
    private readonly options: InternalJobsOidcOptions,
    @Inject(GOOGLE_OIDC_TOKEN_VERIFIER)
    private readonly verifier: GoogleOidcTokenVerifier
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const bypassAuth =
      this.options.audience.length === 0 && this.options.allowedServiceAccounts.length === 0

    if (bypassAuth) {
      return true
    }

    if (this.options.audience.length === 0 || this.options.allowedServiceAccounts.length === 0) {
      throw new UnauthorizedException()
    }

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>()
    const token = extractBearerToken(request.headers.authorization)

    if (!token) {
      throw new UnauthorizedException()
    }

    let email: string
    try {
      ;({ email } = await this.verifier.verify(token, this.options.audience))
    } catch {
      throw new UnauthorizedException()
    }

    if (!this.options.allowedServiceAccounts.includes(email.trim().toLowerCase())) {
      throw new ForbiddenException()
    }

    return true
  }
}
