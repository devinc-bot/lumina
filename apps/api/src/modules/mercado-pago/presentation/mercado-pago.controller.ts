import {
  Body,
  Controller,
  Delete,
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
  type JwtPayload,
  type MercadoPagoConnectionResponse,
  type PriceBreakdown,
} from '@repo/types'
import {
  marketplacePriceQuoteSchema,
  mercadoPagoOAuthCallbackSchema,
  ownerMarketplacePriceQuoteSchema,
  updateMercadoPagoSettlementTermSchema,
  type MarketplacePriceQuoteInput,
  type MercadoPagoOAuthCallbackInput,
  type OwnerMarketplacePriceQuoteInput,
  type UpdateMercadoPagoSettlementTermInput,
} from '@repo/validators'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ManageMercadoPagoConnectionUseCase } from '../application/manage-mercado-pago-connection.use-case'
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
    @Inject(QuoteMercadoPagoPriceUseCase)
    private readonly quoteMercadoPagoPriceUseCase: QuoteMercadoPagoPriceUseCase
  ) {}

  @Get(API_ROUTES.mercadoPago.path.connection())
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  getConnection(@CurrentUser() user: JwtPayload): Promise<MercadoPagoConnectionResponse> {
    return this.manageConnectionUseCase.getStatus(user.sub)
  }

  @Post(API_ROUTES.mercadoPago.path.connect())
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  startConnection(@CurrentUser() user: JwtPayload): Promise<{ authorizationUrl: string }> {
    return this.manageConnectionUseCase.start(user.sub)
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

  @Delete(API_ROUTES.mercadoPago.path.disconnect())
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([USER_ROLE.OWNER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  async disconnectConnection(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.manageConnectionUseCase.disconnect(user.sub)
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
