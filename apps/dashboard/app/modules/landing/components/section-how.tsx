import type { LucideIcon } from 'lucide-react'
import { MapPin, CalendarCheck, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, staggerStyle, useRevealEntrance } from '@repo/ui'
import { LANDING_STEP_KEYS } from '../constants/landing-content'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_ICON, LANDING_MAX } from '../constants/layout'

const STEP_ICONS = {
  '1': MapPin,
  '2': CalendarCheck,
  '3': Ticket,
} as const satisfies Record<(typeof LANDING_STEP_KEYS)[number], LucideIcon>

export function SectionHow() {
  const { t } = useTranslation('dashboardLanding')
  const { ref, runEntrance } = useRevealEntrance()

  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-32">
      <div className={`${LANDING_MAX} py-[clamp(4rem,8vw,6.5rem)]`}>
        <div className="mb-12 max-w-2xl">
          <span className={`${LANDING_EYEBROW} mb-2 block`}>{t('how.eyebrow')}</span>
          <h2 id="how-heading" className={LANDING_HEADING}>
            {t('how.headline')}
          </h2>
        </div>

        <ol ref={ref as never} className="grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8">
          {LANDING_STEP_KEYS.map((key, index) => {
            const Icon = STEP_ICONS[key]
            return (
              <li
                key={key}
                style={staggerStyle(index)}
                className={cn(
                  'group flex h-full flex-col justify-between rounded-app-xl bg-surface-container-low p-8 transition-colors duration-(--duration-fast) ease-emphasized hover:bg-surface-container',
                  runEntrance && 'animate-landing-stagger'
                )}
              >
                <div>
                  <span
                    className="mb-6 block font-display text-6xl font-black leading-none text-on-surface/20 transition-colors group-hover:text-primary"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-xl font-bold tracking-tight text-on-surface">
                    {t(`how.steps.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-pretty text-on-surface-variant">
                    {t(`how.steps.${key}.body`)}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3 font-label text-xs text-on-surface-variant">
                  <Icon className={`${LANDING_ICON} text-primary`} strokeWidth={1.75} aria-hidden />
                  <span>{t(`how.steps.${key}.meta`)}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
