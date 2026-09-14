export const INTERNAL_JOBS_OIDC_OPTIONS = Symbol('INTERNAL_JOBS_OIDC_OPTIONS')

export type InternalJobsOidcOptions = {
  /** Expected JWT audience; empty when unset. */
  audience: string
  /** Allowlisted service-account emails (trimmed, non-empty). */
  allowedServiceAccounts: readonly string[]
  /**
   * Local DX only: both audience and allowed SAs are fully empty.
   * Production env schema forbids this; guard must never bypass when either side is set.
   */
  bypassAuth: boolean
}

export type InternalJobsOidcEnvInput = {
  audience: string
  allowedServiceAccounts: string
}

/**
 * Parses INTERNAL_JOBS_OIDC_* env strings into guard options.
 * Comma-separated SA emails are trimmed; empty entries are ignored.
 * `bypassAuth` is true only when audience is empty and no SA emails remain after parse.
 */
export function parseInternalJobsOidcOptions(
  input: InternalJobsOidcEnvInput
): InternalJobsOidcOptions {
  const audience = input.audience.trim()
  const allowedServiceAccounts = input.allowedServiceAccounts
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)

  return {
    audience,
    allowedServiceAccounts,
    bypassAuth: audience.length === 0 && allowedServiceAccounts.length === 0,
  }
}
