import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, LayoutGrid, Table2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  STATUS_FILTER_OPTIONS,
  TYPE_OPTIONS,
  monthLabel,
  type StatusFilter,
} from './utils';

export type CheckFilter = 'all' | 'pass' | 'abnormal';

export interface LedgerFilters {
  keyword: string;
  type: string;
  status: StatusFilter | 'all';
  check: CheckFilter;
  month: string;
  dupOnly: boolean;
}

export const DEFAULT_FILTERS: LedgerFilters = {
  keyword: '',
  type: 'all',
  status: 'all',
  check: 'all',
  month: 'all',
  dupOnly: false,
};

interface FilterBarProps {
  filters: LedgerFilters;
  onChange: (f: LedgerFilters) => void;
  months: string[];
  view: 'table' | 'card';
  onViewChange: (v: 'table' | 'card') => void;
  resultCount: number;
}

/** sticky 筛选工具栏：搜索 / 类型 / 状态 / 校验 / 月份 / 重复 + 视图切换 */
export default function FilterBar({
  filters,
  onChange,
  months,
  view,
  onViewChange,
  resultCount,
}: FilterBarProps) {
  const [rawKeyword, setRawKeyword] = useState(filters.keyword);

  // 300ms 防抖即时过滤
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (rawKeyword !== filters.keyword) onChange({ ...filters, keyword: rawKeyword });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawKeyword]);

  const set = (patch: Partial<LedgerFilters>) => onChange({ ...filters, ...patch });

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.type !== 'all')
    chips.push({ key: 'type', label: `类型 · ${filters.type}`, clear: () => set({ type: 'all' }) });
  if (filters.status !== 'all')
    chips.push({
      key: 'status',
      label: `状态 · ${STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status)?.label ?? ''}`,
      clear: () => set({ status: 'all' }),
    });
  if (filters.check !== 'all')
    chips.push({
      key: 'check',
      label: `校验 · ${filters.check === 'pass' ? '通过' : '有异常'}`,
      clear: () => set({ check: 'all' }),
    });
  if (filters.month !== 'all')
    chips.push({
      key: 'month',
      label: `月份 · ${monthLabel(filters.month)}`,
      clear: () => set({ month: 'all' }),
    });
  if (filters.dupOnly)
    chips.push({ key: 'dup', label: '仅看重复', clear: () => set({ dupOnly: false }) });

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-cinnabar-line bg-warm-white/95 px-4 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex min-h-14 flex-wrap items-center gap-2.5 py-2.5">
        {/* 搜索 */}
        <div className="relative w-full sm:w-[280px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={rawKeyword}
            onChange={(e) => setRawKeyword(e.target.value)}
            placeholder="搜索发票号码 / 购销方名称 / 税号"
            className="h-9 w-full rounded-lg border border-cinnabar-line bg-white pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-seal/50"
          />
        </div>

        {/* 类型 */}
        <Select value={filters.type} onValueChange={(v) => set({ type: v })}>
          <SelectTrigger
            className={cn(
              'h-9 w-[128px] rounded-lg border-cinnabar-line bg-white text-[13px]',
              filters.type !== 'all' && 'border-seal/60 text-seal',
            )}
          >
            <SelectValue placeholder="发票类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 状态 */}
        <Select value={filters.status} onValueChange={(v) => set({ status: v as LedgerFilters['status'] })}>
          <SelectTrigger
            className={cn(
              'h-9 w-[112px] rounded-lg border-cinnabar-line bg-white text-[13px]',
              filters.status !== 'all' && 'border-seal/60 text-seal',
            )}
          >
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 校验 */}
        <Select value={filters.check} onValueChange={(v) => set({ check: v as CheckFilter })}>
          <SelectTrigger
            className={cn(
              'h-9 w-[112px] rounded-lg border-cinnabar-line bg-white text-[13px]',
              filters.check !== 'all' && 'border-seal/60 text-seal',
            )}
          >
            <SelectValue placeholder="校验" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部校验</SelectItem>
            <SelectItem value="pass">通过</SelectItem>
            <SelectItem value="abnormal">有异常</SelectItem>
          </SelectContent>
        </Select>

        {/* 月份 */}
        <Select value={filters.month} onValueChange={(v) => set({ month: v })}>
          <SelectTrigger
            className={cn(
              'h-9 w-[128px] rounded-lg border-cinnabar-line bg-white text-[13px]',
              filters.month !== 'all' && 'border-seal/60 text-seal',
            )}
          >
            <SelectValue placeholder="开票月份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部月份</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 重复标记 */}
        <button
          onClick={() => set({ dupOnly: !filters.dupOnly })}
          className={cn(
            'h-9 rounded-lg border px-3 text-[13px] transition-all active:scale-[0.97]',
            filters.dupOnly
              ? 'border-amber/60 bg-amber/5 text-amber'
              : 'border-cinnabar-line bg-white text-ink-soft hover:bg-paper-deep',
          )}
        >
          重复标记
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="num text-[12px] text-ink-faint">{resultCount} 张</span>
          {/* 视图切换 */}
          <div className="flex rounded-lg border border-cinnabar-line bg-white p-0.5">
            {(
              [
                { v: 'table', icon: Table2, label: '表格视图' },
                { v: 'card', icon: LayoutGrid, label: '卡片视图' },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                title={label}
                onClick={() => onViewChange(v)}
                className={cn(
                  'flex h-8 w-9 items-center justify-center rounded-md transition-colors',
                  view === v ? 'bg-seal text-white' : 'text-ink-faint hover:text-ink',
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 已选筛选 Chips */}
      <AnimatePresence>
        {chips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap items-center gap-2 overflow-hidden pb-2.5"
          >
            {chips.map((c) => (
              <motion.button
                key={c.key}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={c.clear}
                className="flex items-center gap-1.5 rounded-md border border-seal/50 bg-seal/5 px-2.5 py-1 text-[12px] text-seal"
              >
                {c.label}
                <X size={12} />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
