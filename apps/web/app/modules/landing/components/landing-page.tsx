import { useEffect } from 'react'
import { scrollToSectionFromLocationHash } from '@repo/common'
import { Link, Skeleton, cn } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { LandingHeader } from '~/modules/common/components/landing-header'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { useSession } from '~/modules/common/hooks/use-session'
import {
  LANDING_CTA_HERO_SECONDARY,
  LANDING_CTA_PRIMARY,
  LANDING_FOCUS_RING,
  LANDING_HEADING,
  LANDING_SECTION_Y,
} from '../constants/layout'
import { HowSteps } from './how-steps'
import { LandingFooter } from './footer'
import { SectionAbout } from './section/section-about'
import { SectionAreYouReady } from './section/section-are-you-ready'
import { SectionClarity } from './section/section-clarity'
import { SectionEvents } from './section/section-events'
import { SectionHero } from './section/section-hero'
import { SectionOrganizers } from './section/section-organizers'
import { Container } from '~/modules/common/components/container'

export function LandingPage() {
  const { t } = useTranslation('landing')
  const { isAuthenticated, isLoading } = useSession()
  const showAuthCtas = !isLoading && !isAuthenticated

  useEffect(() => {
    scrollToSectionFromLocationHash()
  }, [])

  return (
    <div className="min-h-dvh bg-background text-on-surface">
      <a
        href="#contenido"
        className={cn(
          'absolute top-4 left-4 z-50 -translate-y-16 rounded-app-sm bg-on-surface px-4 py-2.5 font-label text-sm font-medium text-background transition-transform duration-(--duration-fast) ease-emphasized focus:translate-y-0 motion-reduce:transition-none',
          LANDING_FOCUS_RING
        )}
      >
        {t('skipToContent')}
      </a>

      <LandingHeader />

      {/* No view-transition-name: it isolates stacking and breaks backdrop-blur on the about glass panel. */}
      <main id="contenido">
        <SectionHero showAuthCtas={showAuthCtas || isLoading}>
          {isLoading ? (
            <div
              className="mt-8 flex flex-wrap items-center gap-3"
              aria-busy="true"
              aria-label={t('hero.ctaLoading')}
            >
              <Skeleton className="h-12 w-40 rounded-app bg-surface-container-high/80" />
              <Skeleton className="h-12 w-28 rounded-app bg-surface-container/70" />
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={WEB_ROUTES.register()}
                size="lg"
                className={cn('px-8 py-4', LANDING_CTA_PRIMARY, LANDING_FOCUS_RING)}
              >
                {t('hero.ctaPrimary')}
              </Link>
              <Link
                to={WEB_ROUTES.login()}
                variant="outline"
                size="lg"
                className={cn('px-7 py-4', LANDING_CTA_HERO_SECONDARY, LANDING_FOCUS_RING)}
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          )}
        </SectionHero>

        <SectionAbout />

        <Container
          as="section"
          id="como-funciona"
          aria-labelledby="how-heading"
          className={cn(LANDING_SECTION_Y, 'scroll-mt-32')}
        >
          <div className="max-w-2xl space-y-3">
            <span className="flex items-center gap-2 font-label text-xs font-semibold tracking-wider text-primary uppercase">
              <span className="h-0.5 w-2 bg-primary" aria-hidden />
              {t('how.kicker')}
            </span>
            <h2 id="how-heading" className={cn(LANDING_HEADING, 'text-on-surface')}>
              {t('how.headline')}
            </h2>
            <p className="max-w-[46ch] text-base leading-relaxed text-pretty text-on-surface-variant sm:text-lg">
              {t('how.support')}
            </p>
          </div>
          <HowSteps />
        </Container>

        <SectionClarity />

        <SectionEvents showAuthCtas={showAuthCtas} />

        <SectionOrganizers />

        <SectionAreYouReady showAuthCtas={showAuthCtas} />
      </main>

      <LandingFooter />
    </div>
  )
}
