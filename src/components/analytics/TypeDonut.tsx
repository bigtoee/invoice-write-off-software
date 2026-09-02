import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, EASE_OUT_QUINT } from '@/components/ledger/utils';
import { cn } from '@/lib/utils';

export interface TypeSlice {
  name: string;
  count: number;
}

interface TypeDonutProps {
  data: TypeSlice[];
}

/** 发票类型构成：环形图 + 右侧图例（hover 扇区放大、其余淡出） */
export default function TypeDonut({ data }: TypeDonutProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const visible = data.filter((d) => d.count > 0);

  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE_OUT_QUINT }}
      className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
    >
      <h3 className="text-[18px] font-bold text-ink">发票类型构成</h3>
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-[220px] w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="count"
                nameKey="name"
                innerRadius="60%"
                outerRadius="88%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                animationDuration={800}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                {visible.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                    transform={activeIdx === i ? 'scale(1.04)' : undefined}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-[28px] font-semibold leading-[32px] text-ink">{total}</span>
            <span className="text-[12px] text-ink-faint">张</span>
          </div>
        </div>
        <ul className="w-full flex-1 space-y-1.5">
          {visible.map((d, i) => {
            const pct = total > 0 ? (d.count / total) * 100 : 0;
            return (
              <li
                key={d.name}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className={cn(
                  'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all',
                  activeIdx === i && 'bg-paper-deep',
                  activeIdx !== null && activeIdx !== i && 'opacity-50',
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="flex-1 text-[13px] text-ink">{d.name}</span>
                <span className="num text-[13px] font-medium text-ink">{d.count} 张</span>
                <span className="num w-[52px] text-right text-[12px] text-ink-faint">
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}
