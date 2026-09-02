import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { listInvoices, loadSampleData } from '@/lib/store';
import { formatCNY } from '@/lib/validate';
import { exportLedgerXlsx } from '@/lib/export';
import EmptyState from '@/components/ledger/EmptyState';
import { ToastHost, showToast } from '@/components/ledger/Toast';
import {
  EASE_OUT_QUINT,
  getChecks,
  isAbnormal,
  monthKey,
  trailingMonths,
  typeCategory,
} from '@/components/ledger/utils';
import KpiCards, { type KpiCardData } from '@/components/analytics/KpiCards';
import TrendChart, { type MonthPoint } from '@/components/analytics/TrendChart';
import TypeDonut from '@/components/analytics/TypeDonut';
import StatusBars from '@/components/analytics/StatusBars';
import SellerRank from '@/components/analytics/SellerRank';
import ExportBanner from '@/components/analytics/ExportBanner';
import { cn } from '@/lib/utils';

type Period = 'month' | 'quarter' | 'year' | 'all';

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' },
  { key: 'year', label: '本年' },
  { key: 'all', label: '全部' },
];

function quarterOf(month: string): number {
  return Math.floor((Number(month.split('-')[1]) - 1) / 3);
}

export default function Analytics() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState<Period>('all');

  const reload = useCallback(async () => {
    const all = await listInvoices();
    setInvoices(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void reload();
  }, [reload]);

  // 以台账中最新的开票月为「本期」锚点，保证示例数据下各周期视图均有内容
  const anchor = useMemo(() => {
    if (invoices.length === 0) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return invoices.reduce((max, i) => (monthKey(i.invoiceDate) > max ? monthKey(i.invoiceDate) : max), '0000-00');
  }, [invoices]);

  const periodInvoices = useMemo(() => {
    if (period === 'all') return invoices;
    const [ay, aq] = [anchor.split('-')[0], quarterOf(anchor)];
    return invoices.filter((i) => {
      const m = monthKey(i.invoiceDate);
      if (period === 'month') return m === anchor;
      if (period === 'year') return m.startsWith(ay);
      return m.startsWith(ay) && quarterOf(m) === aq;
    });
  }, [invoices, period, anchor]);

  // 近 12 月序列（全部数据，供趋势图与 sparkline）
  const monthSeries = useMemo<MonthPoint[]>(() => {
    const keys = trailingMonths(anchor, 12);
    return keys.map((k) => {
      const list = invoices.filter((i) => monthKey(i.invoiceDate) === k);
      return {
        month: k,
        totalAmount: list.reduce((s, i) => s + i.totalAmount, 0),
        taxAmount: list.reduce((s, i) => s + i.taxAmount, 0),
        count: list.length,
      };
    });
  }, [invoices, anchor]);

  const kpiCards = useMemo<KpiCardData[]>(() => {
    const total = periodInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const tax = periodInvoices.reduce((s, i) => s + i.taxAmount, 0);
    const count = periodInvoices.length;
    const abnormal = periodInvoices.filter(isAbnormal);
    const dupCount = periodInvoices.filter((i) => !getChecks(i).dup).length;
    const reconCount = periodInvoices.filter((i) => !getChecks(i).recon).length;

    // 环比：锚点月 vs 上一月（基于全部数据）
    const cur = monthSeries[monthSeries.length - 1];
    const prev = monthSeries[monthSeries.length - 2];
    const amountDelta =
      prev && prev.totalAmount > 0
        ? {
            text: `环比上月 ${((cur.totalAmount - prev.totalAmount) / prev.totalAmount) * 100 >= 0 ? '+' : ''}${(((cur.totalAmount - prev.totalAmount) / prev.totalAmount) * 100).toFixed(1)}%`,
            up: cur.totalAmount >= prev.totalAmount,
          }
        : undefined;
    const countDiff = prev ? cur.count - prev.count : 0;

    const spark = (pick: (p: MonthPoint) => number) => monthSeries.slice(-6).map(pick);
    const abnormalSpark = trailingMonths(anchor, 6).map(
      (k) => invoices.filter((i) => monthKey(i.invoiceDate) === k && isAbnormal(i)).length,
    );

    return [
      {
        key: 'total',
        label: '价税合计',
        value: total,
        format: formatCNY,
        valueClass: 'text-seal',
        sparkValues: spark((p) => p.totalAmount),
        sparkColor: '#C03F2B',
        delta: amountDelta,
        footnote: amountDelta ? undefined : '本期锚定台账最新开票月',
      },
      {
        key: 'count',
        label: '发票张数',
        value: count,
        format: (n) => `${Math.round(n)} 张`,
        valueClass: 'text-ink',
        sparkValues: spark((p) => p.count),
        sparkColor: '#4A6E8A',
        delta: prev ? { text: `环比 ${countDiff >= 0 ? '+' : ''}${countDiff} 张`, up: null } : undefined,
      },
      {
        key: 'tax',
        label: '合计税额',
        value: tax,
        format: formatCNY,
        valueClass: 'text-ink',
        sparkValues: spark((p) => p.taxAmount),
        sparkColor: '#3E7A5E',
        footnote: total !== 0 ? `占价税合计 ${((tax / total) * 100).toFixed(1)}%` : undefined,
      },
      {
        key: 'abnormal',
        label: '异常拦截',
        value: abnormal.length,
        format: (n) => `${Math.round(n)} 张`,
        valueClass: 'text-amber',
        sparkValues: abnormalSpark,
        sparkColor: '#B97E1E',
        footnote: `查重 ${dupCount} · 勾稽 ${reconCount}`,
        link: { text: '前往合规中心', to: '/compliance' },
      },
    ];
  }, [periodInvoices, monthSeries, invoices, anchor]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of periodInvoices) {
      const c = typeCategory(inv.invoiceType);
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodInvoices]);

  const handleLoadSample = async () => {
    await loadSampleData();
    await reload();
    showToast('已加载 12 张示例发票', 'jade');
  };

  if (loaded && invoices.length === 0) {
    return (
      <div>
        <ToastHost />
        <h1 className="font-serif text-[28px] font-bold leading-[36px] text-ink">汇总分析</h1>
        <EmptyState
          description="还没有可分析的数据。识别发票后，这里会自动生成汇总。"
          primaryLabel="前往工作台"
          secondaryLabel="加载示例发票"
          onSecondary={handleLoadSample}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastHost />

      {/* S1 页面头部 + 周期切换 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_QUINT }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-serif text-[28px] font-bold leading-[36px] text-ink">汇总分析</h1>
          <p className="mt-1 text-[13px] text-ink-faint">基于本机台账数据实时计算</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-cinnabar-line bg-warm-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'relative rounded-md px-3.5 py-1.5 text-[13px] transition-colors',
                  period === p.key ? 'text-white' : 'text-ink-soft hover:text-ink',
                )}
              >
                {period === p.key && (
                  <motion.span
                    layoutId="period-indicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-md bg-seal"
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              exportLedgerXlsx(periodInvoices);
              showToast(`台账已导出 · ${periodInvoices.length} 行`, 'jade');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
          >
            <FileDown size={14} /> 导出台账 Excel
          </button>
        </div>
      </motion.div>

      {/* S2 KPI 行 */}
      <KpiCards cards={kpiCards} />

      {/* S3 月度趋势 */}
      <TrendChart data={monthSeries} />

      {/* S4 双列 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TypeDonut data={typeData} />
        <StatusBars invoices={periodInvoices} />
      </div>

      {/* S5 销售方排行 */}
      <SellerRank invoices={periodInvoices} />

      {/* S6 归纳导出 */}
      <ExportBanner allInvoices={invoices} periodInvoices={periodInvoices} />
    </div>
  );
}
