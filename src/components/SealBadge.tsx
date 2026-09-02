import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type SealBadgeTone = 'jade' | 'seal' | 'amber' | 'ink-soft';

const TONE_CLASSES: Record<SealBadgeTone, string> = {
  jade: 'border-jade text-jade bg-jade/5',
  seal: 'border-seal text-seal bg-seal/5',
  amber: 'border-amber text-amber bg-amber/5',
  'ink-soft': 'border-ink-soft text-ink-soft bg-ink-soft/5',
};

interface SealBadgeProps {
  tone?: SealBadgeTone;
  children: ReactNode;
  className?: string;
  /** 去掉默认 -3° 旋转（如表格密集场景） */
  flat?: boolean;
}

/** 印章徽章：状态展示核心组件，方形小圆角 + 描边 + 微旋转，模拟印章盖在纸面。 */
export default function SealBadge({ tone = 'seal', children, className, flat }: SealBadgeProps) {
  return (
    <span
      className={cn(
        'seal-badge whitespace-nowrap',
        TONE_CLASSES[tone],
        flat && '[transform:none]',
        className,
      )}
    >
      {children}
    </span>
  );
}
