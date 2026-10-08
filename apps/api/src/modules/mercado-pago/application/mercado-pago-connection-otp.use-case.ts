import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  consumeLockedMercadoPagoConnectionOtp,
  createMercadoPagoOAuthStateInTransaction,
  disconnectMercadoPagoConnection,
  findOwnerProfileByDocumentId,
  findSoleOrganizationByOwnerDocumentId,
  invalidateMercadoPagoConnectionOtpForDeliveryFailure,
  issueMercadoPagoConnectionOtp,
  recordMercadoPagoConnectionOtpFailure,
  withLockedActiveMercadoPagoConnectionOtp,
} from '@repo/db'
import {
  OTP_MAX_ISSUANCES_PER_WINDOW,
  MERCADO_PAGO_OTP_ERROR_MESSAGE,
  OTP_RESEND_COOLDOWN_MILLISECONDS,
  OTP_TTL_MILLISECONDS,
  OTP_TYPE,
  type OtpChallengeResponse,
  type OtpType,
} from '@repo/types'
import { hashValue, verifyValue } from '../../common/utils/bcrypt.utils'
import { SendMercadoPagoConnectionOtpUseCase } from '../../mail'
import { createHash, randomInt, randomBytes, randomUUID } from 'node:crypto'
import { ENV } from '../../../config/env'
import { encryptMercadoPagoCredential } from '../mercado-pago-credential-crypto'
import type { MercadoPagoOAuthPort } from '../mercado-pago-oauth.port'
import { MERCADO_PAGO_OAUTH_PORT } from '../mercado-pago.tokens'

const OAUTH_STATE_TTL_MILLISECONDS = 10 * 60 * 1000

function getOrganizationScope(organizationId: number): string {
  return 'organization:' + organizationId
}

