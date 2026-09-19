import { AppLogo } from './app-logo'

export const LANDING_LOGO_SRC = '/landing/isotipo.png'
export const APP_FAVICON_SRC = '/landing/favicon.png'

const LANDING_LOGO_SIZES = {
  header: { dimension: 56, className: 'size-14' },
  footer: { dimension: 80, className: 'size-20' },
} as const

export type LandingLogoProps = {
  alt: string
  size?: keyof typeof LANDING_LOGO_SIZES
}

export function LandingLogo({ alt, size = 'footer' }: LandingLogoProps) {
  const { dimension, className } = LANDING_LOGO_SIZES[size]

  return (
    <AppLogo
      src={LANDING_LOGO_SRC}
      alt={alt}
      size="xl"
      className={className}
      width={dimension}
      height={dimension}
    />
  )
}
