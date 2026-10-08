import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MailModule } from '../mail'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { MercadoPagoCheckoutProSdkAdapter } from './adapters/mercado-pago-checkout-pro.sdk-adapter'
import { MercadoPagoOAuthHttpAdapter } from './adapters/mercado-pago-oauth.http-adapter'
import { ManageMercadoPagoConnectionUseCase } from './application/manage-mercado-pago-connection.use-case'
import { MercadoPagoConnectionOtpUseCase } from './application/mercado-pago-connection-otp.use-case'
import { MercadoPagoCredentialResolver } from './application/mercado-pago-credential-resolver'
import { QuoteMercadoPagoPriceUseCase } from './application/quote-mercado-pago-price.use-case'
import { ReconcileMercadoPagoWebhookUseCase } from './application/reconcile-webhook.use-case'
import {
  MERCADO_PAGO_CHECKOUT_PRO_PORT,
  MERCADO_PAGO_CREDENTIAL_RESOLVER,
  MERCADO_PAGO_OAUTH_PORT,
} from './mercado-pago.tokens'
import { MercadoPagoController } from './presentation/mercado-pago.controller'

@Module({
  imports: [AuthModule, MailModule],
  controllers: [MercadoPagoController],
  providers: [
    MercadoPagoCheckoutProSdkAdapter,
    MercadoPagoOAuthHttpAdapter,
    {
      provide: MERCADO_PAGO_CHECKOUT_PRO_PORT,
      useExisting: MercadoPagoCheckoutProSdkAdapter,
    },
    {
      provide: MERCADO_PAGO_OAUTH_PORT,
      useExisting: MercadoPagoOAuthHttpAdapter,
    },
    {
      provide: MERCADO_PAGO_CREDENTIAL_RESOLVER,
      useFactory: (oauth: MercadoPagoOAuthHttpAdapter) => new MercadoPagoCredentialResolver(oauth),
      inject: [MERCADO_PAGO_OAUTH_PORT],
    },
    ReconcileMercadoPagoWebhookUseCase,
    ManageMercadoPagoConnectionUseCase,
    MercadoPagoConnectionOtpUseCase,
    QuoteMercadoPagoPriceUseCase,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [MERCADO_PAGO_CHECKOUT_PRO_PORT, MERCADO_PAGO_CREDENTIAL_RESOLVER],
})
export class MercadoPagoModule {}
