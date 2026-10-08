import { Module } from '@nestjs/common'
import { SesMailSender } from './adapters/ses.mail-sender'
import { SendMailUseCase } from './application/send-mail.use-case'
import { SendMercadoPagoConnectionOtpUseCase } from './application/send-mercado-pago-connection-otp.use-case'
import { SendPasswordResetUseCase } from './application/send-password-reset.use-case'
import { SendSmokeUseCase } from './application/send-smoke.use-case'
import { SendStaffInvitationUseCase } from './application/send-staff-invitation.use-case'
import { SendUserRegistrationUseCase } from './application/send-user-registration.use-case'
import { SendWelcomeUseCase } from './application/send-welcome.use-case'
import { MailConfigService } from './application/services/mail-config.service'
import { MailTemplatesService } from './application/services/mail-templates.service'
import { MAIL_SENDER } from './mail.tokens'

@Module({
  providers: [
    MailConfigService,
    MailTemplatesService,
    SendMailUseCase,
    SendMercadoPagoConnectionOtpUseCase,
    SendStaffInvitationUseCase,
    SendPasswordResetUseCase,
    SendUserRegistrationUseCase,
    SendWelcomeUseCase,
    SendSmokeUseCase,
    {
      provide: MAIL_SENDER,
      useClass: SesMailSender,
    },
  ],
  exports: [
    SendMailUseCase,
    SendMercadoPagoConnectionOtpUseCase,
    SendStaffInvitationUseCase,
    SendPasswordResetUseCase,
    SendUserRegistrationUseCase,
    SendWelcomeUseCase,
    SendSmokeUseCase,
    MailTemplatesService,
  ],
})
export class MailModule {}
