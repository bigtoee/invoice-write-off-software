import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import type { Invoice } from '@/types/invoice';
import {
  EASE_OUT_QUINT,
  STATUS_HEX,
  STATUS_LIST,
  statusLabel,
} from '@/components/ledger/utils';

interface StatusBarsProps {
  invoices: Invoice[];
}

/** 状态分布横条图：条从左侧生长，点击跳台账并带状态筛选 */
export default function StatusBars({ invoices }: StatusBarsProps) {
  const navigate = useNavigate();
  const counts = STATUS_LIST.map((s) => ({
    status: s,
    count: invoices.filter((i) => i.status === s).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE_OUT_QUINT }}
      className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
    >
      <h3 className="text-[18px] font-bold text-ink">状态分布</h3>
      <div className="mt-5 space-y-4">
        {counts.map((c, i) => (
          <button
            key={c.status}
            onClick={() => navigate(`/ledger?status=${c.status}`)}
            className="group block w-full text-left"
            title={`查看全部「${statusLabel(c.status)}」发票`}
          >
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="text-ink transition-colors group-hover:text-seal">
                {statusLabel(c.status)}
              </span>
              <span className="num font-medium text-ink">{c.count} 张</span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded-full bg-paper-deep">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT_QUINT }}
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(c.count > 0 ? 3 : 0, (c.count / max) * 100)}%`,
                  backgroundColor: STATUS_HEX[c.status],
                  transformOrigin: 'left',
                }}
              />
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ink-faint">点击条目可跳转台账并自动套用状态筛选。</p>
    </motion.section>
  );
}
