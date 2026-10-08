import { Text } from 'react-email'
import { MailLayout } from './mail-layout'
import {
  mailBodyTextStyle,
  mailIgnoreTextStyle,
  mailMutedTextStyle,
  mailOtpCodeStyle,
} from './mail-tokens'

export type MercadoPagoConnectionOtpEmailProps = {
  preview: string
  title: string
  brand: string
  body: string
  codeLabel: string
  code: string
  expires: string
  ignore: string
  footer: string
  copyright: string
  lang?: string
}

export function MercadoPagoConnectionOtpEmail({
  preview,
  title,
  brand,
  body,
  codeLabel,
  code,
  expires,
  ignore,
  footer,
  copyright,
  lang,
}: MercadoPagoConnectionOtpEmailProps) {
  return (
    <MailLayout
      preview={preview}
      title={title}
      brand={brand}
      footer={footer}
      copyright={copyright}
      lang={lang}
    >
      <Text style={mailBodyTextStyle}>{body}</Text>
      <Text style={mailMutedTextStyle}>{codeLabel}</Text>
      <Text style={mailOtpCodeStyle}>{code}</Text>
      <Text style={mailMutedTextStyle}>{expires}</Text>
      <Text style={mailIgnoreTextStyle}>{ignore}</Text>
    </MailLayout>
  )
}

MercadoPagoConnectionOtpEmail.PreviewProps = {
  preview: 'Código para conectar Mercado Pago',
  title: 'Confirmá la conexión de Mercado Pago',
  brand: 'Lumina',
  body: 'Usá este código para conectar tu cuenta de Mercado Pago.',
  codeLabel: 'Tu código de verificación',
  code: '001234',
  expires: 'Este código vence en 15 minutos.',
  ignore: 'Si no solicitaste esta acción, ignorá este correo.',
  footer: 'Este correo fue enviado por Lumina.',
  copyright: '© 2026 Lumina. Todos los derechos reservados.',
  lang: 'es',
} satisfies MercadoPagoConnectionOtpEmailProps

export default MercadoPagoConnectionOtpEmail
