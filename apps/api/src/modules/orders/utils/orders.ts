export function isTicketOnSale(ticket: {
  saleStartsAt: Date | null
  saleEndsAt: Date | null
}): boolean {
  const now = new Date()
  return (
    (!ticket.saleStartsAt || ticket.saleStartsAt <= now) &&
    (!ticket.saleEndsAt || ticket.saleEndsAt >= now)
  )
}
