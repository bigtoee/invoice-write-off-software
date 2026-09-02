import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCNY } from '@/lib/validate';
import { cn } from '@/lib/utils';
import { EASE_OUT_QUINT } from '@/components/ledger/utils';

export interface MonthPoint {
  month: string;
  totalAmount: number;
  taxAmount: number;
  count: number;
}

interface TrendTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value !== undefined);
  return (
    <div className="rounded-lg border border-cinnabar-line bg-warm-white px-3.5 py-2.5 shadow-overlay">
      <div className="num mb-1 text-[12px] font-semibold text-ink">{label}</div>
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="num flex items-center justify-between gap-6 text-[12px] text-ink-soft">
          <span>
            {p.dataKey === 'totalAmount' ? '价税合计' : p.dataKey === 'taxAmount' ? '税额' : '张数'}
          </span>
          <span className="font-medium text-ink">
            {p.dataKey === 'count' ? `${p.value} 张` : formatCNY(Number(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TrendChartProps {
  data: MonthPoint[];
}

/** 月度趋势组合图：金额柱（seal）+ 税额线（jade）+ 张数虚线（次轴） */
export default function TrendChart({ data }: TrendChartProps) {
  const [series, setSeries] = useState({ totalAmount: true, taxAmount: true, count: true });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chips = [
    { key: 'totalAmount' as const, label: '金额', color: '#C03F2B' },
    { key: 'taxAmount' as const, label: '税额', color: '#3E7A5E' },
    { key: 'count' as const, label: '张数', color: '#8A8378' },
  ];

  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE_OUT_QUINT }}
      className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[18px] font-bold text-ink">开票金额月度趋势</h3>
        <div className="flex items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setSeries((s) => ({ ...s, [c.key]: !s[c.key] }))}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-all active:scale-[0.97]',
                series[c.key]
                  ? 'border-cinnabar-line bg-paper-deep text-ink'
                  : 'border-cinnabar-line/60 text-ink-faint opacity-60',
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: series[c.key] ? c.color : '#D8D2C4' }}
              />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            onMouseMove={(s) => {
              const idx = (s as { activeTooltipIndex?: number }).activeTooltipIndex;
              setHoverIdx(typeof idx === 'number' ? idx : null);
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <CartesianGrid stroke="#E8E1D3" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#8A8378', fontFamily: 'IBM Plex Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#E8E1D3' }}
            />
            <YAxis
              yAxisId="amount"
              tick={{ fontSize: 11, fill: '#8A8378', fontFamily: 'IBM Plex Mono, monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v))}
              width={52}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 11, fill: '#8A8378', fontFamily: 'IBM Plex Mono, monospace' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(239,235,226,0.5)' }} />
            {series.totalAmount && (
              <Bar
                yAxisId="amount"
                dataKey="totalAmount"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={hoverIdx === i ? '#9E2F1F' : '#C03F2B'}
                    opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.4}
                  />
                ))}
              </Bar>
            )}
            {series.taxAmount && (
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="taxAmount"
                stroke="#3E7A5E"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3E7A5E', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                animationDuration={1000}
                animationBegin={300}
              />
            )}
            {series.count && (
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                stroke="#8A8378"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: '#8A8378', strokeWidth: 0 }}
                animationDuration={1000}
                animationBegin={500}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
