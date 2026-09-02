import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Stamp,
  Trash2,
} from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { formatCNY } from '@/lib/validate';
import SealBadge from '@/components/SealBadge';
import { cn } from '@/lib/utils';
import { EASE_OUT_QUINT, STATUS_TONE, getChecks, statusLabel, typeCategory } from './utils';

export type SortKey = 'invoiceDate' | 'totalAmount' | 'taxAmount' | 'invoiceNumber';
export type SortDir = 'asc' | 'desc';

/** 发票号码：点击复制，复制后 ✓ 0.8s */
function CopyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="点击复制发票号码"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 800);
      }}
      className="group/copy flex items-center gap-1 font-mono text-[13px] text-ink hover:text-seal"
    >
      {value}
      {copied ? (
        <Check size={12} className="text-jade" />
      ) : (
        <Copy size={12} className="text-ink-faint opacity-0 transition-opacity group-hover/copy:opacity-100" />
      )}
    </button>
  );
}

/** 校验三圆点：勾稽 / 税号 / 查重 */
function CheckDots({ inv }: { inv: Invoice }) {
  const c = getChecks(inv);
  const dots = [
    { ok: c.recon, label: `勾稽${c.recon ? '通过' : '不符'}` },
    { ok: c.taxId, label: `税号${c.taxId ? '合规' : '异常'}` },
    { ok: c.dup, label: c.dup ? '查重通过' : '号码重复' },
  ];
  return (
    <span className="flex items-center justify-center gap-1.5" title={dots.map((d) => d.label).join(' · ')}>
      {dots.map((d, i) => (
        <span key={i} className={cn('h-2 w-2 rounded-full', d.ok ? 'bg-jade' : 'bg-amber')} />
      ))}
    </span>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <th className={cn(align === 'right' && 'text-right')}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 text-[12px] font-medium tracking-[0.04em]',
          active ? 'text-seal' : 'text-ink-faint hover:text-ink',
        )}
      >
        {label}
        <ArrowDown
          size={12}
          className={cn(
            'transition-transform duration-200',
            active ? 'opacity-100' : 'opacity-30',
            active && sort.dir === 'asc' && 'rotate-180',
          )}
        />
      </button>
    </th>
  );
}

interface LedgerTableProps {
  rows: Invoice[];
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (inv: Invoice) => void;
  onDelete: (inv: Invoice) => void;
  onMarkReimbursed: (inv: Invoice) => void;
  activeId?: string;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  totalCount: number;
}

export default function LedgerTable({
  rows,
  sort,
  onSort,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onDelete,
  onMarkReimbursed,
  activeId,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
}: LedgerTableProps) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  // 页码窗口
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  for (let p = start; p <= Math.min(pageCount, start + 4); p++) pages.push(p);

  return (
    <div className="overflow-hidden rounded-xl border border-cinnabar-line bg-warm-white shadow-card">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[1080px]">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  className="h-4 w-4 accent-[#C03F2B]"
                  aria-label="全选本页"
                />
              </th>
              <th className="w-[72px] text-center">状态</th>
              <th className="w-[170px]">
                <SortableTh label="发票号码" sortKey="invoiceNumber" sort={sort} onSort={onSort} />
              </th>
              <th className="w-[110px]">
                <SortableTh label="开票日期" sortKey="invoiceDate" sort={sort} onSort={onSort} />
              </th>
              <th>购买方</th>
              <th>销售方</th>
              <th className="w-[130px] text-right">
                <SortableTh label="价税合计" sortKey="totalAmount" sort={sort} onSort={onSort} align="right" />
              </th>
              <th className="w-[110px] text-right">
                <SortableTh label="税额" sortKey="taxAmount" sort={sort} onSort={onSort} align="right" />
              </th>
              <th className="w-[88px] text-center">校验</th>
              <th className="w-[110px]">类型</th>
              <th className="w-[110px] text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv, idx) => {
              const isDup = !getChecks(inv).dup;
              return (
                <motion.tr
                  key={inv.id}
                  initial={idx < 20 ? { y: 12, opacity: 0 } : false}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: idx < 20 ? idx * 0.03 : 0, ease: EASE_OUT_QUINT }}
                  onClick={() => onOpen(inv)}
                  className={cn(
                    'group cursor-pointer',
                    activeId === inv.id && 'outline outline-1 -outline-offset-1 outline-seal/60',
                  )}
                >
                  <td className={cn('text-center', isDup && 'shadow-[inset_3px_0_0_#B97E1E]')}>
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => onToggle(inv.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-[#C03F2B]"
                      aria-label="选择发票"
                    />
                  </td>
                  <td className="text-center">
                    <SealBadge tone={STATUS_TONE[inv.status]}>{statusLabel(inv.status)}</SealBadge>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <CopyNumber value={inv.invoiceNumber} />
                      {isDup && (
                        <span className="rounded-[3px] border border-amber/60 bg-amber/5 px-1 text-[10px] font-semibold text-amber">
                          重
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="num text-[13px] text-ink-soft">{inv.invoiceDate}</td>
                  <td>
                    <div className="max-w-[220px]">
                      <div className="truncate text-[13px] font-medium text-ink">{inv.buyerName}</div>
                      <div className="num truncate text-[11px] text-ink-faint">{inv.buyerTaxId}</div>
                    </div>
                  </td>
                  <td>
                    <div className="max-w-[220px]">
                      <div className="truncate text-[13px] font-medium text-ink">{inv.sellerName}</div>
                      <div className="num truncate text-[11px] text-ink-faint">{inv.sellerTaxId}</div>
                    </div>
                  </td>
                  <td className="num text-right text-[14px] font-semibold text-seal">
                    {formatCNY(inv.totalAmount)}
                  </td>
                  <td className="num text-right text-[13px] text-ink-soft">
                    {formatCNY(inv.taxAmount)}
                  </td>
                  <td>
                    <CheckDots inv={inv} />
                  </td>
                  <td>
                    <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[12px] text-ink-soft">
                      {typeCategory(inv.invoiceType)}
                    </span>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <button
                        title="查看详情"
                        onClick={() => onOpen(inv)}
                        className="rounded-md p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="标记已报销"
                        onClick={() => onMarkReimbursed(inv)}
                        className="rounded-md p-1.5 text-ink-faint hover:bg-paper-deep hover:text-jade"
                      >
                        <Stamp size={15} />
                      </button>
                      <button
                        title="移出台账"
                        onClick={() => onDelete(inv)}
                        className="rounded-md p-1.5 text-ink-faint hover:bg-paper-deep hover:text-seal"
                      >
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cinnabar-line px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] text-ink-faint">
          <span>每页</span>
          {[20, 50, 100].map((s) => (
            <button
              key={s}
              onClick={() => onPageSizeChange(s)}
              className={cn(
                'num rounded-md px-2 py-1 transition-colors',
                pageSize === s ? 'bg-seal/10 text-seal' : 'hover:bg-paper-deep',
              )}
            >
              {s}
            </button>
          ))}
          <span className="num ml-2">共 {totalCount} 张</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-paper-deep disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft size={16} />
          </button>
          {start > 1 && <span className="px-1 text-[12px] text-ink-faint">…</span>}
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'num h-7 min-w-7 rounded-md px-1.5 text-[12px] transition-colors',
                p === page ? 'bg-seal text-white' : 'text-ink-soft hover:bg-paper-deep',
              )}
            >
              {p}
            </button>
          ))}
          {pages[pages.length - 1] < pageCount && (
            <span className="px-1 text-[12px] text-ink-faint">…</span>
          )}
          <button
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md p-1.5 text-ink-soft transition-colors hover:bg-paper-deep disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
