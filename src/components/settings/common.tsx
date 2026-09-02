import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- 即时保存提示：修改后浮现「已保存 ✓」，1.5s 淡出 ---------- */

export function SavedTick({ tick }: { tick: number }) {
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [tick]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-jade"
        >
          <Check size={13} strokeWidth={3} /> 已保存
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ---------- 分组卡 ---------- */

interface SectionCardProps {
  id: string;
  title: string;
  desc?: string;
  badge?: ReactNode;
  savedTick?: number;
  children: ReactNode;
}

export function SectionCard({ id, title, desc, badge, savedTick, children }: SectionCardProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-24 rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
    >
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        {badge}
        <span className="ml-auto">{savedTick !== undefined && <SavedTick tick={savedTick} />}</span>
      </div>
      {desc && <p className="mb-2 text-[13px] text-ink-faint">{desc}</p>}
      <div>{children}</div>
    </motion.section>
  );
}

/* ---------- 表单项行：左标签 + 一句说明，右侧控件 ---------- */

interface RowProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Row({ label, hint, children }: RowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-cinnabar-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-faint">{hint}</p>}
      </div>
      <div className="shrink-0 sm:text-right">{children}</div>
    </div>
  );
}

/* ---------- 描边 Chip 单选组（选中 seal 底白字） ---------- */

interface ChipGroupProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChipGroup<T extends string>({ options, value, onChange, disabled }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97] disabled:opacity-50',
            value === opt.value
              ? 'bg-seal text-white'
              : 'border border-cinnabar-line text-ink-soft hover:bg-paper-deep',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 原生下拉（纸墨风格） ---------- */

interface SelectBoxProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SelectBox<T extends string>({ options, value, onChange, disabled }: SelectBoxProps<T>) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-lg border border-cinnabar-line bg-warm-white px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-seal disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
