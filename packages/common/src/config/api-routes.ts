import { API_PREFIX } from '../constants/api.ts'

export const API_AUTH_PREFIX = '/auth' as const
export const API_SETTINGS_PREFIX = '/settings' as const
export const API_SESSION_PREFIX = '/session' as const
export const API_LOCATIONS_PREFIX = '/locations' as const
export const API_STAFF_PREFIX = '/staff' as const
export const API_INVITATIONS_PREFIX = '/invitations' as const
export const API_TICKETS_PREFIX = '/tickets' as const
export const API_TICKET_TYPES_PREFIX = '/ticket-types' as const
export const API_EVENTS_PREFIX = '/events' as const
export const API_ORDERS_PREFIX = '/orders' as const
export const API_MERCADO_PAGO_PREFIX = '/mercado-pago' as const
export const API_GEO_PREFIX = '/geo' as const
export const API_HEALTH_PREFIX = '/health' as const
export const API_DASHBOARD_PREFIX = '/dashboard' as const
export const API_ERRORS_PREFIX = '/errors' as const
export const API_USERS_PREFIX = '/users' as const
export const API_ORGANIZATIONS_PREFIX = '/organizations' as const
export const API_LEGAL_DOCUMENTS_PREFIX = '/legal-documents' as const
export const API_INTERNAL_JOBS_PREFIX = '/internal/jobs' as const
const routeSegment = (value: string) => (value.startsWith(':') ? value : encodeURIComponent(value))

