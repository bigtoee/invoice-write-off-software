import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import CountUp from '@/components/ledger/CountUp';
import { EASE_OUT_QUINT } from '@/components/ledger/utils';
import { cn } from '@/lib/utils';

/** 近 6 月迷你折线（无坐标轴，描画动画） */
const Sparkline = memo(function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 76;
  const h = 32;
  const max = Math.max(...values, 1e-9);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE_OUT_QUINT }}
      />
    </svg>
  );
});

export interface KpiCardData {
  key: string;
  label: string;
  value: number;
  format: (n: number) => string;
  valueClass: string;
  sparkValues: number[];
  sparkColor: string;
  delta?: { text: string; up: boolean | null };
  footnote?: string;
  link?: { text: string; to: string };
}

interface KpiCardsProps {
  cards: KpiCardData[];
}

/** KPI 行：四张大卡 stagger 入场 + CountUp + sparkline */
export default function KpiCards({ cards }: KpiCardsProps) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT_QUINT }}
          className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium tracking-[0.04em] text-ink-faint">{c.label}</div>
            <Sparkline values={c.sparkValues} color={c.sparkColor} />
          </div>
          <CountUp
            value={c.value}
            duration={1000}
            format={c.format}
            className={cn('num mt-2 block text-[32px] font-semibold leading-[40px]', c.valueClass)}
          />
          <div className="mt-1 flex min-h-[18px] items-center gap-2 text-[12px]">
            {c.delta && (
              <span
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-1.5 py-0.5',
                  c.delta.up === true && 'bg-jade/10 text-jade',
                  c.delta.up === false && 'bg-seal/10 text-seal',
                  c.delta.up === null && 'bg-paper-deep text-ink-faint',
                )}
              >
                {c.delta.up === true && <ArrowUpRight size={11} />}
                {c.delta.up === false && <ArrowDownRight size={11} />}
                {c.delta.text}
              </span>
            )}
            {c.footnote && <span className="text-ink-faint">{c.footnote}</span>}
            {c.link && (
              <button
                onClick={() => navigate(c.link!.to)}
                className="flex items-center gap-0.5 text-seal hover:underline underline-offset-4"
              >
                {c.link.text} <ArrowRight size={11} />
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
