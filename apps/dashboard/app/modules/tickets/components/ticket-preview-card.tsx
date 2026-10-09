import { formatCurrency } from '@repo/common'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import type { TicketRecordItem } from '~/modules/tickets/components/ticket-record'
import { TicketDitherCanvas } from '~/modules/tickets/components/ticket-dither-canvas'
import { TicketPreviewFace } from '~/modules/tickets/components/ticket-preview-face'

export type TicketPreviewCardProps = {
  record: TicketRecordItem
}

const TICKET_PREVIEW_QR_VALUE = 'lumina:preview:sample-not-valid-for-admission'

export function TicketPreviewCard({ record }: TicketPreviewCardProps) {
  const { t, i18n } = useTranslation('tickets')
  const tiltRef = useRef<HTMLDivElement>(null)
  const descriptionId = useId()
  const [isFlipped, setIsFlipped] = useState(false)
  const description = record.description?.trim() ?? ''
  const hasDescription = Boolean(description)
  const price = formatCurrency(record.price, {
    locale: i18n.language.startsWith('es') ? 'es-AR' : 'en-US',
    options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  })

  const resetTilt = () => {
    const element = tiltRef.current
    if (!element) return
    element.style.transition = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'none'
      : 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)'
    element.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const element = tiltRef.current
    if (!element || !window.matchMedia('(pointer: fine)').matches) return
    const bounds = element.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    element.style.transition = 'none'
    element.style.transform = `perspective(1200px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) scale(1.01)`
  }

  const handleTicketToggle = () => {
    if (hasDescription) {
      setIsFlipped((isVisible) => !isVisible)
    }
  }

  const handleTicketKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!hasDescription || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    handleTicketToggle()
  }

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => {
      if (preference.matches) {
        resetTilt()
      }
    }
    preference.addEventListener('change', handleChange)
    return () => preference.removeEventListener('change', handleChange)
  }, [])

  return (
    <div
      ref={tiltRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className="w-full p-3 transform-gpu motion-reduce:transform-none"
    >
      <div className="relative w-full [perspective:1200px]">
        <article
          aria-describedby={isFlipped ? descriptionId : undefined}
          aria-label={
            hasDescription
              ? t(isFlipped ? 'preview.hideTicketDescription' : 'preview.ticketDescriptionToggle')
              : undefined
          }
          aria-pressed={hasDescription ? isFlipped : undefined}
          className="relative grid min-h-60 w-full rounded-app text-ticket-preview-ink transition-transform duration-700 ease-out motion-reduce:duration-0 sm:aspect-[2/1] sm:min-h-0"
          onClick={handleTicketToggle}
          onKeyDown={handleTicketKeyDown}
          role={hasDescription ? 'button' : undefined}
          tabIndex={hasDescription ? 0 : undefined}
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            aria-hidden={isFlipped}
            className="col-start-1 row-start-1 min-h-60 w-full sm:aspect-[2/1] sm:min-h-0 [backface-visibility:hidden]"
          >
            <TicketPreviewFace
              background={<TicketDitherCanvas />}
              stub={
                <div className="flex size-full flex-col items-center justify-between gap-3 px-2 py-5 text-center sm:py-8">
                  <p className="ticket-preview-copy text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
                    {t('preview.ticketType')}
                  </p>
                  <div
                    role="img"
                    aria-label={t('preview.qrNotValid')}
                    className="w-full max-w-20 bg-white p-2 sm:max-w-24"
                  >
                    <QRCode value={TICKET_PREVIEW_QR_VALUE} size={96} className="h-auto w-full" />
                  </div>
                  <p className="ticket-preview-copy max-w-full break-words text-[10px] font-semibold leading-snug sm:text-xs">
                    {t('preview.qrNotValid')}
                  </p>
                </div>
              }
            >
              <div className="ticket-preview-copy relative z-10 flex min-w-0 flex-1 flex-col justify-between gap-7 px-5 py-6 sm:px-8 sm:py-8">
                <div className="min-w-0 text-xs font-semibold uppercase tracking-wide">
                  <p>{t('preview.event')}</p>
                  <p className="mt-1 wrap-break-word text-ticket-preview-ink">
                    {record.ticketType}
                  </p>
                </div>
                <h3 className="min-w-0 wrap-break-word font-heading text-xl font-bold uppercase leading-[1.05] -tracking-label-md text-balance sm:text-3xl">
                  {record.eventName}
                </h3>
                <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wide">
                  <p className="min-w-0 break-words">
                    <span className="sr-only">{t('preview.location')}: </span>
                    {record.clubName}
                  </p>
                  <p className="shrink-0 tabular-nums">
                    <span className="sr-only">{t('preview.price')}: </span>
                    {price}
                  </p>
                </div>
              </div>
            </TicketPreviewFace>
          </div>

          <div
            aria-hidden={!isFlipped}
            className="col-start-1 row-start-1 min-h-60 [transform:rotateY(180deg)] [backface-visibility:hidden] sm:aspect-[2/1] sm:min-h-0"
          >
            <TicketPreviewFace background={<TicketDitherCanvas />} stub={null}>
              <div className="ticket-preview-copy relative z-10 flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
                <h3 className="font-heading text-base font-semibold sm:text-lg">
                  {t('preview.ticketDescription')}
                </h3>
                <p className="mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed sm:text-base">
                  {description}
                </p>
              </div>
            </TicketPreviewFace>
          </div>
        </article>
        <p id={descriptionId} className="sr-only">
          {isFlipped ? description : null}
        </p>
      </div>
    </div>
  )
}
