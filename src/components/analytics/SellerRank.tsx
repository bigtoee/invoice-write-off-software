import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Invoice } from '@/types/invoice';
import { formatCNY } from '@/lib/validate';
import { cn } from '@/lib/utils';
import { EASE_OUT_QUINT } from '@/components/ledger/utils';

interface SellerAgg {
  name: string;
  taxId: string;
  count: number;
  amount: number;
}

const RANK_BADGE = ['bg-seal text-white', 'bg-jade text-white', 'bg-amber text-white'];

interface SellerRankProps {
  invoices: Invoice[];
}

/** 往来销售方排行 Top10（按价税合计），超出折叠展开 */
export default function SellerRank({ invoices }: SellerRankProps) {
  const [expanded, setExpanded] = useState(false);

  const sellers = useMemo(() => {
    const map = new Map<string, SellerAgg>();
    for (const inv of invoices) {
      const key = inv.sellerTaxId || inv.sellerName;
      const cur = map.get(key) ?? { name: inv.sellerName, taxId: inv.sellerTaxId, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += inv.totalAmount;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  const topAmount = sellers[0]?.amount || 1;
  const shown = expanded ? sellers : sellers.slice(0, 10);

  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE_OUT_QUINT }}
      className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[18px] font-bold text-ink">往来销售方排行</h3>
        <span className="text-[12px] text-ink-faint">按价税合计 · 共 {sellers.length} 家</span>
      </div>

      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {shown.map((s, i) => (
            <motion.div
              key={s.taxId || s.name}
              initial={{ x: -24, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.06, ease: EASE_OUT_QUINT }}
              className="grid grid-cols-[36px_minmax(0,1fr)_64px_130px] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-paper-deep"
            >
              <span
                className={cn(
                  'num flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold',
                  i < 3 ? RANK_BADGE[i] : 'text-ink-faint',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                <span className="num block truncate text-[11px] text-ink-faint">{s.taxId}</span>
              </span>
              <span className="num text-right text-[12px] text-ink-soft">{s.count} 张</span>
              <span className="text-right">
                <span className="num block text-[13px] font-semibold text-ink">{formatCNY(s.amount)}</span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                  <motion.span
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 + Math.min(i, 12) * 0.06, ease: EASE_OUT_QUINT }}
                    className="block h-full rounded-full bg-seal/30"
                    style={{ width: `${(s.amount / topAmount) * 100}%`, transformOrigin: 'left' }}
                  />
                </span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sellers.length > 10 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[13px] text-seal underline-offset-4 hover:underline"
        >
          {expanded ? '收起' : `展开全部 ${sellers.length} 家`}
        </button>
      )}
    </motion.section>
  );
}
