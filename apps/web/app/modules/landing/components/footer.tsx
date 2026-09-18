import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { handleSectionNavClick, sectionIdFromHash } from '@repo/common'
import { LandingLogo, Link, cn } from '@repo/ui'
import { clientEnv } from '~/config/env'
import { Container } from '~/modules/common/components/container'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { LANDING_CTA_PRIMARY, LANDING_FOCUS_RING } from '../constants/layout'

const FOOTER_LINK = cn(
  'inline-flex min-h-11 items-center rounded-app-sm px-0 font-label text-sm text-on-surface-variant transition-colors duration-(--duration-fast) ease-emphasized hover:text-on-surface',
  LANDING_FOCUS_RING
)

const SOCIAL_LINKS = [
  {
    key: 'instagram',
    href: 'https://www.instagram.com/repo',
    labelKey: 'footer.social.instagram',
  },
  {
    key: 'facebook',
    href: 'https://www.facebook.com/repo',
    labelKey: 'footer.social.facebook',
  },
] as const

const EXPLORE_SECTION_NAV = [
  { href: '#eventos', labelKey: 'nav.events' },
  { href: '#como-funciona', labelKey: 'nav.how' },
  { href: '#claridad', labelKey: 'nav.clarity' },
  { href: '#organizadores', labelKey: 'nav.organizers' },
] as const

const SOCIAL_ICON_CLASS = 'size-7 shrink-0'

function InstagramIcon() {
  return (
    <svg
      className={SOCIAL_ICON_CLASS}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg
      className={SOCIAL_ICON_CLASS}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.2l.8-3H14V9z" />
    </svg>
  )
}

const SOCIAL_ICONS: Record<(typeof SOCIAL_LINKS)[number]['key'], ReactNode> = {
  instagram: <InstagramIcon />,
  facebook: <FacebookIcon />,
}

export function LandingFooter() {
  const { t } = useTranslation('landing')
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isLanding = pathname === WEB_ROUTES.home()
  const year = new Date().getFullYear()

  const onSectionClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isLanding) {
      handleSectionNavClick(event, href)
      return
    }
    event.preventDefault()
    void navigate({ to: WEB_ROUTES.home(), hash: sectionIdFromHash(href) })
  }

  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-lowest">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <Link to={WEB_ROUTES.home()} className="h-20 px-0">
              <LandingLogo alt={t('nav.brand')} />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              {t('footer.tagline')}
            </p>
          </div>

          <nav
            aria-label={t('footer.navAria')}
            className="flex flex-col gap-4 lg:col-span-2 lg:col-start-6"
          >
            <p className="font-label text-xs font-semibold tracking-[0.14em] text-on-surface uppercase">
              {t('footer.explore')}
            </p>
            <ul className="flex flex-col gap-1">
              {EXPLORE_SECTION_NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={isLanding ? item.href : `${WEB_ROUTES.home()}${item.href}`}
                    onClick={(event) => onSectionClick(event, item.href)}
                    className={FOOTER_LINK}
                  >
                    {t(item.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4 lg:col-span-3">
            <p className="font-label text-xs font-semibold tracking-[0.14em] text-on-surface uppercase">
              {t('footer.publishTitle')}
            </p>
            <p className="max-w-[28ch] text-sm leading-relaxed text-on-surface-variant">
              {t('footer.publishBody')}
            </p>
            <a
              href={clientEnv.VITE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-11 min-h-11 w-fit cursor-pointer items-center justify-center px-5 text-sm font-medium',
                LANDING_CTA_PRIMARY,
                LANDING_FOCUS_RING
              )}
            >
              {t('footer.publishCta')}
            </a>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <p className="font-label text-xs font-semibold tracking-[0.14em] text-on-surface uppercase">
              {t('footer.social.title')}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant transition-colors duration-(--duration-fast) ease-emphasized hover:border-outline-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    aria-label={t(item.labelKey)}
                  >
                    {SOCIAL_ICONS[item.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-outline-variant/30 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
            {t('footer.madeFor')}
          </p>
          <p className="text-sm text-on-surface-variant sm:text-right">
            {t('footer.rights', { year })}
          </p>
        </div>
      </Container>
    </footer>
  )
}
