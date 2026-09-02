import { useEffect, useRef, useState } from 'react';
import { formatCNY } from '@/lib/validate';

/** 数字滚动 hook：easeOutQuint，rAF 驱动 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 5);
      const v = from + (target - from) * eased;
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

interface CountUpProps {
  value: number;
  duration?: number;
  /** 自定义格式化；默认 formatCNY */
  format?: (n: number) => string;
  className?: string;
}

export default function CountUp({ value, duration = 800, format, className }: CountUpProps) {
  const v = useCountUp(value, duration);
  return <span className={className}>{format ? format(v) : formatCNY(v)}</span>;
}