export const API_ROUTES = {
  auth: {
    prefix: API_AUTH_PREFIX,
    path: {
      login: () => '/login' as const,
      registerUser: () => '/register/user' as const,
      registerUserRequest: () => '/register/user/request' as const,
      registerUserConfirm: () => '/register/user/confirm' as const,
      registerOwner: () => '/register/owner' as const,
      registerOwnerRequest: () => '/register/owner/request' as const,
      registerOwnerConfirm: () => '/register/owner/confirm' as const,
      refreshToken: () => '/refresh' as const,
      logout: () => '/logout' as const,
      forgotPassword: () => '/forgot-password' as const,
      resetPassword: () => '/reset-password' as const,
      google: () => '/google' as const,
      googleCallback: () => '/google/callback' as const,
    },
  },
  session: {
    prefix: API_SESSION_PREFIX,
    path: {
      me: () => '/me' as const,
      list: () => '/' as const,
      revoke: (documentId: string) => `/${routeSegment(documentId)}` as const,
    },
  },
  settings: {
    prefix: API_SETTINGS_PREFIX,
    path: {
      root: () => '/' as const,
      avatar: () => '/avatar' as const,
    },
  },
  locations: {
    prefix: API_LOCATIONS_PREFIX,
    path: {
      list: () => '/my-locations' as const,
      create: () => '/create' as const,
      update: (documentId: string) => `/${documentId}` as const,
      delete: (documentId: string) => `/${documentId}` as const,
    },
  },
  geo: {
    prefix: API_GEO_PREFIX,
    path: {
      ipLocate: () => '/ip-locate' as const,
    },
  },
  staff: {
    prefix: API_STAFF_PREFIX,
    path: {
      listMyPersonnel: () => '/my-personnel' as const,
      delete: (documentId: string) => `/${documentId}` as const,
      updateStatus: (documentId: string) => `/${documentId}/status` as const,
    },
  },
  invitations: {
    prefix: API_INVITATIONS_PREFIX,
    path: {
      staff: () => '/staff' as const,
      staffByLink: (slug: string, token: string) =>
        `/staff/${routeSegment(slug)}/${routeSegment(token)}` as const,
      acceptStaff: (slug: string, token: string) =>
        `/staff/${routeSegment(slug)}/${routeSegment(token)}/accept` as const,
      deleteStaff: (documentId: string) => `/staff/${documentId}` as const,
    },
  },
  tickets: {
    prefix: API_TICKETS_PREFIX,
    path: {
      list: () => '/my-tickets' as const,
      purchased: () => '/purchased' as const,
      purchasedQr: (ticketSoldDocumentId: string) =>
        `/purchased/${ticketSoldDocumentId}/qr` as const,
      checkIns: () => '/check-ins' as const,
      checkInHistory: () => '/check-ins/history' as const,
      get: (documentId: string) => `/${documentId}` as const,
      create: () => '/create' as const,
      update: (documentId: string) => `/${documentId}` as const,
      delete: (documentId: string) => `/${documentId}` as const,
    },
  },
  ticketTypes: {
    prefix: API_TICKET_TYPES_PREFIX,
    path: {
      list: () => '/' as const,
      create: () => '/' as const,
    },
  },
  events: {
    prefix: API_EVENTS_PREFIX,
    path: {
      /** Anonymous published-events catalog (GET). */
      listPublic: () => '/' as const,
      /** Anonymous published-event detail (GET). */
      getPublic: (slug: string) => `/slug/${routeSegment(slug)}` as const,
      list: () => '/my-events' as const,
      get: (documentId: string) => `/${documentId}` as const,
      create: () => '/' as const,
      update: (documentId: string) => `/${documentId}` as const,
      delete: (documentId: string) => `/${documentId}` as const,
    },
  },
  dashboard: {
    prefix: API_DASHBOARD_PREFIX,
    path: {
      kpiDashboard: () => '/kpidashboard' as const,
      sales: () => '/sales' as const,
      salesAnalytics: () => '/sales/analytics' as const,
    },
  },
  orders: {
    prefix: API_ORDERS_PREFIX,
    path: {
      /** Authenticated buyer — list their orders (GET). */
      list: () => '/' as const,
      /** Authenticated USER — create pending order (POST). */
      create: () => '/' as const,
      /** Authenticated buyer — get order by documentId (GET). */
      get: (documentId: string) => `/${routeSegment(documentId)}` as const,
      /** Authenticated buyer — delete their pending order (DELETE). */
      delete: (documentId: string) => `/${routeSegment(documentId)}` as const,
    },
  },
  mercadoPago: {
    prefix: API_MERCADO_PAGO_PREFIX,
    path: {
      /** Public — Mercado Pago webhook notifications (POST). */
      webhook: () => '/webhook' as const,
    },
  },
  health: {
    prefix: API_HEALTH_PREFIX,
    path: {
      root: () => '/' as const,
      ready: () => '/ready' as const,
    },
  },
  errors: {
    prefix: API_ERRORS_PREFIX,
    path: {
      list: () => '/' as const,
      delete: (documentId: string) => `/${documentId}` as const,
    },
  },
  users: {
    prefix: API_USERS_PREFIX,
    path: {
      list: () => '/' as const,
      get: (documentId: string) => `/${documentId}` as const,
      updateStatus: (documentId: string) => `/${documentId}/status` as const,
    },
  },
  organizations: {
    prefix: API_ORGANIZATIONS_PREFIX,
    path: {
      getPublic: (slug: string) => `/public/${routeSegment(slug)}` as const,
    },
  },
  legalDocuments: {
    prefix: API_LEGAL_DOCUMENTS_PREFIX,
    path: {
      list: () => '/' as const,
      getPendingAcceptance: () => '/me/pending' as const,
      accept: () => '/me/accept' as const,
      getByType: (type: string) => `/${routeSegment(type)}` as const,
      getPublishedByType: (type: string) => `/public/${routeSegment(type)}` as const,
      saveDraft: (type: string) => `/${routeSegment(type)}/draft` as const,
      publish: (type: string) => `/${routeSegment(type)}/publish` as const,
    },
  },
  internalJobs: {
    prefix: API_INTERNAL_JOBS_PREFIX,
    path: {
      run: () => '/run' as const,
    },
  },
} as const

export function buildApiPath(route: (typeof API_ROUTES)[keyof typeof API_ROUTES], path: string) {
  return `/${API_PREFIX}${route.prefix}${path}`
}
