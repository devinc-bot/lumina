import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { VT, cn, vtStyle } from '@repo/ui'
import { LandingFooter } from '~/modules/landing/components/footer'
import { LandingHeader } from '~/modules/common/components/landing-header'
import { LANDING_FOCUS_RING } from '~/modules/landing/constants/layout'

type PublicAppShellProps = {
  children: ReactNode
}

/** Chrome for public app pages (discovery, etc.) — not the marketing landing or auth. */
export function PublicAppShell({ children }: PublicAppShellProps) {
  const { t } = useTranslation('landing')

  return (
    <div className="flex min-h-dvh flex-col bg-background text-on-surface">
      <a
        href="#contenido"
        className={cn(
          'absolute top-4 left-4 z-50 -translate-y-16 rounded-app bg-on-surface px-4 py-2.5 font-label text-sm font-medium text-background transition-transform duration-(--duration-fast) ease-emphasized focus:translate-y-0 motion-reduce:transition-none',
          LANDING_FOCUS_RING
        )}
      >
        {t('skipToContent')}
      </a>

      <LandingHeader />

      {/* pt clears the fixed header (top-5 + h-[4.5rem]) */}
      <main id="contenido" className="flex-1 pt-24 pb-10" style={vtStyle(VT.mainContent)}>
        {children}
      </main>

      <LandingFooter />
    </div>
  )
}
