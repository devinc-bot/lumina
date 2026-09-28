import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  consumeMercadoPagoOAuthState,
  createMercadoPagoOAuthState,
  disconnectMercadoPagoConnection,
  findMercadoPagoConnectionByOrganizationId,
  findSoleOrganizationByOwnerDocumentId,
  toMercadoPagoConnectionResponse,
  updateMercadoPagoConnectionSettlementTerm,
  upsertMercadoPagoConnection,
} from '@repo/db'
import type { MercadoPagoConnectionResponse, MercadoPagoSettlementTerm } from '@repo/types'
import { createHash, randomBytes } from 'node:crypto'
import { ENV } from '../../../config/env'
import {
  decryptMercadoPagoCredential,
  encryptMercadoPagoCredential,
} from '../mercado-pago-credential-crypto'
import type { MercadoPagoOAuthPort } from '../mercado-pago-oauth.port'
import { MERCADO_PAGO_OAUTH_PORT } from '../mercado-pago.tokens'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

function hashState(state: string): string {
  return createHash('sha256').update(state).digest('base64url')
}

function assertMarketplaceConfiguration(): void {
  if (
    !ENV.MERCADOPAGO_MARKETPLACE_ENABLED ||
    !ENV.MERCADOPAGO_MARKETPLACE_CLIENT_ID ||
    !ENV.MERCADOPAGO_MARKETPLACE_CLIENT_SECRET ||
    !ENV.MERCADOPAGO_OAUTH_REDIRECT_URI ||
    !ENV.MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY
  ) {
    throw new BadRequestException('Mercado Pago marketplace is not configured')
  }
}

@Injectable()
export class ManageMercadoPagoConnectionUseCase {
  constructor(
    @Inject(MERCADO_PAGO_OAUTH_PORT) private readonly mercadoPagoOAuth: MercadoPagoOAuthPort
  ) {}

  async getStatus(ownerDocumentId: string): Promise<MercadoPagoConnectionResponse> {
    const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
    if (!organization) throw new NotFoundException('Owner organization was not found')
    return toMercadoPagoConnectionResponse(
      await findMercadoPagoConnectionByOrganizationId(organization.id)
    )
  }

  async start(ownerDocumentId: string): Promise<{ authorizationUrl: string }> {
    try {
      assertMarketplaceConfiguration()
      const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
      if (!organization) throw new NotFoundException('Owner organization was not found')
      const now = new Date()
      const state = randomBytes(32).toString('base64url')
      const codeVerifier = randomBytes(32).toString('base64url')
      await createMercadoPagoOAuthState({
        organizationId: organization.id,
        ownerDocumentId,
        stateHash: hashState(state),
        codeVerifierEncrypted: encryptMercadoPagoCredential(codeVerifier),
        expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MS),
        now,
      })
      return { authorizationUrl: this.mercadoPagoOAuth.getAuthorizationUrl(state, codeVerifier) }
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('Failed to start Mercado Pago connection')
    }
  }

  async complete(input: { code: string; state: string }): Promise<MercadoPagoConnectionResponse> {
    assertMarketplaceConfiguration()
    const now = new Date()
    const state = await consumeMercadoPagoOAuthState({ stateHash: hashState(input.state), now })
    if (!state)
      throw new BadRequestException('Mercado Pago authorization state is invalid or expired')
    // The callback has no Lumina session because it originates at Mercado Pago. The
    // opaque, single-use state is therefore the callback credential. Re-resolving
    // its owner prevents an orphaned or tampered state record from connecting a
    // seller account to a different organization.
    const ownerOrganization = await findSoleOrganizationByOwnerDocumentId(state.ownerDocumentId)
    if (!ownerOrganization || ownerOrganization.id !== state.organizationId) {
      throw new BadRequestException('Mercado Pago authorization state owner is invalid')
    }
    const tokens = await this.mercadoPagoOAuth.exchangeAuthorizationCode(
      input.code,
      decryptMercadoPagoCredential(state.codeVerifierEncrypted)
    )
    const connection = await upsertMercadoPagoConnection({
      organizationId: state.organizationId,
      sellerId: tokens.sellerId,
      isLiveMode: tokens.isLiveMode,
      grantedScopes: tokens.scopes,
      accessTokenEncrypted: encryptMercadoPagoCredential(tokens.accessToken),
      refreshTokenEncrypted: encryptMercadoPagoCredential(tokens.refreshToken),
      accessTokenExpiresAt: new Date(now.getTime() + tokens.expiresInSeconds * 1000),
      encryptionKeyVersion: ENV.MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY_VERSION,
      now,
    })
    return toMercadoPagoConnectionResponse(connection)
  }

  async disconnect(ownerDocumentId: string): Promise<void> {
    const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
    if (!organization) throw new NotFoundException('Owner organization was not found')
    await disconnectMercadoPagoConnection(organization.id, new Date())
  }

  async updateSettlementTerm(
    ownerDocumentId: string,
    settlementTerm: MercadoPagoSettlementTerm
  ): Promise<void> {
    const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
    if (!organization) throw new NotFoundException('Owner organization was not found')
    await updateMercadoPagoConnectionSettlementTerm({
      organizationId: organization.id,
      settlementTerm,
      now: new Date(),
    })
  }
}
