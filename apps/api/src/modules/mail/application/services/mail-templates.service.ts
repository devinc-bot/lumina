import { createElement, type ReactElement } from 'react'
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common'
import { render } from 'react-email'
import { DEFAULT_LANGUAGE, type Language } from '@repo/i18n'
import { MAIL_ERROR_CODE } from '@repo/i18n/constants'
import { OTP_TTL_MINUTES, OTP_TYPE } from '@repo/types'
import { TranslationService } from '@repo/i18n/server'
import type {
  MercadoPagoConnectionOtpRenderInput,
  PasswordResetRenderInput,
  RenderedMail,
  StaffInvitationRenderInput,
  UserRegistrationRenderInput,
  WelcomeRenderInput,
} from '../../types'
import { PasswordResetEmail } from '../../templates/password-reset'
import { MercadoPagoConnectionOtpEmail } from '../../templates/mercado-pago-connection-otp'
import { StaffInvitationEmail } from '../../templates/staff-invitation'
import { UserRegistrationEmail } from '../../templates/user-registration'
import { WelcomeEmail } from '../../templates/welcome'

@Injectable()
export class MailTemplatesService {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  async renderStaffInvitation(
    input: StaffInvitationRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<RenderedMail> {
    const t = (key: string, vars?: Record<string, unknown>) =>
      this.ts.translateEmail(key, vars, language)

    const subject = t('staffInvitation.subject', { clubName: input.clubName })
    const title = t('staffInvitation.title')
    const brand = t('common.brand')
    const body = t('staffInvitation.body', {
      inviterName: input.inviterName,
      clubName: input.clubName,
    })
    const cta = t('staffInvitation.cta')
    const ignore = t('staffInvitation.ignore')
    const footer = t('common.footer')
    const copyright = t('common.copyright', { year: new Date().getFullYear() })
    const expires =
      input.hours !== undefined ? t('staffInvitation.expires', { hours: input.hours }) : undefined
    const securityWordNote = input.includeSecurityWordNote
      ? t('staffInvitation.securityWordNote')
      : undefined

    return this.renderEmail(
      createElement(StaffInvitationEmail, {
        preview: subject,
        title,
        brand,
        body,
        cta,
        url: input.url,
        expires,
        securityWordNote,
        ignore,
        footer,
        copyright,
        lang: language,
      }),
      subject,
      [body, expires, securityWordNote, `${cta}: ${input.url}`, ignore, footer]
        .filter(Boolean)
        .join('\n\n')
    )
  }

  async renderMercadoPagoConnectionOtp(
    input: MercadoPagoConnectionOtpRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<RenderedMail> {
    const t = (key: string, vars?: Record<string, unknown>) =>
      this.ts.translateEmail(key, vars, language)
    const actionKey =
      input.type === OTP_TYPE.MERCADO_PAGO_DISCONNECTION ? 'disconnection' : 'connection'
    const keyPrefix = `mercadoPagoConnectionOtp.${actionKey}`
    const subject = t(`${keyPrefix}.subject`)
    const title = t(`${keyPrefix}.title`)
    const brand = t('common.brand')
    const body = t(`${keyPrefix}.body`)
    const codeLabel = t('mercadoPagoConnectionOtp.codeLabel')
    const expires = t('mercadoPagoConnectionOtp.expires', { minutes: OTP_TTL_MINUTES })
    const ignore = t('mercadoPagoConnectionOtp.ignore')
    const footer = t('common.footer')
    const copyright = t('common.copyright', { year: new Date().getFullYear() })

    return this.renderEmail(
      createElement(MercadoPagoConnectionOtpEmail, {
        preview: subject,
        title,
        brand,
        body,
        codeLabel,
        code: input.code,
        expires,
        ignore,
        footer,
        copyright,
        lang: language,
      }),
      subject,
      [body, `${codeLabel}: ${input.code}`, expires, ignore, footer].join('\n\n')
    )
  }

  async renderPasswordReset(
    input: PasswordResetRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<RenderedMail> {
    const t = (key: string, vars?: Record<string, unknown>) =>
      this.ts.translateEmail(key, vars, language)

    const subject = t('passwordReset.subject')
    const title = t('passwordReset.title')
    const brand = t('common.brand')
    const body = t('passwordReset.body')
    const cta = t('passwordReset.cta')
    const ignore = t('passwordReset.ignore')
    const footer = t('common.footer')
    const copyright = t('common.copyright', { year: new Date().getFullYear() })
    const expires =
      input.minutes !== undefined
        ? t('passwordReset.expires', { minutes: input.minutes })
        : undefined

    return this.renderEmail(
      createElement(PasswordResetEmail, {
        preview: subject,
        title,
        brand,
        body,
        cta,
        url: input.url,
        expires,
        ignore,
        footer,
        copyright,
        lang: language,
      }),
      subject,
      [body, expires, `${cta}: ${input.url}`, ignore, footer].filter(Boolean).join('\n\n')
    )
  }

  async renderUserRegistration(
    input: UserRegistrationRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<RenderedMail> {
    const t = (key: string, vars?: Record<string, unknown>) =>
      this.ts.translateEmail(key, vars, language)

    const subject = t('userRegistration.subject')
    const title = t('userRegistration.title')
    const brand = t('common.brand')
    const body = t('userRegistration.body')
    const cta = t('userRegistration.cta')
    const ignore = t('userRegistration.ignore')
    const footer = t('common.footer')
    const copyright = t('common.copyright', { year: new Date().getFullYear() })
    const expires =
      input.minutes !== undefined
        ? t('userRegistration.expires', { minutes: input.minutes })
        : undefined

    return this.renderEmail(
      createElement(UserRegistrationEmail, {
        preview: subject,
        title,
        brand,
        body,
        cta,
        url: input.url,
        expires,
        ignore,
        footer,
        copyright,
        lang: language,
      }),
      subject,
      [body, expires, `${cta}: ${input.url}`, ignore, footer].filter(Boolean).join('\n\n')
    )
  }

  async renderWelcome(
    input: WelcomeRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<RenderedMail> {
    const t = (key: string, vars?: Record<string, unknown>) =>
      this.ts.translateEmail(key, vars, language)

    const subject = t('welcome.subject')
    const title = t('welcome.title', { name: input.name })
    const brand = t('common.brand')
    const body = t('welcome.body')
    const cta = t('welcome.cta')
    const footer = t('common.footer')
    const copyright = t('common.copyright', { year: new Date().getFullYear() })

    return this.renderEmail(
      createElement(WelcomeEmail, {
        preview: subject,
        title,
        brand,
        body,
        cta,
        ctaUrl: input.ctaUrl,
        footer,
        copyright,
        lang: language,
      }),
      subject,
      [title, body, `${cta}: ${input.ctaUrl}`, footer].join('\n\n')
    )
  }

  private async renderEmail(
    element: ReactElement,
    subject: string,
    text: string
  ): Promise<RenderedMail> {
    try {
      const html = await render(element)
      return { subject, html, text }
    } catch {
      throw new InternalServerErrorException(this.ts.translateError(MAIL_ERROR_CODE.RENDER_FAILED))
    }
  }
}
