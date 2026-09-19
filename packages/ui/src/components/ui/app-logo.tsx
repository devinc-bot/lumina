import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

/** Public path served by each app (apps/web|dashboard|admin/public/landing/favicon.png). */
export const APP_LOGO_SRC = '/landing/favicon.png'

const appLogoVariants = cva('shrink-0 object-contain', {
  variants: {
    size: {
      sm: 'size-8',
      md: 'size-10',
      lg: 'size-11',
      xl: 'size-12',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export type AppLogoProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'alt'> &
  VariantProps<typeof appLogoVariants> & {
    /** Override asset path. Defaults to {@link APP_LOGO_SRC}. */
    src?: string
    /**
     * Accessible name. Empty string (default) marks the logo as decorative
     * (aria-hidden) when adjacent brand text already names the product.
     */
    alt?: string
  }

function AppLogo({ className, size, src = APP_LOGO_SRC, alt = '', ...props }: AppLogoProps) {
  const decorative = alt === ''

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={decorative ? true : undefined}
      className={cn(appLogoVariants({ size }), className)}
      {...props}
    />
  )
}

export { AppLogo, appLogoVariants }
