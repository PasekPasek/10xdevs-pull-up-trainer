import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ETagConflictDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onRefresh: () => void;
}

export function ETagConflictDialog({ open, onOpenChange, onRefresh }: ETagConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Session was updated elsewhere</DialogTitle>
          <DialogDescription>
            Someone else updated this session while you were editing. Refresh to load the latest details before trying
            again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onRefresh}>Refresh</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
