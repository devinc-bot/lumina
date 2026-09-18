import { useState, type MouseEvent } from 'react'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { handleSectionNavClick, sectionIdFromHash } from '@repo/common'
import {
  Button,
  LanguageToggle,
  LandingLogo,
  Link,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  cn,
  ThemeToggle,
  linkVariants,
} from '@repo/ui'
import { UserMenu } from '~/modules/common/components/user-menu'
import { Container } from '~/modules/common/components/container'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { useSession } from '~/modules/common/hooks/use-session'
import { LANDING_CTA_PRIMARY, LANDING_FOCUS_RING } from '~/modules/landing/constants/layout'

/** Attendee path first. Organizer path lives in #organizadores + footer. */
const LANDING_SECTION_NAV = [
  { href: '#eventos', labelKey: 'nav.events' },
  { href: '#como-funciona', labelKey: 'nav.how' },
  { href: '#claridad', labelKey: 'nav.clarity' },
  { href: '#organizadores', labelKey: 'nav.organizers' },
] as const

function BrandMark() {
  const { t } = useTranslation('landing')

  return <LandingLogo alt={t('nav.brand')} size="header" />
}

export function LandingHeader() {
  const { t } = useTranslation('landing')
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user, isAuthenticated, isLoading } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const showAuthChrome = !isLoading && isAuthenticated
  const showAuthCtas = !isLoading && !isAuthenticated
  const isLanding = pathname === WEB_ROUTES.home()

  const navLink = cn(
    'inline-flex min-h-11 items-center rounded-full px-2.5 font-label text-sm text-on-surface-variant transition-colors duration-(--duration-instant) ease-emphasized hover:text-on-surface aria-[current=page]:text-on-surface',
    LANDING_FOCUS_RING
  )
  const authLink = cn(
    'hidden min-h-11 items-center text-on-surface-variant transition-colors duration-(--duration-instant) ease-emphasized hover:text-on-surface sm:inline-flex',
    LANDING_FOCUS_RING
  )
  const iconButton = 'size-11 shrink-0 text-on-surface [&_svg]:size-7'

  const displayName = user ? `${user.name} ${user.lastName}`.trim() || user.email : ''

  const onSectionClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isLanding) {
      handleSectionNavClick(event, href)
      return
    }
    event.preventDefault()
    void navigate({ to: WEB_ROUTES.home(), hash: sectionIdFromHash(href) })
  }

  const onMobileSectionClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    onSectionClick(event, href)
    setMenuOpen(false)
  }

  return (
    // No VT name: it isolates stacking and breaks backdrop-blur on the glass bar.
    <header className="pointer-events-none fixed inset-x-0 top-5 z-40">
      <Container>
        <div
          className={cn(
            'pointer-events-auto flex h-24 w-full items-center justify-between gap-2 rounded-app-lg px-2 glass-panel sm:gap-3 sm:px-4',
            'bg-surface-container/70 backdrop-blur-xl supports-backdrop-filter:bg-surface-container/70'
          )}
        >
          <Link
            to={WEB_ROUTES.home()}
            className={cn(
              'flex h-20 shrink-0 items-center rounded-full px-0 transition-opacity duration-(--duration-instant) ease-emphasized hover:opacity-80 sm:px-2',
              LANDING_FOCUS_RING
            )}
          >
            <BrandMark />
          </Link>

          <nav aria-label={t('nav.ariaLabel')} className="hidden items-center gap-0.5 lg:flex">
            {showAuthChrome ? (
              <>
                <Link to={WEB_ROUTES.events()} className={navLink}>
                  {t('nav.events')}
                </Link>
                <Link to={WEB_ROUTES.tickets()} className={navLink}>
                  {t('nav.tickets')}
                </Link>
                <Link to={WEB_ROUTES.orders()} className={navLink}>
                  {t('nav.orders')}
                </Link>
              </>
            ) : (
              LANDING_SECTION_NAV.map((item) => (
                <a
                  key={item.href}
                  href={isLanding ? item.href : `${WEB_ROUTES.home()}${item.href}`}
                  onClick={(event) => onSectionClick(event, item.href)}
                  className={navLink}
                >
                  {t(item.labelKey)}
                </a>
              ))
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <LanguageToggle className={iconButton} languageLabel={t('nav.language')} />
            <ThemeToggle className={iconButton} />
            {isLoading ? (
              <Skeleton className="size-9 rounded-full bg-surface-container-high" aria-hidden />
            ) : showAuthChrome && user ? (
              <UserMenu
                user={user}
                ariaLabel={t('nav.accountAria', { name: displayName })}
                settingsHref={WEB_ROUTES.settings()}
              />
            ) : (
              <>
                <Link to={WEB_ROUTES.login()} size="sm" className={authLink}>
                  {t('nav.login')}
                </Link>
                <Link
                  to={WEB_ROUTES.register()}
                  size="sm"
                  className={cn('hidden h-11 min-h-11 px-4 sm:inline-flex', LANDING_CTA_PRIMARY)}
                >
                  {t('nav.register')}
                </Link>
              </>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(iconButton, 'lg:hidden')}
                  aria-label={t('nav.openMenu')}
                  aria-expanded={menuOpen}
                >
                  <Menu className="size-7" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                closeLabel={t('nav.closeMenu')}
                overlayClassName="bg-surface-strong/50 backdrop-blur-sm"
                className="inset-y-3 right-3 flex h-auto max-h-[calc(100dvh-1.5rem)] w-[min(calc(100%-1.5rem),20rem)] flex-col gap-0 overflow-hidden rounded-app-xl border border-hairline/50 bg-background p-0 text-on-surface shadow-(--shadow-glass)"
              >
                <SheetHeader className="shrink-0 border-b border-hairline/40 px-5 py-5 pr-14 text-left">
                  <SheetTitle>
                    <BrandMark />
                  </SheetTitle>
                </SheetHeader>

                <nav
                  aria-label={t('nav.mobileAriaLabel')}
                  className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
                >
                  {showAuthChrome ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          to={WEB_ROUTES.events()}
                          variant="ghost"
                          className={cn(LANDING_FOCUS_RING)}
                        >
                          {t('nav.events')}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to={WEB_ROUTES.tickets()}
                          variant="ghost"
                          className={cn(LANDING_FOCUS_RING)}
                        >
                          {t('nav.tickets')}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to={WEB_ROUTES.orders()}
                          variant="ghost"
                          className={cn(LANDING_FOCUS_RING)}
                        >
                          {t('nav.orders')}
                        </Link>
                      </SheetClose>
                    </>
                  ) : (
                    LANDING_SECTION_NAV.map((item) => (
                      <a
                        key={item.href}
                        href={isLanding ? item.href : `${WEB_ROUTES.home()}${item.href}`}
                        onClick={(event) => onMobileSectionClick(event, item.href)}
                        className={cn(linkVariants({ variant: 'ghost' }), LANDING_FOCUS_RING)}
                      >
                        {t(item.labelKey)}
                      </a>
                    ))
                  )}
                </nav>

                {showAuthCtas ? (
                  <div className="mt-auto flex shrink-0 gap-2 border-t border-hairline/40 px-5 py-5">
                    <SheetClose asChild>
                      <Link
                        to={WEB_ROUTES.login()}
                        variant="outline"
                        size="lg"
                        className="min-h-11 flex-1 rounded-full hover:text-on-surface"
                      >
                        {t('nav.login')}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to={WEB_ROUTES.register()}
                        size="lg"
                        className={cn('flex-1', LANDING_CTA_PRIMARY, 'rounded-full')}
                      >
                        {t('nav.register')}
                      </Link>
                    </SheetClose>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  )
}
