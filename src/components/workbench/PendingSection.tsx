import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, PenLine, RotateCw, X } from 'lucide-react';
import type { QueueItem } from './queue-types';

interface PendingSectionProps {
  items: QueueItem[];
  onManual: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

/** S5 待确认与异常分区（amber 主题，列表行式） */
export default function PendingSection({ items, onManual, onRetry, onRemove }: PendingSectionProps) {
  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 overflow-hidden rounded-xl border border-amber/30 bg-amber/[0.06]"
        >
          <div className="px-5 py-4">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-amber">
              <AlertTriangle size={16} />
              需要人工确认 · <span className="num">{items.length}</span>
            </h3>
            <ul className="mt-3 divide-y divide-amber/15">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap items-center gap-3 py-2.5"
                  >
                    <span className="rounded-[6px] bg-warm-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-soft">
                      {item.format}
                    </span>
                    <span className="min-w-0 max-w-[240px] truncate text-[13px] font-medium text-ink">{item.name}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-amber/90">
                      {item.reason ?? '识别置信度偏低，请人工核对'}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => onManual(item.id)}
                        className="flex items-center gap-1 rounded-lg border border-amber/50 px-2.5 py-1 text-[12px] font-medium text-amber transition-colors hover:bg-amber/10 active:scale-[0.97]"
                      >
                        <PenLine size={12} /> 手动录入
                      </button>
                      <button
                        onClick={() => onRetry(item.id)}
                        className="flex items-center gap-1 rounded-lg border border-cinnabar-line bg-warm-white px-2.5 py-1 text-[12px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
                      >
                        <RotateCw size={12} /> 重新识别
                      </button>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="rounded-lg p-1 text-ink-faint transition-colors hover:text-seal"
                        aria-label="移除"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
