import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Label } from './label'

const selectTriggerClassName =
  'cn-gradient-border cn-gradient-border--field flex h-9 w-full items-center justify-between rounded-lg px-4 text-sm text-ink transition-[box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:text-ink-muted-soft disabled:opacity-60 [&>span]:line-clamp-1 motion-reduce:transition-none'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean
  }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      selectTriggerClassName,
      error &&
        'focus-visible:border-error focus-visible:ring-error/40 aria-invalid:focus-visible:ring-error/40',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-7 shrink-0 text-ink-muted-soft" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="size-7" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="size-7" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-32 overflow-hidden rounded-app-sm border border-hairline-strong bg-surface-container-lowest text-ink shadow-glass data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'max-h-(--radix-select-content-available-height)',
          position === 'popper' && 'w-full min-w-(--radix-select-trigger-width)'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold text-ink-muted', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    leadingContent?: React.ReactNode
  }
>(({ className, children, leadingContent, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-app-xs py-1.5 pl-8 pr-2 text-base text-ink outline-none focus:bg-surface-container-high data-disabled:pointer-events-none data-disabled:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-6" />
      </SelectPrimitive.ItemIndicator>
    </span>
    {leadingContent ? (
      <span
        aria-hidden="true"
        className="mr-2 flex shrink-0 size-8 items-center justify-center overflow-hidden rounded-md bg-surface-container-low"
      >
        {leadingContent}
      </span>
    ) : null}
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-hairline', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export interface SelectFieldProps extends React.ComponentPropsWithoutRef<typeof Select> {
  label?: string
  error?: string
  id?: string
  placeholder?: string
  triggerClassName?: string
  containerClassName?: string
  valueContent?: React.ReactNode
  children: React.ReactNode
}

function SelectField({
  label,
  error,
  id,
  placeholder,
  triggerClassName,
  containerClassName,
  valueContent,
  disabled,
  children,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = React.useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const hasError = Boolean(error)

  return (
    <div className={cn('flex w-full flex-col gap-2', containerClassName)}>
      {label ? (
        <Label htmlFor={selectId} variant="field">
          {label}
        </Label>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Select disabled={disabled} {...selectProps}>
          <SelectTrigger
            id={selectId}
            error={hasError}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={errorId}
            className={triggerClassName}
          >
            <SelectValue placeholder={placeholder}>{valueContent}</SelectValue>
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export {
  Select,
  SelectField,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
