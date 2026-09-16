import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Button, cn } from '@repo/ui'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import { LANDING_IMAGES } from '../constants/images'
import { LANDING_CTA_PRIMARY, LANDING_CTA_SECONDARY, LANDING_MAX } from '../constants/layout'

const HERO_IN_DELAYS = {
  badge: 0,
  headline: 90,
  support: 180,
  cta: 260,
} as const

function heroInStyle(delayMs: number): CSSProperties {
  return { ['--landing-delay' as string]: delayMs }
}

export function SectionHero() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section
      id="inicio"
      aria-labelledby="hero-heading"
      className="relative flex min-h-[min(100dvh,58rem)] w-full flex-col overflow-hidden bg-surface-dim"
    >
      <div className="absolute inset-0">
        <img
          src={LANDING_IMAGES.hero.src}
          srcSet={LANDING_IMAGES.hero.srcSet}
          sizes="100vw"
          width={2048}
          height={1152}
          alt={t('hero.imageAlt')}
          className="h-full w-full scale-[1.02] object-cover object-center animate-hero-drift"
          fetchPriority="high"
          decoding="async"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-surface-dim via-surface-dim/80 to-surface-dim/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-surface-dim/70 via-transparent to-transparent"
          aria-hidden
        />
      </div>

      <div
        className={cn(
          LANDING_MAX,
          'relative z-10 flex flex-1 flex-col justify-end gap-6 pt-36 pb-10 md:pt-36 md:pb-14'
        )}
      >
        <div
          className="inline-flex w-fit items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container/90 px-3.5 py-1.5 backdrop-blur-md animate-landing-hero-in"
          style={heroInStyle(HERO_IN_DELAYS.badge)}
        >
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse motion-reduce:animate-none"
            aria-hidden
          />
          <span className="font-label text-xs font-medium tracking-wider text-on-surface-variant uppercase">
            {t('hero.eyebrow')}
          </span>
        </div>

        <div className="flex max-w-3xl flex-col gap-6">
          <h1
            id="hero-heading"
            className="max-w-[18ch] font-display text-[clamp(2.25rem,6vw,4.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance text-on-surface animate-landing-hero-in"
            style={heroInStyle(HERO_IN_DELAYS.headline)}
          >
            {t('hero.headline')}
          </h1>
          <p
            className="max-w-2xl text-base leading-relaxed text-pretty text-on-surface-variant sm:text-xl animate-landing-hero-in"
            style={heroInStyle(HERO_IN_DELAYS.support)}
          >
            {t('hero.support')}
          </p>
          <div
            className="flex flex-wrap items-center gap-3 pt-2 animate-landing-hero-in"
            style={heroInStyle(HERO_IN_DELAYS.cta)}
          >
            <Button asChild size="lg" className={LANDING_CTA_PRIMARY}>
              <Link to={DASHBOARD_ROUTES.register()}>{t('hero.ctaPrimary')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className={LANDING_CTA_SECONDARY}>
              <Link to={DASHBOARD_ROUTES.login()}>{t('hero.ctaSecondary')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
