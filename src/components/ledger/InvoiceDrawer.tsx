import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCheck2,
  FileWarning,
  Trash2,
  X,
} from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { formatCNY } from '@/lib/validate';
import { exportLedgerXlsx } from '@/lib/export';
import SealBadge from '@/components/SealBadge';
import { cn } from '@/lib/utils';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from './Toast';
import {
  EASE_OUT_QUINT,
  STATUS_LIST,
  STATUS_TONE,
  formatDateTime,
  getChecks,
  hasXmlArchive,
  statusLabel,
  typeCategory,
} from './utils';

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-cinnabar-line/70 bg-white px-3 py-2.5">
      <div className="text-[11px] font-medium tracking-[0.04em] text-ink-faint">{label}</div>
      <div className={cn('mt-0.5 break-all text-[13px] text-ink', mono && 'num')}>{value || '—'}</div>
    </div>
  );
}

interface InvoiceDrawerProps {
  invoice: Invoice | null;
  onClose: () => void;
  onStatusChange: (id: string, status: Invoice['status']) => void;
  onDelete: (inv: Invoice) => void;
}

/** 发票详情抽屉：右侧 560px spring 滑入，只读优先 + 状态管理 */
export default function InvoiceDrawer({ invoice, onClose, onStatusChange, onDelete }: InvoiceDrawerProps) {
  const [itemsOpen, setItemsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Invoice['status'] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inv = invoice;

  const requestStatus = (s: Invoice['status']) => {
    if (!inv || s === inv.status) return;
    if (s === 'red-flush' || s === 'void') {
      setPendingStatus(s);
    } else {
      onStatusChange(inv.id, s);
    }
  };

  return (
    <AnimatePresence>
      {inv && (
        <>
          <motion.div
            key="mask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[rgba(30,27,22,0.4)]"
          />
          <motion.aside
            key="panel"
            initial={{ x: 560 }}
            animate={{ x: 0 }}
            exit={{ x: 560 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full flex-col bg-warm-white shadow-overlay sm:w-[560px]"
          >
            {/* 头部 */}
            <div className="flex items-start justify-between border-b border-cinnabar-line px-6 py-5">
              <div className="flex items-center gap-3">
                <SealBadge tone={STATUS_TONE[inv.status]} className="text-[14px]">
                  {statusLabel(inv.status)}
                </SealBadge>
                <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[12px] text-ink-soft">
                  {typeCategory(inv.invoiceType)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 border-b border-cinnabar-line px-6 py-3">
              <span className="num text-[16px] font-semibold text-ink">No. {inv.invoiceNumber}</span>
              <button
                title="复制发票号码"
                onClick={() => {
                  navigator.clipboard?.writeText(inv.invoiceNumber).catch(() => undefined);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 800);
                }}
                className="rounded-md p-1 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
              >
                {copied ? <Check size={14} className="text-jade" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* 金额横幅 */}
              <div className="bg-paper-deep px-6 py-5 text-center">
                <div className="num text-[24px] font-semibold text-seal">{formatCNY(inv.totalAmount)}</div>
                <div className="num mt-1 text-[12px] text-ink-faint">
                  金额 {formatCNY(inv.amount)} · 税额 {formatCNY(inv.taxAmount)}
                </div>
              </div>

              {/* 票面要素 */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.03 } } }}
                className="grid grid-cols-2 gap-2.5 px-6 py-5"
              >
                {(
                  [
                    { label: '开票日期', value: inv.invoiceDate, mono: true },
                    { label: '发票类型', value: inv.invoiceType },
                    { label: '发票代码', value: inv.invoiceCode ?? '', mono: true },
                    { label: '校验码', value: inv.checkCode ?? '', mono: true },
                    { label: '购买方名称', value: inv.buyerName },
                    { label: '购买方税号', value: inv.buyerTaxId, mono: true },
                    { label: '销售方名称', value: inv.sellerName },
                    { label: '销售方税号', value: inv.sellerTaxId, mono: true },
                    { label: '备注', value: inv.remark ?? '' },
                    { label: '来源文件', value: inv.sourceFile ?? '' },
                  ] as const
                ).map((f) => (
                  <motion.div
                    key={f.label}
                    variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                    transition={{ duration: 0.25, ease: EASE_OUT_QUINT }}
                  >
                    <Field label={f.label} value={f.value} mono={'mono' in f && f.mono} />
                  </motion.div>
                ))}
              </motion.div>

              {/* 商品明细（折叠） */}
              <div className="border-t border-cinnabar-line px-6 py-4">
                <button
                  onClick={() => setItemsOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-[13px] font-medium text-ink"
                >
                  商品明细（{inv.items?.length ?? 0} 项）
                  <ChevronDown
                    size={16}
                    className={cn('text-ink-faint transition-transform duration-200', itemsOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {itemsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_OUT_QUINT }}
                      className="overflow-hidden"
                    >
                      {(inv.items?.length ?? 0) > 0 ? (
                        <table className="data-table mt-3">
                          <thead>
                            <tr>
                              <th>名称</th>
                              <th className="w-[90px]">规格</th>
                              <th className="num w-[64px]">数量</th>
                              <th className="num w-[90px]">单价</th>
                              <th className="num w-[64px]">税率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items!.map((it, i) => (
                              <tr key={i}>
                                <td className="text-[12px]">{it.name}</td>
                                <td className="text-[12px] text-ink-soft">{it.spec ?? '—'}</td>
                                <td className="num text-[12px]">{it.quantity ?? '—'}</td>
                                <td className="num text-[12px]">
                                  {typeof it.unitPrice === 'number' ? formatCNY(it.unitPrice) : '—'}
                                </td>
                                <td className="num text-[12px]">
                                  {typeof it.taxRate === 'number' ? `${Math.round(it.taxRate * 100)}%` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="mt-3 text-[12px] text-ink-faint">该发票未识别到商品明细。</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 合规信息 */}
              <div className="border-t border-cinnabar-line px-6 py-4">
                <div className="mb-3 text-[13px] font-medium text-ink">合规信息</div>
                <div className="space-y-2">
                  {(() => {
                    const c = getChecks(inv);
                    const rows = [
                      { ok: c.recon, label: c.recon ? '要素勾稽通过' : '价税合计与金额+税额不符' },
                      { ok: c.taxId, label: c.taxId ? '税号格式合规' : '税号格式异常' },
                      { ok: c.dup, label: c.dup ? '查重通过' : '与已有发票号码重复' },
                    ];
                    return rows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[13px]">
                        <span className={cn('h-2 w-2 rounded-full', r.ok ? 'bg-jade' : 'bg-amber')} />
                        <span className={r.ok ? 'text-ink-soft' : 'font-medium text-amber'}>{r.label}</span>
                      </div>
                    ));
                  })()}
                  {(inv.validationIssues ?? []).map((issue, i) => (
                    <div key={`issue-${i}`} className="text-[12px] text-amber">
                      · {issue}
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-cinnabar-line/70 pt-3 text-[12px] text-ink-faint">
                    <span>入库时间</span>
                    <span className="num">{formatDateTime(inv.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-ink-faint">XML 归档</span>
                    {hasXmlArchive(inv) ? (
                      <span className="flex items-center gap-1 text-jade">
                        <FileCheck2 size={13} /> 已存 XML
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber">
                        <FileWarning size={13} /> 缺 XML（财会〔2020〕6 号要求归档）
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 状态操作 */}
              <div className="border-t border-cinnabar-line px-6 py-4">
                <div className="mb-3 text-[13px] font-medium text-ink">状态标记</div>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_LIST.map((s) => (
                    <button
                      key={s}
                      onClick={() => requestStatus(s)}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-[13px] transition-all active:scale-[0.97]',
                        inv.status === s
                          ? 'border-seal bg-seal text-white'
                          : 'border-cinnabar-line bg-white text-ink-soft hover:bg-paper-deep',
                      )}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between border-t border-cinnabar-line bg-paper px-6 py-4">
              <button
                onClick={() => {
                  exportLedgerXlsx([inv]);
                  showToast('已导出此张发票 · 1 行', 'jade');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-4 py-2 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                <Download size={14} /> 导出此张（Excel 行）
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg border border-seal/60 px-4 py-2 text-[13px] text-seal transition-colors hover:bg-seal/5 active:scale-[0.97]"
              >
                <Trash2 size={14} /> 移出台账
              </button>
            </div>

            {/* 红冲/作废二次确认 */}
            <ConfirmDialog
              open={pendingStatus !== null}
              onOpenChange={(o) => !o && setPendingStatus(null)}
              title={pendingStatus === 'red-flush' ? '确认标记为红冲？' : '确认标记为作废？'}
              description="该操作将标记发票状态，台账保留记录，可随时改回。"
              confirmLabel="标记"
              onConfirm={() => {
                if (inv && pendingStatus) onStatusChange(inv.id, pendingStatus);
                setPendingStatus(null);
              }}
            />
            {/* 删除确认 */}
            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title="确认移出 1 张发票？"
              description="此操作仅从本机浏览器删除，不可恢复。建议先导出 Excel 备份。"
              confirmLabel="移出"
              onConfirm={() => {
                onDelete(inv);
                onClose();
              }}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
