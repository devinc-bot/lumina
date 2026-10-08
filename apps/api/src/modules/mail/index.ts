export { MailModule } from './mail.module'
export { SendMailUseCase } from './application/send-mail.use-case'
export { SendMercadoPagoConnectionOtpUseCase } from './application/send-mercado-pago-connection-otp.use-case'
export { SendStaffInvitationUseCase } from './application/send-staff-invitation.use-case'
export { SendPasswordResetUseCase } from './application/send-password-reset.use-case'
export { SendUserRegistrationUseCase } from './application/send-user-registration.use-case'
export { SendWelcomeUseCase } from './application/send-welcome.use-case'
export { SendSmokeUseCase } from './application/send-smoke.use-case'
export { MailTemplatesService } from './application/services/mail-templates.service'
export type { MailSender } from './mail-sender.port'
export type {
  PasswordResetRenderInput,
  MercadoPagoConnectionOtpRenderInput,
  RenderedMail,
  SendMailInput,
  SendMailResult,
  StaffInvitationRenderInput,
  UserRegistrationRenderInput,
  WelcomeRenderInput,
} from './types'
