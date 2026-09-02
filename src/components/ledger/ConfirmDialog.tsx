import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TriangleAlert } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/** 危险操作二次确认：居中 Dialog（删除 / 红冲 / 作废 / 清空） */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] bg-warm-white">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[4px] border-[1.5px] border-seal/40 bg-seal/5 text-seal">
            <TriangleAlert size={20} />
          </div>
          <DialogTitle className="font-serif text-[18px] text-ink">{title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-[20px] text-ink-soft">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-seal-deep active:scale-[0.97]"
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
