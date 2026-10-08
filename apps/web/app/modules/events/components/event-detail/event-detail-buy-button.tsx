import { Ticket } from 'lucide-react'
import { Button, cn } from '@repo/ui'

type EventDetailBuyButtonProps = {
  label: string
  disabled?: boolean
  loading?: boolean
  title?: string
  className?: string
  onClick?: () => void
}

export function EventDetailBuyButton({
  label,
  disabled = false,
  loading = false,
  title,
  className,
  onClick,
}: EventDetailBuyButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={disabled ? 'outline' : 'default'}
      disabled={disabled}
      loading={loading}
      title={title}
      aria-label={title ?? label}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      iconLeft={<Ticket aria-hidden strokeWidth={1.75} />}
      className={cn(
        'min-h-11 w-full text-on-primary-container',
        disabled && 'border-hairline/60 bg-surface-muted text-on-surface-variant',
        className
      )}
    >
      {label}
    </Button>
  )
}
