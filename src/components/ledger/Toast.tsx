import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { EASE_OUT_QUINT } from './utils';

type ToastTone = 'jade' | 'seal' | 'amber';

interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
}

const EVENT = 'invoicecore-toast';

/** 触发全局轻提示（右上角滑入，4s 自动消失） */
export function showToast(text: string, tone: ToastTone = 'jade'): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, tone } }));
}

const TONE_STYLE: Record<ToastTone, { icon: typeof CheckCircle2; cls: string }> = {
  jade: { icon: CheckCircle2, cls: 'border-jade/40 text-jade' },
  seal: { icon: XCircle, cls: 'border-seal/40 text-seal' },
  amber: { icon: AlertTriangle, cls: 'border-amber/40 text-amber' },
};

/** 挂载于页面顶部的 Toast 容器 */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { text, tone } = (e as CustomEvent<{ text: string; tone: ToastTone }>).detail;
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { id, text, tone }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[90] flex flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => {
          const { icon: Icon, cls } = TONE_STYLE[t.tone];
          return (
            <motion.div
              key={t.id}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT_QUINT }}
              className={`pointer-events-auto flex items-center gap-2 rounded-lg border bg-warm-white px-4 py-2.5 text-[13px] shadow-overlay ${cls}`}
            >
              <Icon size={16} />
              <span className="text-ink">{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
