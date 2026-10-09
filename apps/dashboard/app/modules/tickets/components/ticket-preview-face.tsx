import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type TicketPreviewFaceProps = {
  background?: ReactNode
  children: ReactNode
  stub?: ReactNode
}

function TicketFaceFrame() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 z-10 mix-blend-difference rounded-app border-[1.9px] border-ticket-preview-muted/90"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 z-10 mix-blend-difference rounded-app-sm border-[0.1px] border-ticket-preview-muted/50"
      />
    </>
  )
}

function TicketPreviewSeam() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-20 -translate-x-1/2 border-l-2 border-dashed border-ticket-preview-muted"
      />
    </>
  )
}

export function TicketPreviewFace({ background, children, stub }: TicketPreviewFaceProps) {
  const maskId = useId().replaceAll(':', '')
  const faceRef = useRef<HTMLDivElement>(null)
  const stubRef = useRef<HTMLDivElement>(null)
  const [seamX, setSeamX] = useState('70%')

  useEffect(() => {
    const face = faceRef.current
    const stubElement = stubRef.current
    if (!face || !stubElement || typeof ResizeObserver === 'undefined') return

    const updateSeamX = () => {
      const nextSeamX = `${stubElement.offsetLeft}px`

      setSeamX((currentSeamX) => (currentSeamX === nextSeamX ? currentSeamX : nextSeamX))
    }

    const observer = new ResizeObserver(updateSeamX)
    observer.observe(face)
    observer.observe(stubElement)
    updateSeamX()

    return () => observer.disconnect()
  }, [stub])

  return (
    <div className="relative size-full">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
        <defs>
          <mask
            id={maskId}
            x="0"
            y="0"
            width="100%"
            height="100%"
            maskContentUnits="userSpaceOnUse"
            maskUnits="userSpaceOnUse"
          >
            <rect width="100%" height="100%" fill="white" />
            <circle cx="0" cy="0" r="16" fill="black" />
            <circle cx="100%" cy="0" r="16" fill="black" />
            <circle cx="0" cy="100%" r="16" fill="black" />
            <circle cx="100%" cy="100%" r="16" fill="black" />
            <circle cx={seamX} cy="0" r="16" fill="black" />
            <circle cx={seamX} cy="100%" r="16" fill="black" />
          </mask>
        </defs>
      </svg>
      <div
        ref={faceRef}
        className="relative flex size-full overflow-hidden rounded-app bg-ticket-preview-background text-ticket-preview-ink"
        style={{ mask: `url(#${maskId})`, WebkitMask: `url(#${maskId})` }}
      >
        {background}
        <TicketFaceFrame />
        {children}
        {stub !== undefined ? (
          <div ref={stubRef} className="relative z-10 w-[30%] min-w-28 shrink-0 sm:min-w-36">
            <TicketPreviewSeam />
            {stub}
          </div>
        ) : null}
      </div>
    </div>
  )
}
