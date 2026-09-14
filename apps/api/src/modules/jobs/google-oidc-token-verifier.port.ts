/**
 * Port for verifying Google-signed OIDC ID tokens (Cloud Scheduler → internal jobs).
 * Production adapter uses google-auth-library; tests inject a fake.
 *
 * Verifier MUST reject tokens whose issuer is not `https://accounts.google.com`
 * and MUST enforce the configured audience.
 */
export const GOOGLE_OIDC_TOKEN_VERIFIER = Symbol('GOOGLE_OIDC_TOKEN_VERIFIER')

export type GoogleOidcVerifiedToken = {
  email: string
}

export interface GoogleOidcTokenVerifier {
  /**
   * @param token Raw Bearer JWT (no "Bearer " prefix)
   * @param audience Expected `aud` claim (INTERNAL_JOBS_OIDC_AUDIENCE)
   * @throws when signature, issuer, audience, expiry, or shape is invalid
   */
  verify(token: string, audience: string): Promise<GoogleOidcVerifiedToken>
}
