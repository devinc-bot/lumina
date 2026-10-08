import type { ReactNode } from 'react'
import { cn } from '@repo/ui'

export const RECEIPT_TICKET_CLASS =
  'bg-surface-card text-on-surface shadow-[0_12px_32px_-16px_rgb(0_0_0_/_0.35)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),97%_100%,94%_calc(100%-8px),91%_100%,88%_calc(100%-8px),85%_100%,82%_calc(100%-8px),79%_100%,76%_calc(100%-8px),73%_100%,70%_calc(100%-8px),67%_100%,64%_calc(100%-8px),61%_100%,58%_calc(100%-8px),55%_100%,52%_calc(100%-8px),49%_100%,46%_calc(100%-8px),43%_100%,40%_calc(100%-8px),37%_100%,34%_calc(100%-8px),31%_100%,28%_calc(100%-8px),25%_100%,22%_calc(100%-8px),19%_100%,16%_calc(100%-8px),13%_100%,10%_calc(100%-8px),7%_100%,4%_calc(100%-8px),1%_100%,0_calc(100%-8px))]'

type HolographicOrderTicketProps = {
  children: ReactNode
  className?: string
}

export function HolographicOrderTicket({ children, className }: HolographicOrderTicketProps) {
  return (
    <article className={cn('relative isolate', RECEIPT_TICKET_CLASS, className)}>
      {children}
    </article>
  )
}
