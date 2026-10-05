import { CLIENT_ROUTES } from '@repo/common'

const {
  resetPassword,
  registerConfirm,
  authCallback,
  login,
  checkoutSuccess,
  checkoutError,
  checkoutPending,
} = CLIENT_ROUTES

export const WEB_ROUTES = {
  home: () => '/' as const,
  events: () => '/events' as const,
  event: (slug: string) => `/events/${slug}` as const,
  organization: (documentId: string) => `/organizations/${documentId}` as const,
  checkoutSuccess,
  checkoutError,
  checkoutPending,
  settings: () => '/settings' as const,
  tickets: () => '/tickets' as const,
  orders: () => '/orders' as const,
  legalAcceptance: () => '/legal-acceptance' as const,
  properties: () => '/properties' as const,
  property: (id: string) => `/properties/${id}` as const,
  login,
  register: () => '/register' as const,
  registerConfirm,
  forgotPassword: () => '/forgot-password' as const,
  resetPassword,
  authCallback,
} as const

export const AUTH_ROUTE_PATHS = new Set<string>([
  WEB_ROUTES.login(),
  WEB_ROUTES.register(),
  WEB_ROUTES.registerConfirm(),
  WEB_ROUTES.forgotPassword(),
  CLIENT_ROUTES.resetPassword(),
  CLIENT_ROUTES.authCallback(),
])
