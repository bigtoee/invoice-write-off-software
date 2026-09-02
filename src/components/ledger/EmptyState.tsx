import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { EASE_OUT_QUINT } from './utils';

/** 空账簿插画：淡入后缓慢上下浮动（隔离为 memo 组件避免父级重渲染重置动画） */
const FloatingArt = memo(function FloatingArt() {
  return (
    <motion.img
      src="/empty-ledger.jpg"
      alt="空账簿插画"
      className="h-auto w-[260px] rounded-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.5, ease: EASE_OUT_QUINT },
        y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      }}
    />
  );
});

interface EmptyStateProps {
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  /** 默认 primary 跳工作台 */
  showWorkbenchPrimary?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({
  description,
  primaryLabel,
  onPrimary,
  showWorkbenchPrimary = true,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <FloatingArt />
      <p className="max-w-[420px] text-[14px] leading-[22px] text-ink-faint">{description}</p>
      <div className="mt-2 flex items-center gap-3">
        {showWorkbenchPrimary && (
          <button
            onClick={onPrimary ?? (() => navigate('/workbench'))}
            className="rounded-lg bg-seal px-5 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
          >
            {primaryLabel ?? '前往工作台'}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="rounded-lg border border-cinnabar-line px-5 py-2.5 text-[14px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
