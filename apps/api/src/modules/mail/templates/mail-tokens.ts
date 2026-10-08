import type { CSSProperties } from 'react'

/**
 * Inline hex tokens aligned with DESIGN.md + `packages/ui` (email-safe).
 * Shell is dark; primary CTA matches shared UI primary (citrus + near-black on-primary).
 */
export const MAIL_COLOR = {
  background: '#121311',
  surfaceRaised: '#1e1f1c',
  /** `--color-surface-container-high` — callout / emphasis fill. */
  surfaceHigh: '#282a26',
  foreground: '#e6e7e2',
  muted: '#c5c8b8',
  inkMuted: '#b8bcab',
  hairline: '#44473c',
  /** Same fill as `--color-primary` in light and dark UI. */
  primary: '#dcff02',
  /** Same label as `--color-on-primary` / `--color-primary-foreground`. */
  onPrimary: '#2a3208',
} as const

export const MAIL_FONT = {
  display:
    'Montserrat, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
} as const

/** Control radius aligned with `--radius-app` (12px). */
export const MAIL_RADIUS = {
  control: '12px',
} as const

/** Spacing rhythm from DESIGN.md (8 / 12 / 16 / 24 / 32). */
export const MAIL_SPACE = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const

export const mailBodyTextStyle: CSSProperties = {
  color: MAIL_COLOR.foreground,
  fontFamily: MAIL_FONT.body,
  fontSize: '16px',
  lineHeight: '26px',
  margin: `0 0 ${MAIL_SPACE.sm}`,
}

export const mailMutedTextStyle: CSSProperties = {
  color: MAIL_COLOR.muted,
  fontFamily: MAIL_FONT.body,
  fontSize: '14px',
  lineHeight: '22px',
  margin: `0 0 ${MAIL_SPACE.xs}`,
}

/** Secondary note after the CTA (ignore / discard guidance). */
export const mailIgnoreTextStyle: CSSProperties = {
  ...mailMutedTextStyle,
  marginTop: MAIL_SPACE.lg,
}

export const mailPlainUrlStyle: CSSProperties = {
  color: MAIL_COLOR.inkMuted,
  fontFamily: MAIL_FONT.body,
  fontSize: '13px',
  lineHeight: '20px',
  margin: `${MAIL_SPACE.sm} 0 0`,
  wordBreak: 'break-all',
}

export const mailCalloutStyle: CSSProperties = {
  backgroundColor: MAIL_COLOR.surfaceHigh,
  borderRadius: MAIL_RADIUS.control,
  color: MAIL_COLOR.muted,
  fontFamily: MAIL_FONT.body,
  fontSize: '14px',
  lineHeight: '22px',
  margin: `0 0 ${MAIL_SPACE.md}`,
  padding: `${MAIL_SPACE.sm} ${MAIL_SPACE.md}`,
}

export const mailOtpCodeStyle: CSSProperties = {
  backgroundColor: MAIL_COLOR.surfaceHigh,
  borderRadius: MAIL_RADIUS.control,
  color: MAIL_COLOR.primary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.2em',
  lineHeight: '36px',
  margin: `0 0 ${MAIL_SPACE.md}`,
  padding: `${MAIL_SPACE.md} ${MAIL_SPACE.lg}`,
  textAlign: 'center',
}
