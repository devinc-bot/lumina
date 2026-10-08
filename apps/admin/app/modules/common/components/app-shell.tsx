import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { FileText, TriangleAlert, Users } from 'lucide-react'
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
import { clearAuthenticatedState } from '~/modules/auth/utils/sign-out.utils'
import { ADMIN_ROUTES } from '~/modules/common/constants/routes'
import { useSession } from '~/modules/common/hooks/use-session'
import { logoutAuthSession } from '~/modules/common/services/session.service'
import { AppShellLanguageSwitcher } from './app-shell-language-switcher'
import { AppShellUser } from './app-shell-user'

type AppShellNavItem = {
  title: string
  url: string
  icon: LucideIcon
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
  const { t } = useTranslation(['admin', 'common'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { setOpenMobile } = useSidebar()
  const { user } = useSession()

  const primaryNav = useMemo<AppShellNavItem[]>(
    () => [
      { title: t('nav.users'), url: ADMIN_ROUTES.users(), icon: Users },
      { title: t('nav.errors'), url: ADMIN_ROUTES.errors(), icon: TriangleAlert },
      {
        title: t('nav.legalDocuments'),
        url: ADMIN_ROUTES.legalDocuments(),
        icon: FileText,
      },
    ],
    [t]
  )

  const navMain = useMemo(
    () =>
      primaryNav.map((item) => ({
        ...item,
        isActive: matchesSidebarNavHref(item.url, pathname),
      })),
    [pathname, primaryNav]
  )

  const mobileHeaderTitle = useMemo(
    () => resolveMobileHeaderTitle(pathname, primaryNav, t('home.label')),
    [pathname, primaryNav, t]
  )

  const closeMobileSidebar = useCallback(() => setOpenMobile(false), [setOpenMobile])

  const handleSignOut = useCallback(async () => {
    try {
      await logoutAuthSession()
    } catch {
      // Local authentication must be cleared even when the API cannot be reached.
    } finally {
      clearAuthenticatedState(queryClient)
      closeMobileSidebar()
      await navigate({ to: ADMIN_ROUTES.login() })
    }
  }, [closeMobileSidebar, navigate, queryClient])

  const goToSettings = useCallback(() => {
    closeMobileSidebar()
    void navigate({ to: ADMIN_ROUTES.settings() })
  }, [closeMobileSidebar, navigate])

  return (
    <>
      <AppSidebar
        brand={{
          name: t('common:appNameAdmin'),
          subtitle: t('brand.subtitle'),
          href: ADMIN_ROUTES.home(),
          icon: <AppLogo size="sm" />,
        }}
        navMain={navMain}
        footerExtra={
          <>
            <AppShellLanguageSwitcher />
            <AppShellUser user={user} onSettings={goToSettings} onSignOut={handleSignOut} />
          </>
        }
        onNavigate={closeMobileSidebar}
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
