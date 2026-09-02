import { motion } from 'framer-motion';
import { MoveRight } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { formatCNY } from '@/lib/validate';
import SealBadge from '@/components/SealBadge';
import { cn } from '@/lib/utils';
import { EASE_OUT_QUINT, STATUS_TONE, getChecks, statusLabel, typeCategory } from './utils';

interface CardViewProps {
  rows: Invoice[];
  onOpen: (inv: Invoice) => void;
}

/** 卡片视图：三列网格，hover 上浮 + 边框 seal 30% */
export default function CardView({ rows, onOpen }: CardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((inv, idx) => {
        const isDup = !getChecks(inv).dup;
        return (
          <motion.button
            key={inv.id}
            layout
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: Math.min(idx, 12) * 0.05, ease: EASE_OUT_QUINT }}
            onClick={() => onOpen(inv)}
            className={cn(
              'rounded-xl border border-cinnabar-line bg-warm-white p-4 text-left shadow-card transition-all duration-200',
              'hover:-translate-y-1 hover:border-seal/30 hover:shadow-overlay',
              isDup && 'shadow-[inset_3px_0_0_#B97E1E]',
            )}
          >
            <div className="flex items-center justify-between">
              <SealBadge tone={STATUS_TONE[inv.status]}>{statusLabel(inv.status)}</SealBadge>
              <span className="flex items-center gap-1.5">
                {isDup && (
                  <span className="rounded-[3px] border border-amber/60 bg-amber/5 px-1 text-[10px] font-semibold text-amber">
                    重
                  </span>
                )}
                <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[11px] text-ink-soft">
                  {typeCategory(inv.invoiceType)}
                </span>
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {inv.buyerName}
              </span>
              <MoveRight size={15} className="shrink-0 text-seal" />
              <span className="min-w-0 flex-1 truncate text-right text-[13px] font-medium text-ink">
                {inv.sellerName}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between border-t border-cinnabar-line/70 pt-3">
              <span className="num text-[12px] text-ink-faint">{inv.invoiceDate}</span>
              <span className="num text-[15px] font-semibold text-seal">
                {formatCNY(inv.totalAmount)}
              </span>
            </div>
            <div className="num mt-1 text-right text-[11px] text-ink-faint">
              No. {inv.invoiceNumber}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
