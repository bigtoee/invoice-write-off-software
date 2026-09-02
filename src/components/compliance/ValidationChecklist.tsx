import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import SealBadge from '@/components/SealBadge';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';

interface ValidationChecklistProps {
  invoices: Invoice[];
  /** id → validateInvoice 返回的问题列表 */
  issueMap: Map<string, string[]>;
}

interface Row {
  inv: Invoice;
  reconIssues: string[]; // 勾稽
  taxIssues: string[]; // 税号
  otherIssues: string[]; // 缺失 / 重复等
}

function isRecon(msg: string): boolean {
  return msg.includes('价税合计') || msg.includes('尾差');
}
function isTax(msg: string): boolean {
  return msg.includes('税号');
}

function Cell({ issues, okText }: { issues: string[]; okText: string }) {
  if (issues.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-jade">
        <Check size={14} strokeWidth={3} />
        <span className="text-[12px]">{okText}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber" title={issues.join('\n')}>
      <motion.span
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.35, 1] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="inline-flex"
      >
        <X size={14} strokeWidth={3} />
      </motion.span>
      <span className="max-w-[220px] truncate text-[12px]">{issues[0]}</span>
    </span>
  );
}

/** S3 要素勾稽与格式校验清单：逐张跑 validateInvoice，可筛选仅异常。 */
export default function ValidationChecklist({ invoices, issueMap }: ValidationChecklistProps) {
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const rows: Row[] = useMemo(
    () =>
      invoices.map((inv) => {
        const issues = issueMap.get(inv.id) ?? [];
        return {
          inv,
          reconIssues: issues.filter(isRecon),
          taxIssues: issues.filter(isTax),
          otherIssues: issues.filter((m) => !isRecon(m) && !isTax(m)),
        };
      }),
    [invoices, issueMap],
  );

  const abnormalCount = rows.filter((r) => r.reconIssues.length + r.taxIssues.length + r.otherIssues.length > 0).length;
  const shown = onlyAbnormal ? rows.filter((r) => r.reconIssues.length + r.taxIssues.length + r.otherIssues.length > 0) : rows;

  return (
    <section id="sec-validate" className="scroll-mt-24 rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-[20px] font-bold text-ink">要素勾稽与格式校验</h2>
          {abnormalCount > 0 ? (
            <SealBadge tone="amber" flat>
              {abnormalCount} 张异常
            </SealBadge>
          ) : (
            <SealBadge tone="jade" flat>
              全部通过
            </SealBadge>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['全部', '仅异常'] as const).map((label) => {
            const active = (label === '仅异常') === onlyAbnormal;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setOnlyAbnormal(label === '仅异常')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97]',
                  active ? 'bg-seal text-white' : 'border border-cinnabar-line text-ink-soft hover:bg-paper-deep',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mb-4 text-[13px] text-ink-faint">
        价税合计 = 金额 + 税额（±0.01 尾差容许）；税号为 15/18/20 位统一社会信用代码。
      </p>

      <div className="overflow-x-auto rounded-lg border border-cinnabar-line">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-cinnabar-line bg-paper-deep text-left">
              <th className="px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink-faint">发票号码</th>
              <th className="px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink-faint">勾稽校验</th>
              <th className="px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink-faint">税号格式</th>
              <th className="px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink-faint">结果</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-ink-faint">
                  {onlyAbnormal ? '没有异常的发票' : '台账暂无发票'}
                </td>
              </tr>
            )}
            {shown.map((row, i) => {
              const total = row.reconIssues.length + row.taxIssues.length + row.otherIssues.length;
              const allIssues = [...row.reconIssues, ...row.taxIssues, ...row.otherIssues];
              return (
                <motion.tr
                  key={row.inv.id}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.03 }}
                  className={cn(
                    'border-b border-cinnabar-line last:border-0',
                    i % 2 === 1 ? 'bg-paper-deep/50' : 'bg-warm-white',
                    total > 0 && 'border-l-[3px] border-l-amber',
                  )}
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-ink">{row.inv.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <Cell issues={row.reconIssues} okText="勾稽相符" />
                  </td>
                  <td className="px-4 py-3">
                    <Cell issues={row.taxIssues} okText="格式正确" />
                  </td>
                  <td className="px-4 py-3" title={allIssues.join('\n')}>
                    {total === 0 ? (
                      <SealBadge tone="jade" flat>
                        通过
                      </SealBadge>
                    ) : (
                      <SealBadge tone="amber" flat>
                        {total} 项异常
                      </SealBadge>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-ink-faint">校验规则内置本机，随台账变动自动重检 · 规则版本 v2026.08</p>
    </section>
  );
}
