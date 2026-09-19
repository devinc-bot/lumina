import { useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { installZodI18n } from '@repo/i18n'
import { I18nProvider } from '@repo/i18n/client'
import { APP_FAVICON_SRC, THEME_BOOT_SCRIPT, ThemeProvider, Toaster } from '@repo/ui'
import globalsCssUrl from '@repo/ui/globals.css?url'
import viewTransitionsCssUrl from '@repo/ui/view-transitions.css?url'
import {
  WebErrorBoundaryView,
  WebNotFoundView,
} from '~/modules/common/components/route-error-views'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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

function ZodI18nBridge() {
  const { t, ready } = useTranslation('validation', { useSuspense: false })
  useEffect(() => {
    if (ready) installZodI18n(t)
  }, [t, ready])
  return null
}

function DocumentLang() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'es'
  }, [i18n.language])
  return null
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const routeError = error instanceof Error ? error : new Error(String(error))

  return (
    <html lang="es" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <WebErrorBoundaryView error={routeError} reset={reset} />
          </ThemeProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootNotFound() {
  return (
    <html lang="es" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <WebNotFoundView />
          </ThemeProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
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
