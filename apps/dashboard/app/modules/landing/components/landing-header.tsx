import { useState, type MouseEvent } from 'react'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { handleSectionNavClick } from '@repo/common'
import {
  Button,
  LanguageToggle,
  LandingLogo,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  ThemeToggle,
  cn,
  linkVariants,
} from '@repo/ui'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import {
  LANDING_CTA_PRIMARY,
  LANDING_FOCUS_RING,
  LANDING_ICON,
  LANDING_MAX,
} from '../constants/layout'

const LANDING_NAV = [
  { hash: '#features', labelKey: 'header.features' },
  { hash: '#how', labelKey: 'header.how' },
  { hash: '#audiences', labelKey: 'header.audiences' },
  { hash: '#faq', labelKey: 'header.faq' },
] as const

function BrandMark() {
  const { t } = useTranslation('dashboardLanding')

  return <LandingLogo alt={t('header.brand')} size="header" />
}

export function LandingHeader() {
  const { t } = useTranslation('dashboardLanding')
  const [menuOpen, setMenuOpen] = useState(false)

  const navLink = cn(
    'inline-flex min-h-11 items-center rounded-full px-2.5 font-label text-sm text-on-surface-variant transition-colors duration-(--duration-instant) ease-emphasized hover:text-on-surface',
    LANDING_FOCUS_RING
  )
  const authLink = cn(
    'hidden min-h-11 items-center text-on-surface-variant transition-colors duration-(--duration-instant) ease-emphasized hover:text-on-surface sm:inline-flex',
    LANDING_FOCUS_RING
  )
  const iconButton = 'size-11 shrink-0 text-on-surface [&_svg]:size-7'

  const onMobileNavClick = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    handleSectionNavClick(event, hash)
    setMenuOpen(false)
  }

  return (
    // No VT name: it isolates stacking and breaks backdrop-blur on the glass bar.
    <header className="pointer-events-none fixed inset-x-0 top-5 z-40">
      <div className={LANDING_MAX}>
        <div
          className={cn(
            'pointer-events-auto flex h-15 w-full items-center justify-between gap-2 rounded-app-lg px-4 glass-panel sm:gap-3 sm:px-4',
            'bg-surface-container/70 backdrop-blur-xl supports-backdrop-filter:bg-surface-container/70'
          )}
        >
          <Link
            to="/"
            className={cn(
              'flex shrink-0 items-center rounded-full px-0 transition-opacity duration-(--duration-instant) ease-emphasized hover:opacity-80',
              LANDING_FOCUS_RING
            )}
          >
            <BrandMark />
          </Link>

          <nav aria-label={t('header.navAria')} className="hidden items-center gap-0.5 lg:flex">
            {LANDING_NAV.map((item) => (
              <a
                key={item.hash}
                href={item.hash}
                onClick={(event) => handleSectionNavClick(event, item.hash)}
                className={navLink}
              >
                {t(item.labelKey)}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageToggle className={iconButton} languageLabel={t('header.language')} />
            <ThemeToggle className={iconButton} />
            <Link to={DASHBOARD_ROUTES.login()} className={cn(authLink, 'px-2 font-label text-sm')}>
              {t('header.login')}
            </Link>
            <Button
              asChild
              className={cn('hidden h-11 min-h-11 px-4 sm:inline-flex', LANDING_CTA_PRIMARY)}
            >
              <Link to={DASHBOARD_ROUTES.register()}>{t('header.register')}</Link>
            </Button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(iconButton, 'lg:hidden')}
                  aria-label={t('header.openMenu')}
                  aria-expanded={menuOpen}
                >
                  <Menu className={LANDING_ICON} aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                closeLabel={t('header.closeMenu')}
                overlayClassName="bg-surface-strong/50 backdrop-blur-sm"
                className="inset-y-3 right-3 flex h-auto max-h-[calc(100dvh-1.5rem)] w-[min(calc(100%-1.5rem),20rem)] flex-col gap-0 overflow-hidden rounded-app-xl border border-hairline/50 bg-background p-0 text-on-surface shadow-(--shadow-glass)"
              >
                <SheetHeader className="shrink-0 border-b border-hairline/40 px-5 py-5 pr-14 text-left">
                  <SheetTitle>
                    <BrandMark />
                  </SheetTitle>
                </SheetHeader>

                <nav
                  aria-label={t('header.mobileAriaLabel')}
                  className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
                >
                  {LANDING_NAV.map((item) => (
                    <a
                      key={item.hash}
                      href={item.hash}
                      onClick={(event) => onMobileNavClick(event, item.hash)}
                      className={cn(linkVariants({ variant: 'ghost' }), LANDING_FOCUS_RING)}
                    >
                      {t(item.labelKey)}
                    </a>
                  ))}
                </nav>

                <div className="mt-auto flex shrink-0 gap-2 border-t border-hairline/40 px-5 py-5">
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="min-h-11 flex-1 rounded-full"
                    >
                      <Link to={DASHBOARD_ROUTES.login()}>{t('header.login')}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      asChild
                      size="lg"
                      className={cn('flex-1', LANDING_CTA_PRIMARY, 'rounded-full')}
                    >
                      <Link to={DASHBOARD_ROUTES.register()}>{t('header.register')}</Link>
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
