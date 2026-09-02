import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, FileDown, Loader2 } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ledger/Toast';
import { EASE_OUT_QUINT } from '@/components/ledger/utils';
import { exportFullLedger } from './exportFull';

const LAST_EXPORT_KEY = 'invoicecore.lastExport';

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft',
        disabled && 'cursor-default opacity-70',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 accent-[#C03F2B]"
      />
      {label}
    </label>
  );
}

interface ExportBannerProps {
  allInvoices: Invoice[];
  periodInvoices: Invoice[];
}

/** 归纳导出横幅：选项 + 大导出按钮 + 成功 Toast */
export default function ExportBanner({ allInvoices, periodInvoices }: ExportBannerProps) {
  const [includeItems, setIncludeItems] = useState(true);
  const [onlyPeriod, setOnlyPeriod] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [lastExport, setLastExport] = useState<string>(() => localStorage.getItem(LAST_EXPORT_KEY) ?? '');

  const doExport = () => {
    setPhase('working');
    const list = onlyPeriod ? periodInvoices : allInvoices;
    window.setTimeout(() => {
      const { rows, sheets } = exportFullLedger(list, includeItems);
      const stamp = nowStamp();
      localStorage.setItem(LAST_EXPORT_KEY, stamp);
      setLastExport(stamp);
      setPhase('done');
      showToast(`台账已导出 · ${rows} 行 · ${sheets} 个工作表`, 'jade');
      window.setTimeout(() => setPhase('idle'), 1200);
    }, 600);
  };

  return (
    <motion.section
      initial={{ y: 32, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: EASE_OUT_QUINT }}
      className="flex flex-col justify-between gap-6 rounded-xl border border-cinnabar-line bg-paper-deep p-6 shadow-card md:flex-row md:items-center md:p-8"
    >
      <div className="max-w-[560px]">
        <h3 className="font-serif text-[22px] font-bold leading-[30px] text-ink">把这本账带走</h3>
        <p className="mt-2 text-[13px] leading-[21px] text-ink-soft">
          导出台账 Excel：包含全部票面要素、商品明细、校验结果与状态标记，可直接用于报销归档与财务系统导入。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Checkbox checked disabled label="票面要素" />
          <Checkbox checked={includeItems} onChange={setIncludeItems} label="商品明细" />
          <Checkbox checked={onlyPeriod} onChange={setOnlyPeriod} label="仅当前周期结果" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <button
          onClick={doExport}
          disabled={phase === 'working'}
          className="flex h-[52px] items-center gap-2 rounded-lg bg-seal px-8 text-[15px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97] disabled:opacity-80"
        >
          {phase === 'working' ? (
            <Loader2 size={17} className="animate-spin" />
          ) : phase === 'done' ? (
            <Check size={17} />
          ) : (
            <FileDown size={17} />
          )}
          导出 Excel (.xlsx)
        </button>
        {lastExport && <span className="num text-[11px] text-ink-faint">上次导出：{lastExport}</span>}
      </div>
    </motion.section>
  );
}
