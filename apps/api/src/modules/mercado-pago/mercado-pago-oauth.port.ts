export type MercadoPagoOAuthTokens = {
  accessToken: string
  refreshToken: string
  sellerId: string
  expiresInSeconds: number
  isLiveMode: boolean
  scopes: string[]
}

export interface MercadoPagoOAuthPort {
  getAuthorizationUrl(state: string, codeVerifier: string): string
  exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<MercadoPagoOAuthTokens>
  refresh(refreshToken: string): Promise<MercadoPagoOAuthTokens>
}
