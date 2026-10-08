import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { API_ROUTES } from '@repo/common'
import {
  USER_ROLE,
  OTP_TYPE,
  type JwtPayload,
  type MercadoPagoConnectionResponse,
  type PriceBreakdown,
} from '@repo/types'
import {
  marketplacePriceQuoteSchema,
  mercadoPagoOAuthCallbackSchema,
  ownerMarketplacePriceQuoteSchema,
  updateMercadoPagoSettlementTermSchema,
  verifyOtpSchema,
  type MarketplacePriceQuoteInput,
  type MercadoPagoOAuthCallbackInput,
  type OwnerMarketplacePriceQuoteInput,
  type UpdateMercadoPagoSettlementTermInput,
  type VerifyOtpInput,
} from '@repo/validators'
import { RATE_LIMIT_PROFILE } from '../../../config/rate-limit.policy'
import { ApiRateLimit } from '../../common/decorators/api-rate-limit.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ManageMercadoPagoConnectionUseCase } from '../application/manage-mercado-pago-connection.use-case'
import { MercadoPagoConnectionOtpUseCase } from '../application/mercado-pago-connection-otp.use-case'
import { QuoteMercadoPagoPriceUseCase } from '../application/quote-mercado-pago-price.use-case'
import { ReconcileMercadoPagoWebhookUseCase } from '../application/reconcile-webhook.use-case'
import { ENV } from '../../../config/env'

@Controller(API_ROUTES.mercadoPago.prefix)
export class MercadoPagoController {
  constructor(
    @Inject(ReconcileMercadoPagoWebhookUseCase)
    private readonly reconcileWebhookUseCase: ReconcileMercadoPagoWebhookUseCase,
    @Inject(ManageMercadoPagoConnectionUseCase)
    private readonly manageConnectionUseCase: ManageMercadoPagoConnectionUseCase,
    @Inject(MercadoPagoConnectionOtpUseCase)
    private readonly connectionOtpUseCase: MercadoPagoConnectionOtpUseCase,
    @Inject(QuoteMercadoPagoPriceUseCase)
    private readonly quoteMercadoPagoPriceUseCase: QuoteMercadoPagoPriceUseCase
  ) {}

  @Get(API_ROUTES.mercadoPago.path.connection())
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  getConnection(@CurrentUser() user: JwtPayload): Promise<MercadoPagoConnectionResponse> {
    return this.manageConnectionUseCase.getStatus(user.sub)
  }

  @Post(API_ROUTES.mercadoPago.path.connectOtp())
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiRateLimit(RATE_LIMIT_PROFILE.AUTH_SENSITIVE)
  requestConnectionOtp(@CurrentUser() user: JwtPayload) {
    return this.connectionOtpUseCase.request(user.sub, OTP_TYPE.MERCADO_PAGO_CONNECTION)
  }

  @Post(API_ROUTES.mercadoPago.path.connectOtpVerify())
  @ApiRateLimit(RATE_LIMIT_PROFILE.AUTH_CONFIRM)
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  verifyConnectionOtp(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput
  ): Promise<{ authorizationUrl: string }> {
    return this.connectionOtpUseCase.verifyConnection(user.sub, input)
  }

  @Get(API_ROUTES.mercadoPago.path.callback())
  @Redirect()
  async completeConnection(
    @Query(new ZodValidationPipe(mercadoPagoOAuthCallbackSchema))
    callback: MercadoPagoOAuthCallbackInput
  ): Promise<{ url: string }> {
    await this.manageConnectionUseCase.complete(callback)
    return {
      url: new URL('/settings?mercadoPago=connected', ENV.DASHBOARD_URL).toString(),
    }
  }

  @Post(API_ROUTES.mercadoPago.path.disconnectOtp())
  @ApiRateLimit(RATE_LIMIT_PROFILE.AUTH_SENSITIVE)
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  requestDisconnectOtp(@CurrentUser() user: JwtPayload) {
    return this.connectionOtpUseCase.request(user.sub, OTP_TYPE.MERCADO_PAGO_DISCONNECTION)
  }

  @Post(API_ROUTES.mercadoPago.path.disconnectOtpVerify())
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRateLimit(RATE_LIMIT_PROFILE.AUTH_CONFIRM)
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  async verifyDisconnectOtp(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput
  ): Promise<void> {
    await this.connectionOtpUseCase.verifyDisconnection(user.sub, input)
  }

  @Patch(API_ROUTES.mercadoPago.path.connectionSettlement())
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateSettlementTerm(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateMercadoPagoSettlementTermSchema))
    input: UpdateMercadoPagoSettlementTermInput
  ): Promise<void> {
    await this.manageConnectionUseCase.updateSettlementTerm(user.sub, input.settlementTerm)
  }

  @Get(API_ROUTES.mercadoPago.path.connectionQuote())
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  quoteForOwner(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ownerMarketplacePriceQuoteSchema))
    input: OwnerMarketplacePriceQuoteInput
  ): Promise<PriceBreakdown> {
    return this.quoteMercadoPagoPriceUseCase.executeForOwner(user.sub, input)
  }

  @Get(API_ROUTES.mercadoPago.path.quote())
  quote(
    @Query(new ZodValidationPipe(marketplacePriceQuoteSchema)) input: MarketplacePriceQuoteInput
  ): Promise<PriceBreakdown> {
    return this.quoteMercadoPagoPriceUseCase.execute(input)
  }

  @Post(API_ROUTES.mercadoPago.path.webhook())
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async webhook(
    @Body() body: unknown,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') dataId: string | undefined
  ): Promise<void> {
    await this.reconcileWebhookUseCase.execute(body, signature, requestId, dataId)
  }
}
