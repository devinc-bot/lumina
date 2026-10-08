export const TICKET_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS]

export const TICKET_CAPACITY_RESULT = {
  SAVED: 'saved',
  CAPACITY_EXCEEDED: 'capacity-exceeded',
} as const

export type TicketCapacityResult =
  (typeof TICKET_CAPACITY_RESULT)[keyof typeof TICKET_CAPACITY_RESULT]

export const TICKET_TYPE = {
  GENERAL: 'general',
  VIP: 'vip',
} as const

export type TicketType = (typeof TICKET_TYPE)[keyof typeof TICKET_TYPE]

/** Inventory list filter: tickets with at least one completed sale vs none. */
export const TICKET_SALES_FILTER = {
  SOLD: 'sold',
  UNSOLD: 'unsold',
} as const

export type TicketSalesFilter = (typeof TICKET_SALES_FILTER)[keyof typeof TICKET_SALES_FILTER]

export const TICKET_CHECK_IN_OUTCOME = {
  SUCCESS: 'success',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  USED: 'used',
} as const

export type TicketCheckInOutcome =
  (typeof TICKET_CHECK_IN_OUTCOME)[keyof typeof TICKET_CHECK_IN_OUTCOME]
