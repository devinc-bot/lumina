import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { LucideIcon } from 'lucide-react'
import {
  AppLogo,
  AppSidebar,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  matchesSidebarNavHref,
  Separator,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  VT,
  vtStyle,
} from '@repo/ui'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CalendarDays, LayoutGrid, MapPin, QrCode, ShoppingBag, Ticket, Users } from 'lucide-react'
import { USER_ROLE, type UserRole } from '@repo/types'
import { clearAuthSession } from '~/modules/auth/utils/auth-storage.utils'
import { logoutAuthSession } from '~/modules/common/services/session.service'
import { AppShellLanguageSwitcher } from '~/modules/common/components/app-shell-language-switcher'
import { AppShellSidebarFooter } from '~/modules/common/components/app-shell-sidebar-footer'
import { AppShellSignOutDialog } from '~/modules/common/components/app-shell-sign-out-dialog'
import { useSession } from '~/modules/common/hooks/use-session'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import { isRouteAllowedForRole } from '../constants/role-routes'
import { getUserDisplayName, getUserInitials } from '~/modules/common/utils/app-shell-user.utils'

type AppShellNavItem = {
  title: string
  url: string
  icon: LucideIcon
}

function buildPrimaryNav(t: TFunction<'dashboard'>, role?: UserRole): AppShellNavItem[] {
  const items: AppShellNavItem[] = [
    {
      title: t('nav.panel'),
      url: DASHBOARD_ROUTES.home(),
      icon: LayoutGrid,
    },
    {
      title: t('nav.locations'),
      url: DASHBOARD_ROUTES.locations(),
      icon: MapPin,
    },
    {
      title: t('nav.tickets'),
      url: DASHBOARD_ROUTES.tickets(),
      icon: Ticket,
    },
    {
      title: t('nav.events'),
      url: DASHBOARD_ROUTES.events(),
      icon: CalendarDays,
    },
    {
      title: t('nav.sales'),
      url: DASHBOARD_ROUTES.sales(),
      icon: ShoppingBag,
    },
    {
      title: t('nav.qrTicket'),
      url: DASHBOARD_ROUTES.qrTicket(),
      icon: QrCode,
    },
    {
      title: t('nav.users'),
      url: DASHBOARD_ROUTES.staff(),
      icon: Users,
    },
  ]

  if (role === USER_ROLE.STAFF || role === USER_ROLE.OWNER) {
    return items.filter((item) => isRouteAllowedForRole(role, item.url))
  }

  return []
}

function resolveMobileHeaderTitle(
  pathname: string,
  items: AppShellNavItem[],
  fallback: string
): string {
  const match = items
    .filter((item) => matchesSidebarNavHref(item.url, pathname))
    .sort((left, right) => right.url.length - left.url.length)[0]

  return match?.title ?? fallback
}

function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('dashboard')
  const { t: tAuth } = useTranslation('auth')
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const signOutInFlight = useRef(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { setOpenMobile } = useSidebar()
  const { user, isLoading, error, refresh, clearSession } = useSession()
  const settingsHref = DASHBOARD_ROUTES.settings()
  const isSettingsActive = matchesSidebarNavHref(settingsHref, pathname)

  const primaryNav = useMemo(() => buildPrimaryNav(t, user?.role), [t, user?.role])

  const navMain = useMemo(
    () =>
      primaryNav.map((item) => ({
        ...item,
        isActive: matchesSidebarNavHref(item.url, pathname),
      })),
    [pathname, primaryNav]
  )

  const handleSignOut = useCallback(async () => {
    if (signOutInFlight.current) return

    signOutInFlight.current = true
    setIsSigningOut(true)

    try {
      await logoutAuthSession()
    } catch {
      // Local authentication must be cleared even when the API cannot be reached.
    } finally {
      clearAuthSession()
      clearSession()
      setSignOutOpen(false)
      await navigate({ to: DASHBOARD_ROUTES.login() })
      signOutInFlight.current = false
      setIsSigningOut(false)
    }
  }, [clearSession, navigate])

  const closeMobileSidebar = useCallback(() => {
    setOpenMobile(false)
  }, [setOpenMobile])

  const openSignOutDialog = useCallback(() => {
    closeMobileSidebar()
    setSignOutOpen(true)
  }, [closeMobileSidebar])

  const goToSettings = useCallback(() => {
    closeMobileSidebar()
    void navigate({ to: settingsHref })
  }, [closeMobileSidebar, navigate, settingsHref])

  const mobileHeaderTitle = useMemo(() => {
    if (pathname === DASHBOARD_ROUTES.legalAcceptance()) {
      return tAuth('legalAcceptance.title')
    }
    return resolveMobileHeaderTitle(pathname, primaryNav, t('nav.panel'))
  }, [pathname, primaryNav, t, tAuth])

  const navUser = user
    ? {
        name: getUserDisplayName(user, t('user.fallbackName')),
        email: user.email,
        avatar: user.avatar,
        initials: getUserInitials(user.name, user.lastName),
      }
    : null

  return (
    <>
      <AppSidebar
        brand={{
          name: t('brand.logo'),
          subtitle: t('brand.subtitle'),
          href: DASHBOARD_ROUTES.home(),
          icon: <AppLogo size="sm" />,
        }}
        navMain={navMain}
        footerExtra={
          <>
            <AppShellLanguageSwitcher />
            {!navUser ? (
              <AppShellSidebarFooter
                user={user}
                isLoading={isLoading}
                error={error}
                settingsHref={settingsHref}
                isSettingsActive={isSettingsActive}
                onNavigate={closeMobileSidebar}
                onRetry={() => void refresh()}
                isRetrying={isLoading}
              />
            ) : null}
          </>
        }
        onNavigate={closeMobileSidebar}
        user={navUser}
        userMenu={
          navUser
            ? {
                accountLabel: t('nav.settings'),
                signOutLabel: t('nav.signOut'),
                onAccount: goToSettings,
                onSignOut: openSignOutDialog,
              }
            : undefined
        }
      />

      <SidebarInset className="min-h-0">
        <header className="flex h-16 shrink-0 items-center gap-2" style={vtStyle(VT.siteHeader)}>
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-[16px]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{mobileHeaderTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto" style={vtStyle(VT.mainContent)}>
          {children}
        </div>
      </SidebarInset>

      <AppShellSignOutDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={handleSignOut}
        isSigningOut={isSigningOut}
      />
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  )
}
