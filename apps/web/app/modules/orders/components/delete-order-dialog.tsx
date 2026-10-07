import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui'
import type { BuyerOrderSummaryResponse } from '@repo/types'

type DeleteOrderDialogProps = {
  order: BuyerOrderSummaryResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  isDeleting: boolean
}

export function DeleteOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteOrderDialogProps) {
  const { t } = useTranslation('orders')

  function handleOpenChange(nextOpen: boolean) {
    if (isDeleting && !nextOpen) return
    onOpenChange(nextOpen)
  }

  function handleConfirm() {
    if (isDeleting || !order) return
    void onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="sm"
        variant="destructive"
        persistent={isDeleting}
        showCloseButton={!isDeleting}
      >
        <DialogHeader>
          <DialogTitle>{t('cancelCheckout.title')}</DialogTitle>
          <DialogDescription>
            {t('cancelCheckout.description', { ticket: order?.ticketType.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => handleOpenChange(false)}
          >
            {t('cancelCheckout.dismiss')}
          </Button>
          <Button type="button" variant="destructive" loading={isDeleting} onClick={handleConfirm}>
            {isDeleting ? t('cancelCheckout.cancelling') : t('cancelCheckout.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
