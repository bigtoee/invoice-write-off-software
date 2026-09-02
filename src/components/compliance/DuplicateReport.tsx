import { motion, AnimatePresence } from 'framer-motion';
import { CopyCheck, BookmarkCheck, Trash2, Users } from 'lucide-react';
import SealBadge from '@/components/SealBadge';
import { formatCNY } from '@/lib/validate';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';

interface DuplicateReportProps {
  groups: Invoice[][];
  /** 保留组内某一张，删除其余 */
  onKeepOne: (group: Invoice[], keep: Invoice) => void;
  /** 把某一张移出台账 */
  onRemove: (group: Invoice[], inv: Invoice) => void;
  /** 人工确认：全部保留（清除重复标记） */
  onKeepAll: (group: Invoice[]) => void;
}

interface CompareField {
  label: string;
  mono?: boolean;
  get: (inv: Invoice) => string;
}

const FIELDS: CompareField[] = [
  { label: '来源文件', get: (i) => i.sourceFile ?? '—' },
  {
    label: '上传时间',
    mono: true,
    get: (i) =>
      new Date(i.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  { label: '价税合计', mono: true, get: (i) => formatCNY(i.totalAmount) },
  { label: '销售方', get: (i) => i.sellerName || '—' },
];

/** S2 发票查重报告：同号发票并排对比，逐项处理销号。 */
export default function DuplicateReport({ groups, onKeepOne, onRemove, onKeepAll }: DuplicateReportProps) {
  return (
    <section id="sec-dup" className="scroll-mt-24 rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-[20px] font-bold text-ink">发票查重报告</h2>
        {groups.length > 0 ? (
          <SealBadge tone="amber" flat>
            {groups.length} 组重复
          </SealBadge>
        ) : (
          <SealBadge tone="jade" flat>
            无重复
          </SealBadge>
        )}
      </div>
      <p className="mb-5 text-[13px] text-ink-faint">
        发票号码唯一约束：同一号码重复入库即时拦截并标记，防止重复报销。
      </p>

      {groups.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-jade/[0.05] px-4 py-3.5 text-[13px] text-jade">
          <CopyCheck size={16} />
          台账内未发现重复号码的发票。
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {groups.map((group, gi) => {
              const number = group[0]?.invoiceNumber ?? '';
              return (
                <motion.div
                  key={number + String(gi)}
                  layout="position"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ x: 60, opacity: 0, transition: { duration: 0.35 } }}
                  transition={{ duration: 0.5, delay: gi * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-lg border border-cinnabar-line border-l-[3px] border-l-amber bg-paper p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[15px] font-medium tabular-nums text-ink">{number}</span>
                    <SealBadge tone="amber" flat>
                      重复 {group.length} 次
                    </SealBadge>
                  </div>

                  <div className={cn('grid gap-3', group.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
                    {group.map((inv) => (
                      <div key={inv.id} className="rounded-lg border border-cinnabar-line bg-warm-white p-3.5">
                        <dl className="space-y-1.5">
                          {FIELDS.map((f) => {
                            const values = group.map((g) => f.get(g));
                            const differ = new Set(values).size > 1;
                            return (
                              <div key={f.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                                <dt className="shrink-0 text-[12px] text-ink-faint">{f.label}</dt>
                                <dd
                                  className={cn(
                                    'truncate text-right',
                                    f.mono && 'font-mono tabular-nums',
                                    differ && 'rounded bg-amber/15 px-1.5 text-amber',
                                  )}
                                  title={f.get(inv)}
                                >
                                  {f.get(inv)}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                        <div className="mt-3 flex gap-2 border-t border-cinnabar-line pt-3">
                          <button
                            type="button"
                            onClick={() => onKeepOne(group, inv)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-jade px-2.5 py-1.5 text-[12px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.97]"
                          >
                            <BookmarkCheck size={13} /> 保留此张
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemove(group, inv)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-seal/40 px-2.5 py-1.5 text-[12px] font-medium text-seal transition-all hover:bg-seal/5 active:scale-[0.97]"
                          >
                            <Trash2 size={13} /> 移出重复
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onKeepAll(group)}
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
                    >
                      <Users size={13} />
                      {group.length === 2 ? '两张都保留（人工确认）' : '全部保留（人工确认）'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
