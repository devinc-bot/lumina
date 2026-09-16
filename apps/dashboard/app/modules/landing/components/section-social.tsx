import { useTranslation } from 'react-i18next'
import { LANDING_SOCIAL_KEYS } from '../constants/landing-content'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_MAX } from '../constants/layout'

export function SectionSocial() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section aria-labelledby="social-heading" className="scroll-mt-32">
      <div className={`${LANDING_MAX} py-[clamp(4rem,8vw,6.5rem)]`}>
        <div className="mb-12 max-w-2xl">
          <span className={`${LANDING_EYEBROW} mb-2 block`}>{t('social.eyebrow')}</span>
          <h2 id="social-heading" className={`${LANDING_HEADING} text-[clamp(1.5rem,3vw,2.5rem)]`}>
            {t('social.headline')}
          </h2>
          <p className="mt-3 max-w-[48ch] text-base leading-relaxed text-pretty text-on-surface-variant">
            {t('social.support')}
          </p>
        </div>

        <ul className="grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_SOCIAL_KEYS.map((key) => (
            <li
              key={key}
              className="flex min-w-0 flex-col justify-between gap-8 rounded-app-xl bg-surface-container-low p-8 md:p-10"
            >
              <blockquote className="font-display text-lg leading-relaxed font-medium text-pretty text-on-surface italic">
                “{t(`social.items.${key}.quote`)}”
              </blockquote>
              <footer className="font-label text-sm text-on-surface-variant">
                <span className="block font-bold text-on-surface not-italic">
                  {t(`social.items.${key}.author`)}
                </span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
