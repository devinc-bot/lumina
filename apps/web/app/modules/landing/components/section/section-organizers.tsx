import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@repo/ui'
import { clientEnv } from '~/config/env'
import { Container } from '~/modules/common/components/container'
import {
  LANDING_CTA_PRIMARY,
  LANDING_FOCUS_RING,
  LANDING_HEADING,
  LANDING_SECTION_Y,
} from '../../constants/layout'

type SectionOrganizersProps = {
  className?: string
}

export function SectionOrganizers({ className }: SectionOrganizersProps) {
  const { t } = useTranslation('landing')

  return (
    <section
      id="organizadores"
      aria-labelledby="organizers-heading"
      className={cn('scroll-mt-32 border-t border-outline-variant/30', className)}
    >
      <Container className={LANDING_SECTION_Y}>
        <div className="relative overflow-hidden rounded-app-xl bg-surface-container p-8 sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/5 blur-3xl motion-reduce:hidden"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-primary/5 blur-3xl motion-reduce:hidden"
            aria-hidden
          />

          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="space-y-3 lg:col-span-7">
              <span className="flex items-center gap-2 font-label text-xs font-semibold tracking-wider text-primary uppercase">
                <span className="h-0.5 w-2 bg-primary" aria-hidden />
                {t('organizers.kicker')}
              </span>
              <h2 id="organizers-heading" className={cn(LANDING_HEADING, 'text-on-surface')}>
                {t('organizers.headline')}
              </h2>
              <p className="max-w-[46ch] text-base leading-relaxed text-pretty text-on-surface-variant sm:text-lg">
                {t('organizers.support')}
              </p>
            </div>

            <div className="flex flex-col items-end lg:col-span-5">
              <a
                href={clientEnv.VITE_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex h-11 min-h-11 w-fit cursor-pointer items-center justify-center gap-2 px-8 text-[15px] font-medium',
                  LANDING_CTA_PRIMARY,
                  LANDING_FOCUS_RING
                )}
              >
                {t('organizers.cta')}
                <ExternalLink
                  className="size-7 shrink-0 opacity-90"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
