import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, AlertTriangle, X, RotateCw, PenLine, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCNY } from '@/lib/validate';
import SealBadge from '@/components/SealBadge';
import type { QueueItem } from './queue-types';
import { formatSize } from './queue-types';

interface QueueCardProps {
  item: QueueItem;
  index: number;
  onRemove: (id: string) => void;
  onConfirm: (id: string) => void;
  onManual: (id: string) => void;
  onRetry: (id: string) => void;
}

function Thumb({ item }: { item: QueueItem }) {
  const scanning = item.status === 'recognizing';
  return (
    <div className="relative h-[68px] w-[96px] shrink-0 overflow-hidden rounded-lg border border-cinnabar-line bg-paper-deep">
      {item.previewUrl ? (
        <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-faint">
          <FileText size={20} strokeWidth={1.5} />
          <span className="text-[10px] leading-none">
            {scanning ? '识别中…' : item.format === 'PDF' ? '预览不可用' : item.format}
          </span>
        </div>
      )}
      {scanning && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-scanline absolute left-0 right-0 h-6"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(192,63,43,0.35) 55%, rgba(192,63,43,0.75))',
              filter: 'blur(0.5px)',
            }}
          />
        </div>
      )}
      {item.status === 'recognized' && (
        <motion.span
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute right-1 top-1"
        >
          <SealBadge tone="jade" className="!px-1 !py-0 !text-[10px]">
            已识别
          </SealBadge>
        </motion.span>
      )}
      {item.status === 'archived' && (
        <motion.span
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute right-1 top-1"
        >
          <SealBadge tone="jade" className="!px-1 !py-0 !text-[10px]">
            已入库
          </SealBadge>
        </motion.span>
      )}
    </div>
  );
}

function QueueCardInner({ item, index, onRemove, onConfirm, onManual, onRetry }: QueueCardProps) {
  const r = item.result;
  const removable = item.status !== 'recognizing';

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{
        duration: 0.45,
        delay: index * 0.08,
        type: 'spring',
        bounce: 0.2,
      }}
      className={cn(
        'group relative rounded-xl border bg-warm-white p-4 shadow-card',
        item.status === 'archived' ? 'border-jade/30 opacity-75' : 'border-cinnabar-line',
      )}
    >
      {/* 顶部行 */}
      <div className="flex items-center gap-2">
        <span className="rounded-[6px] bg-paper-deep px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-soft">
          {item.format}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={item.name}>
          {item.name}
        </span>
        <span className="shrink-0 text-[12px] text-ink-faint">{formatSize(item.size)}</span>
      </div>

      {/* 中部：缩略图 + 状态区 */}
      <div className="mt-3 flex gap-3">
        <Thumb item={item} />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {item.status === 'queued' && (
              <motion.div key="queued" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <span className="flex items-center gap-1.5 text-[13px] text-ink-faint">
                  <Clock size={15} /> 排队中
                </span>
              </motion.div>
            )}

            {item.status === 'recognizing' && (
              <motion.div key="recognizing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-seal">{item.stage || '识别中'}</span>
                  <span className="num text-ink-soft">{Math.round(item.progress * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full bg-seal transition-[width] duration-200"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
                <span className="mt-1.5 inline-block rounded-[6px] bg-seal/10 px-1.5 py-0.5 text-[11px] text-seal">
                  {item.channel ?? '智能路由'}
                </span>
              </motion.div>
            )}

            {item.status === 'recognized' && (
              <motion.div key="recognized" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-1">
                <p className="truncate text-[12px] text-ink-faint">
                  号码 <span className="num text-ink">{r?.invoiceNumber || '—'}</span>
                </p>
                <p className="truncate text-[12px] text-ink-faint">
                  价税合计{' '}
                  <span className="num text-[13px] font-medium text-seal">
                    {typeof r?.totalAmount === 'number' ? formatCNY(r.totalAmount) : '—'}
                  </span>
                </p>
              </motion.div>
            )}

            {item.status === 'pending' && (
              <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-1.5">
                <SealBadge tone="amber" flat className="!text-[11px]">
                  待确认
                </SealBadge>
                <p className="flex items-start gap-1 text-[12px] leading-[18px] text-amber">
                  <AlertTriangle size={13} className="mt-[2px] shrink-0" />
                  <span className="line-clamp-2">{item.reason ?? '识别置信度偏低，请人工核对'}</span>
                </p>
              </motion.div>
            )}

            {item.status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-1.5">
                <SealBadge tone="amber" flat className="!text-[11px]">
                  识别异常
                </SealBadge>
                <p className="flex items-start gap-1 text-[12px] leading-[18px] text-amber">
                  <AlertTriangle size={13} className="mt-[2px] shrink-0" />
                  <span className="line-clamp-2">{item.reason ?? '未能识别票面要素'}</span>
                </p>
              </motion.div>
            )}

            {item.status === 'archived' && (
              <motion.div key="archived" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <p className="flex items-center gap-1.5 text-[13px] text-jade">
                  <FileText size={14} /> 已归入发票台账
                </p>
                <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                  <span className="num">{r?.invoiceNumber || '—'}</span>
                  {' · '}
                  <span className="num">{typeof r?.totalAmount === 'number' ? formatCNY(r.totalAmount) : '—'}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 底部操作 */}
      {item.status === 'recognized' && (
        <button
          onClick={() => onConfirm(item.id)}
          className="mt-3 w-full rounded-lg bg-seal px-3 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-seal-deep active:scale-[0.97]"
        >
          确认识别结果
        </button>
      )}
      {(item.status === 'pending' || item.status === 'error') && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onManual(item.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber/50 px-2 py-1.5 text-[12px] font-medium text-amber transition-colors hover:bg-amber/10 active:scale-[0.97]"
          >
            <PenLine size={13} /> 手动录入
          </button>
          <button
            onClick={() => onRetry(item.id)}
            className="flex items-center justify-center gap-1 rounded-lg border border-cinnabar-line px-2 py-1.5 text-[12px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
          >
            <RotateCw size={13} /> 重新识别
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="rounded-lg px-2 py-1.5 text-[12px] text-ink-faint transition-colors hover:bg-paper-deep hover:text-seal active:scale-[0.97]"
          >
            移除
          </button>
        </div>
      )}

      {/* 移除 ×（hover 显现） */}
      {removable && item.status !== 'archived' && (
        <button
          onClick={() => onRemove(item.id)}
          aria-label="移除"
          className="absolute right-2 top-2 rounded-md p-1 text-ink-faint opacity-0 transition-all hover:bg-paper-deep hover:text-seal group-hover:opacity-100"
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  );
}

const QueueCard = memo(QueueCardInner);
export default QueueCard;