function getChallengeHashInput(documentId: string, code: string): string {
  return documentId + ':' + code
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return (local[0] ?? '*') + '***@' + domain
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
export class MercadoPagoConnectionOtpUseCase {
  constructor(
    @Inject(MERCADO_PAGO_OAUTH_PORT) private readonly mercadoPagoOAuth: MercadoPagoOAuthPort,
    @Inject(SendMercadoPagoConnectionOtpUseCase)
    private readonly sendOtp: SendMercadoPagoConnectionOtpUseCase
  ) {}

  async request(ownerDocumentId: string, type: OtpType): Promise<OtpChallengeResponse> {
    if (type === OTP_TYPE.MERCADO_PAGO_CONNECTION) assertMarketplaceConfiguration()
    const [organization, owner] = await Promise.all([
      findSoleOrganizationByOwnerDocumentId(ownerDocumentId),
      findOwnerProfileByDocumentId(ownerDocumentId),
    ])
    if (!organization || !owner) throw new NotFoundException('Owner organization was not found')

    const now = new Date()
    const documentId = randomUUID()
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const issued = await issueMercadoPagoConnectionOtp({
      documentId,
      type,
      ownerDocumentId,
      organizationScope: getOrganizationScope(organization.id),
      codeHash: await hashValue(getChallengeHashInput(documentId, code)),
      expiresAt: new Date(now.getTime() + OTP_TTL_MILLISECONDS),
      issuanceWindowStartedAt: new Date(now.getTime() - OTP_TTL_MILLISECONDS),
      maximumIssuances: OTP_MAX_ISSUANCES_PER_WINDOW,
      now,
    })
    if (issued.kind === 'issuance_limit_reached') {
      throw new BadRequestException(MERCADO_PAGO_OTP_ERROR_MESSAGE.REQUEST_LIMIT_REACHED)
    }

    try {
      await this.sendOtp.execute(owner.email, { type, code })
    } catch (error) {
      await invalidateMercadoPagoConnectionOtpForDeliveryFailure({
        documentId,
        type,
        ownerDocumentId,
        organizationScope: getOrganizationScope(organization.id),
        now: new Date(),
      })
      throw error
    }

    return {
      otpDocumentId: issued.otp.documentId,
      type,
      expiresAt: issued.otp.expiresAt.toISOString(),
      maskedDestination: maskEmail(owner.email),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MILLISECONDS).toISOString(),
    }
  }

  async verifyConnection(ownerDocumentId: string, input: { otpDocumentId: string; code: string }) {
    assertMarketplaceConfiguration()
    const organization = await this.getOrganization(ownerDocumentId)
    const otp = await this.getVerifiedOtp({
      ownerDocumentId,
      organizationId: organization.id,
      type: OTP_TYPE.MERCADO_PAGO_CONNECTION,
      ...input,
    })
    if (!otp) throw new BadRequestException(MERCADO_PAGO_OTP_ERROR_MESSAGE.INVALID_OR_EXPIRED)

    const result = await consumeLockedMercadoPagoConnectionOtp(
      {
        documentId: input.otpDocumentId,
        type: OTP_TYPE.MERCADO_PAGO_CONNECTION,
        ownerDocumentId,
        organizationScope: getOrganizationScope(organization.id),
        now: new Date(),
      },
      async ({ tx, now }) => {
        const state = randomBytes(32).toString('base64url')
        const codeVerifier = randomBytes(32).toString('base64url')
        await createMercadoPagoOAuthStateInTransaction(tx, {
          organizationId: organization.id,
          ownerDocumentId,
          stateHash: createHash('sha256').update(state).digest('base64url'),
          codeVerifierEncrypted: encryptMercadoPagoCredential(codeVerifier),
          expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MILLISECONDS),
          otpVerifiedAt: now,
          now,
        })
        return { authorizationUrl: this.mercadoPagoOAuth.getAuthorizationUrl(state, codeVerifier) }
      }
    )
    if (!result) throw new BadRequestException(MERCADO_PAGO_OTP_ERROR_MESSAGE.INVALID_OR_EXPIRED)
    return result
  }

  async verifyDisconnection(
    ownerDocumentId: string,
    input: { otpDocumentId: string; code: string }
  ) {
    const organization = await this.getOrganization(ownerDocumentId)
    const otp = await this.getVerifiedOtp({
      ownerDocumentId,
      organizationId: organization.id,
      type: OTP_TYPE.MERCADO_PAGO_DISCONNECTION,
      ...input,
    })
    if (!otp) throw new BadRequestException(MERCADO_PAGO_OTP_ERROR_MESSAGE.INVALID_OR_EXPIRED)

    const result = await consumeLockedMercadoPagoConnectionOtp(
      {
        documentId: input.otpDocumentId,
        type: OTP_TYPE.MERCADO_PAGO_DISCONNECTION,
        ownerDocumentId,
        organizationScope: getOrganizationScope(organization.id),
        now: new Date(),
      },
      async ({ tx, now }) => {
        await disconnectMercadoPagoConnection(organization.id, now, tx)
      }
    )
    if (result === null)
      throw new BadRequestException(MERCADO_PAGO_OTP_ERROR_MESSAGE.INVALID_OR_EXPIRED)
  }

  private async getOrganization(ownerDocumentId: string) {
    const organization = await findSoleOrganizationByOwnerDocumentId(ownerDocumentId)
    if (!organization) throw new NotFoundException('Owner organization was not found')
    return organization
  }

  private async getVerifiedOtp(input: {
    otpDocumentId: string
    code: string
    ownerDocumentId: string
    organizationId: number
    type: OtpType
  }): Promise<boolean> {
    const locked = await withLockedActiveMercadoPagoConnectionOtp(
      {
        documentId: input.otpDocumentId,
        type: input.type,
        ownerDocumentId: input.ownerDocumentId,
        organizationScope: getOrganizationScope(input.organizationId),
        now: new Date(),
      },
      async ({ challenge }) =>
        verifyValue(getChallengeHashInput(challenge.documentId, input.code), challenge.codeHash)
    )
    if (locked === null) return false
    if (locked) return true
    await recordMercadoPagoConnectionOtpFailure({
      documentId: input.otpDocumentId,
      type: input.type,
      ownerDocumentId: input.ownerDocumentId,
      organizationScope: getOrganizationScope(input.organizationId),
      now: new Date(),
    })
    return false
  }
}
