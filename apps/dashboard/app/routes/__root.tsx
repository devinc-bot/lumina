import { useEffect } from 'react'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  APP_FAVICON_SRC,
  ErrorBoundaryView,
  NotFoundView,
  THEME_BOOT_SCRIPT,
  ThemeProvider,
  Toaster,
} from '@repo/ui'
import { I18nProvider } from '@repo/i18n/client'
import { installZodI18n } from '@repo/i18n'
import commonEs from '@repo/i18n/locales/common/es.json' with { type: 'json' }
import globalsCssUrl from '@repo/ui/globals.css?url'
import viewTransitionsCssUrl from '@repo/ui/view-transitions.css?url'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: `${commonEs.appNameDisplay} · Panel` },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: APP_FAVICON_SRC },
      { rel: 'apple-touch-icon', href: APP_FAVICON_SRC },
      { rel: 'stylesheet', href: globalsCssUrl },
      { rel: 'stylesheet', href: viewTransitionsCssUrl },
    ],
    scripts: [{ children: THEME_BOOT_SCRIPT }],
  }),
  errorComponent: RootErrorBoundary,
  notFoundComponent: RootNotFound,
  component: RootComponent,
})

function DocumentLang() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'es'
  }, [i18n.language])
  return null
}

function RootErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation('dashboard')

  return (
    <html lang="es" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundaryView
          error={error}
          reset={reset}
          brandLabel={commonEs.appNameUpper}
          homeTo={DASHBOARD_ROUTES.home()}
          showErrorDetails={import.meta.env.DEV}
          strings={{
            title: t('error.title'),
            description: t('error.description'),
            retry: t('error.retry'),
            goHome: t('error.goHome'),
            details: t('error.details'),
          }}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootNotFound() {
  const { t } = useTranslation('dashboard')
  return (
    <html lang="es" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <NotFoundView
          brandLabel={commonEs.appNameUpper}
          title={t('notFound.title')}
          description={t('notFound.description')}
          actionLabel={t('notFound.goHome')}
          actionTo={DASHBOARD_ROUTES.home()}
        />
        <Scripts />
      </body>
    </html>
  )
}

function ZodI18nBridge() {
  const { t, ready } = useTranslation('validation', { useSuspense: false })
  useEffect(() => {
    if (ready) installZodI18n(t)
  }, [t, ready])
  return null
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ZodI18nBridge />
          <DocumentLang />
          <html
            lang="es"
            data-theme="dark"
            style={{ colorScheme: 'dark' }}
            suppressHydrationWarning
          >
            <head>
              <HeadContent />
            </head>
            <body>
              <Outlet />
              <Toaster position="top-right" />
              <Scripts />
            </body>
          </html>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
