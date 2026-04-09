import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type CreateCameriereDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Placeholder dialog for future "create waiter" form.
 * Current MVP intentionally exposes only informational content.
 */
export function CreateCameriereDialog({ open, onOpenChange }: CreateCameriereDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crea Cameriere</DialogTitle>
          <DialogDescription>
            Il form completo di creazione cameriere e in sviluppo. In questa fase puoi usare la promozione da board candidati.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
