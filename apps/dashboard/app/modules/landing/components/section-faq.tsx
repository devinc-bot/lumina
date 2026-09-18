import { useTranslation } from 'react-i18next'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui'
import { LANDING_FAQ_KEYS } from '../constants/landing-content'
import { LANDING_EYEBROW, LANDING_HEADING } from '../constants/layout'

export function SectionFaq() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-32">
      <div className="mx-auto w-full max-w-4xl px-margin-mobile py-[clamp(4rem,8vw,6.5rem)] md:px-margin-desktop">
        <div className="mb-12 text-center">
          <span className={`${LANDING_EYEBROW} mb-2 block`}>{t('faq.eyebrow')}</span>
          <h2 id="faq-heading" className={LANDING_HEADING}>
            {t('faq.headline')}
          </h2>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue={LANDING_FAQ_KEYS[0]}
          className="space-y-4"
        >
          {LANDING_FAQ_KEYS.map((key) => (
            <AccordionItem
              key={key}
              value={key}
              className="overflow-hidden rounded-app-lg border-0 bg-surface-container-low px-2"
            >
              <AccordionTrigger className="px-4 text-left font-display text-base font-bold tracking-tight text-on-surface hover:text-primary hover:no-underline sm:text-lg">
                {t(`faq.items.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 text-base leading-relaxed text-pretty text-on-surface-variant">
                {t(`faq.items.${key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
