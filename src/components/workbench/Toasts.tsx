import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'jade' | 'amber' | 'seal';

interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

const TONE_STYLE: Record<ToastTone, string> = {
  jade: 'border-jade/40 text-jade',
  amber: 'border-amber/40 text-amber',
  seal: 'border-seal/40 text-seal',
};

const TONE_ICON = { jade: CheckCircle2, amber: AlertTriangle, seal: XCircle };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((tone: ToastTone, text: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const node = (
    <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto flex items-center gap-2 rounded-lg border bg-warm-white px-3.5 py-2.5 text-[13px] shadow-overlay',
                TONE_STYLE[t.tone],
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-ink">{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { push, node };
}
