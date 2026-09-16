import { Calendar, QrCode, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, staggerStyle, useRevealEntrance } from '@repo/ui'
import { Container } from '~/modules/common/components/container'
import { LANDING_HEADING, LANDING_SECTION_Y } from '../../constants/layout'

const CLARITY_ITEMS = [
  { id: 'ticket', Icon: Ticket },
  { id: 'secure', Icon: QrCode },
  { id: 'time', Icon: Calendar },
] as const

type SectionClarityProps = {
  className?: string
}

export function SectionClarity({ className }: SectionClarityProps) {
  const { t } = useTranslation('landing')
  const { ref, runEntrance } = useRevealEntrance()

  return (
    <section
      id="claridad"
      aria-labelledby="clarity-heading"
      className={cn(
        'scroll-mt-32 border-y border-outline-variant/30 bg-surface-container-lowest',
        className
      )}
    >
      <Container className={LANDING_SECTION_Y}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl space-y-3">
            <span className="flex items-center gap-2 font-label text-xs font-semibold tracking-wider text-primary uppercase">
              <span className="h-0.5 w-2 bg-primary" aria-hidden />
              {t('clarity.kicker')}
            </span>
            <h2 id="clarity-heading" className={cn(LANDING_HEADING, 'text-on-surface')}>
              {t('clarity.headline')}
            </h2>
          </div>
          <p className="max-w-[36ch] text-base leading-relaxed text-pretty text-on-surface-variant md:text-right sm:text-lg">
            {t('clarity.support')}
          </p>
        </div>

        <ul
          ref={ref as never}
          className="mt-12 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
        >
          {CLARITY_ITEMS.map(({ id, Icon }, index) => (
            <li
              key={id}
              style={staggerStyle(index)}
              className={cn(
                'flex min-w-0 flex-col gap-5 border border-transparent hover:border-hairline/20 rounded-app-lg bg-hairline/10 hover:bg-card transition-all duration-300 hover:shadow-glass p-8 sm:rounded-app-xl',
                runEntrance && 'animate-landing-stagger'
              )}
            >
              <span className="inline-flex size-11 items-center justify-center rounded-app bg-card text-primary glass-panel">
                <Icon className="size-7" strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
              </span>
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="font-display text-xl font-semibold tracking-tight text-balance text-on-surface">
                  {t(`clarity.items.${id}.title`)}
                </h3>
                <p className="max-w-[34ch] text-base leading-relaxed text-pretty text-on-surface-variant">
                  {t(`clarity.items.${id}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
