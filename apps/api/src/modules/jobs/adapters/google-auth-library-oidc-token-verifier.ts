import { Injectable } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import type {
  GoogleOidcTokenVerifier,
  GoogleOidcVerifiedToken,
} from '../google-oidc-token-verifier.port'

const GOOGLE_OIDC_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

/**
 * Production adapter: verifies Cloud Scheduler OIDC ID tokens via google-auth-library.
 */
@Injectable()
export class GoogleAuthLibraryOidcTokenVerifier implements GoogleOidcTokenVerifier {
  private readonly client = new OAuth2Client()

  async verify(token: string, audience: string): Promise<GoogleOidcVerifiedToken> {
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience,
    })
    const payload = ticket.getPayload()

    if (!payload) {
      throw new Error('OIDC token payload missing')
    }

    if (!payload.iss || !GOOGLE_OIDC_ISSUERS.has(payload.iss)) {
      throw new Error(`OIDC token issuer not allowed: ${payload.iss ?? 'missing'}`)
    }

    if (!payload.email) {
      throw new Error('OIDC token email claim missing')
    }

    if (payload.email_verified !== true) {
      throw new Error('OIDC token email is not verified')
    }

    return { email: payload.email.trim().toLowerCase() }
  }
}
