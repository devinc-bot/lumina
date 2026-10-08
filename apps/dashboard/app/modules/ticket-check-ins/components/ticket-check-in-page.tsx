import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui'
import { ScanLine } from 'lucide-react'
import { PageLayout } from '~/modules/common/components/page-layout'
import { ScannedTicketsHistory } from './scanned-tickets-history'
import { TicketScanner } from './ticket-scanner'

const QR_TICKET_TAB = {
  SCAN: 'scan',
  HISTORY: 'history',
} as const

type QrTicketTab = (typeof QR_TICKET_TAB)[keyof typeof QR_TICKET_TAB]

export function TicketCheckInPage() {
  const { t } = useTranslation('dashboard')
  const [activeTab, setActiveTab] = useState<QrTicketTab>(QR_TICKET_TAB.SCAN)
  const [isScannerStarted, setIsScannerStarted] = useState(false)

  return (
    <PageLayout title={t('pages.qrTicket.title')} description={t('pages.qrTicket.description')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as QrTicketTab
          setActiveTab(nextTab)
          if (nextTab !== QR_TICKET_TAB.SCAN) setIsScannerStarted(false)
        }}
        className="flex flex-col gap-4"
      >
        <TabsList variant="line">
          <TabsTrigger variant="line" value={QR_TICKET_TAB.SCAN}>
            {t('pages.qrTicket.tabs.scan')}
          </TabsTrigger>
          <TabsTrigger variant="line" value={QR_TICKET_TAB.HISTORY}>
            {t('pages.qrTicket.tabs.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={QR_TICKET_TAB.SCAN} className="mt-0">
          <div className="mx-auto w-full max-w-xl">
            {isScannerStarted ? (
              <TicketScanner />
            ) : (
              <Button onClick={() => setIsScannerStarted(true)}>
                <ScanLine aria-hidden="true" />
                {t('pages.qrTicket.startScanning')}
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value={QR_TICKET_TAB.HISTORY} className="mt-0">
          <ScannedTicketsHistory />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
