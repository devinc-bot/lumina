import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { ENV } from '../../../config/env'
import type { MercadoPagoOAuthPort, MercadoPagoOAuthTokens } from '../mercado-pago-oauth.port'

const MERCADO_PAGO_OAUTH_URL = 'https://auth.mercadopago.com/authorization'
const MERCADO_PAGO_TOKEN_URL = 'https://api.mercadopago.com/oauth/token'
const MARKETPLACE_SCOPE = 'offline_access payments write'

function parseScopes(scope: unknown): string[] {
  const value = typeof scope === 'string' ? scope : MARKETPLACE_SCOPE
  return value.split(' ').filter(Boolean)
}

@Injectable()
export class MercadoPagoOAuthHttpAdapter implements MercadoPagoOAuthPort {
  getAuthorizationUrl(state: string, codeVerifier: string): string {
    const url = new URL(MERCADO_PAGO_OAUTH_URL)
    url.searchParams.set('client_id', ENV.MERCADOPAGO_MARKETPLACE_CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('platform_id', 'mp')
    url.searchParams.set('redirect_uri', ENV.MERCADOPAGO_OAUTH_REDIRECT_URI)
    url.searchParams.set('state', state)
    url.searchParams.set(
      'code_challenge',
      createHash('sha256').update(codeVerifier).digest('base64url')
    )
    url.searchParams.set('code_challenge_method', 'S256')
    return url.toString()
  }

  exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<MercadoPagoOAuthTokens> {
    return this.requestTokens({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
    })
  }

  refresh(refreshToken: string): Promise<MercadoPagoOAuthTokens> {
    return this.requestTokens({ grant_type: 'refresh_token', refresh_token: refreshToken })
  }

  private async requestTokens(params: Record<string, string>): Promise<MercadoPagoOAuthTokens> {
    const body = new URLSearchParams({
      client_id: ENV.MERCADOPAGO_MARKETPLACE_CLIENT_ID,
      client_secret: ENV.MERCADOPAGO_MARKETPLACE_CLIENT_SECRET,
      redirect_uri: ENV.MERCADOPAGO_OAUTH_REDIRECT_URI,
      ...params,
    })
    const response = await fetch(MERCADO_PAGO_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!response.ok) throw new Error(`Mercado Pago OAuth token request failed: ${response.status}`)
    const payload = (await response.json()) as Record<string, unknown>
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: userId,
      expires_in: expiresInSeconds,
      live_mode: isLiveMode,
      scope,
    } = payload
    if (
      typeof accessToken !== 'string' ||
      !accessToken ||
      typeof refreshToken !== 'string' ||
      !refreshToken ||
      userId === undefined ||
      typeof expiresInSeconds !== 'number' ||
      !expiresInSeconds
    ) {
      throw new Error('Mercado Pago OAuth response is missing required token fields')
    }
    return {
      accessToken,
      refreshToken,
      sellerId: String(userId),
      expiresInSeconds,
      isLiveMode: isLiveMode === true,
      scopes: parseScopes(scope),
    }
  }
}
