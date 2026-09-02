import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HealthOverviewItem {
  key: string;
  label: string;
  ok: boolean;
  text: string;
  /** 锚点区块 id，点击滚动 */
  target: string;
}

interface HealthBannerProps {
  score: number;
  items: HealthOverviewItem[];
}

/** 健康度分值对应的状态色（jade ≥90 / amber 70-89 / seal <70） */
export function scoreColor(score: number): string {
  if (score >= 90) return '#3E7A5E';
  if (score >= 70) return '#B97E1E';
  return '#C03F2B';
}

function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

const R = 64;
const CIRC = 2 * Math.PI * R;

/** S1 合规健康度横幅：SVG 圆环仪表 + 四项检查概览小卡（点击锚点滚动）。 */
export default function HealthBanner({ score, items }: HealthBannerProps) {
  const color = scoreColor(score);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card md:flex-row md:items-center md:gap-10 md:p-8">
      {/* 环形仪表 */}
      <div className="relative mx-auto h-[160px] w-[160px] shrink-0 md:mx-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="#EFEBE2" strokeWidth="10" />
          <motion.circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            whileInView={{ strokeDashoffset: CIRC * (1 - score / 100) }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[40px] font-semibold leading-none tabular-nums" style={{ color }}>
            <CountUp value={score} />
          </span>
          <span className="mt-1.5 text-[12px] font-medium text-ink-faint">合规健康度</span>
        </div>
      </div>

      {/* 四项检查概览 */}
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.button
            key={item.key}
            type="button"
            onClick={() => document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-cinnabar-line px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-card',
              item.ok ? 'bg-jade/[0.04]' : 'bg-amber/[0.05]',
            )}
          >
            {item.ok ? (
              <CheckCircle2 size={20} className="shrink-0 text-jade" />
            ) : (
              <AlertTriangle size={20} className="shrink-0 text-amber" />
            )}
            <span>
              <span className="block text-[13px] font-medium text-ink">{item.label}</span>
              <span className={cn('block text-[12px]', item.ok ? 'text-jade' : 'text-amber')}>{item.text}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
