import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@repo/ui'
import type { TicketRecordItem } from '~/modules/tickets/components/ticket-record'
import { TicketPreviewCard } from '~/modules/tickets/components/ticket-preview-card'

export type TicketViewDialogProps = {
  record: TicketRecordItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketViewDialog({ record, open, onOpenChange }: TicketViewDialogProps) {
  const { t } = useTranslation('tickets')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('preview.close')}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl gap-5 overflow-y-auto border-0 bg-popover! p-4 sm:p-6"
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{t('preview.title')}</DialogTitle>
          <DialogDescription>{t('preview.description')}</DialogDescription>
        </DialogHeader>
        {record ? <TicketPreviewCard record={record} /> : null}
      </DialogContent>
    </Dialog>
  )
}
