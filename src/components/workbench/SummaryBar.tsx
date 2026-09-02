import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Stamp } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

interface SummaryBarProps {
  uploaded: number;
  archived: number;
  pending: number;
  duplicates: number;
  onArchiveAll: () => void;
}

function RollingNum({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('num relative inline-flex h-[20px] min-w-[1.2em] justify-center overflow-hidden font-semibold', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** 底部 sticky 快捷汇总条：会话统计 + 归入台账快捷操作 */
export default function SummaryBar({ uploaded, archived, pending, duplicates, onArchiveAll }: SummaryBarProps) {
  const allClear = pending === 0 && uploaded > 0;
  return (
    <div className="sticky bottom-14 z-30 -mx-4 mt-8 border-t border-cinnabar-line bg-warm-white px-4 shadow-[0_-8px_24px_rgba(30,27,22,0.08)] md:bottom-0 md:-mx-8 md:px-8">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0.5 text-[13px] text-ink-soft">
          <span>
            上传 <RollingNum value={uploaded} className="text-ink" />
          </span>
          <span>
            已入库 <RollingNum value={archived} className="text-jade" />
          </span>
          <span>
            待确认 <RollingNum value={pending} className="text-amber" />
          </span>
          <span>
            重复拦截 <RollingNum value={duplicates} className="text-seal" />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link to="/ledger" className="hidden text-[13px] text-ink-soft underline-offset-4 hover:text-seal hover:underline sm:inline">
            前往台账
          </Link>
          <motion.button
            onClick={onArchiveAll}
            disabled={!allClear}
            animate={allClear ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-all active:scale-[0.97]',
              allClear
                ? 'bg-seal text-white hover:bg-seal-deep'
                : 'cursor-not-allowed bg-paper-deep text-ink-faint',
            )}
          >
            <Stamp size={14} /> 全部确认无误，归入台账 <ArrowRight size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
