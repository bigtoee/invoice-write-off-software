import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, CheckCircle2, XCircle, AlertTriangle, ChevronDown, RotateCw,
  PenLine, Stamp, ZoomIn, Trash2, Plus, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { validateInvoice } from '@/lib/validate';
import SealBadge from '@/components/SealBadge';
import type { QueueItem } from './queue-types';
import { draftFromResult, draftToInvoice, parseNum, type DraftFields } from './draft';

interface Check {
  label: string;
  pass: boolean;
  detail: string;
}

function buildChecks(issues: string[]): Check[] {
  const has = (kw: string) => issues.some((i) => i.includes(kw));
  const find = (kw: string) => issues.find((i) => i.includes(kw));
  return [
    {
      label: '必填要素完整',
      pass: !has('缺失'),
      detail: find('缺失') ?? '发票号码、日期、购销双方、价税合计齐全',
    },
    {
      label: '勾稽校验（价税合计 = 金额 + 税额）',
      pass: !has('尾差'),
      detail: find('尾差') ?? '价税合计与金额+税额一致（±0.01 内）',
    },
    {
      label: '税号格式（15/18/20 位）',
      pass: !has('税号格式'),
      detail: find('税号格式') ?? '购销双方统一社会信用代码格式正确',
    },
    {
      label: '查重校验',
      pass: !has('重复'),
      detail: find('重复') ?? '发票号码未与台账已有发票重复',
    },
  ];
}

/** 将校验问题映射到字段，用于 FieldCard 左侧 amber 竖条 */
function fieldHasIssue(field: keyof DraftFields, issues: string[]): boolean {
  const map: Array<[keyof DraftFields, string[]]> = [
    ['invoiceNumber', ['发票号码', '重复']],
    ['invoiceDate', ['开票日期']],
    ['buyerName', ['购买方名称']],
    ['sellerName', ['销售方名称']],
    ['buyerTaxId', ['购买方税号']],
    ['sellerTaxId', ['销售方税号']],
    ['totalAmount', ['价税合计', '尾差']],
    ['amount', ['尾差']],
    ['taxAmount', ['尾差']],
    ['invoiceType', ['发票类型']],
  ];
  const kws = map.find(([k]) => k === field)?.[1] ?? [];
  return issues.some((i) => kws.some((kw) => i.includes(kw)));
}

interface FieldCardProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  strong?: boolean;
  warn?: boolean;
  placeholder?: string;
  list?: string;
}

function FieldCard({ label, value, onChange, mono, strong, warn, placeholder, list }: FieldCardProps) {
  return (
    <motion.label
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative block rounded-lg border bg-warm-white px-3 py-2',
        warn ? 'border-amber/40' : 'border-cinnabar-line',
      )}
    >
      {warn && (
        <motion.span
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] origin-top rounded-full bg-amber"
        />
      )}
      <span className="block text-[12px] font-medium leading-[18px] text-ink-faint">{label}</span>
      <input
        value={value}
        list={list}
        placeholder={placeholder ?? '待补录'}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-0.5 w-full bg-transparent text-[14px] leading-[22px] text-ink outline-none placeholder:text-ink-faint/60',
          mono && 'num',
          strong && 'num text-[18px] font-semibold text-seal',
        )}
      />
    </motion.label>
  );
}

interface ConfirmDrawerProps {
  item: QueueItem | null;
  existing: Invoice[];
  onClose: () => void;
  onArchive: (id: string, draft: DraftFields, issues: string[]) => void;
  onMarkPending: (id: string, draft: DraftFields) => void;
  onRetry: (id: string) => void;
}

export default function ConfirmDrawer({ item, existing, onClose, onArchive, onMarkPending, onRetry }: ConfirmDrawerProps) {
  const [draft, setDraft] = useState<DraftFields | null>(null);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const [archived, setArchived] = useState(false);

  // 仅在切换目标文件时重建草稿；识别进度等队列更新不打断编辑
  const itemRef = useRef(item);
  useEffect(() => {
    itemRef.current = item;
  }, [item]);
  const itemId = item?.id;
  useEffect(() => {
    const cur = itemRef.current;
    if (cur) {
      setDraft(draftFromResult(cur));
      setArchived(false);
      setItemsOpen((cur.result?.items?.length ?? 0) > 0);
    } else {
      setDraft(null);
    }
  }, [itemId]);

  const issues = useMemo(() => {
    if (!draft || !item) return [];
    return validateInvoice(draftToInvoice(draft, item.name), existing);
  }, [draft, item, existing]);

  const checks = useMemo(() => buildChecks(issues), [issues]);

  const set = (patch: Partial<DraftFields>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const setItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setDraft((d) =>
      d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : d,
    );

  const handleArchive = () => {
    if (!item || !draft) return;
    setArchived(true);
    onArchive(item.id, draft, issues);
    window.setTimeout(onClose, 450);
  };

  const open = !!item && !!draft;
  const previewSrc = item?.previewUrl;

  return (
    <AnimatePresence>
      {open && item && draft && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-ink/30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 640 }}
            animate={{ x: 0 }}
            exit={{ x: 640 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col bg-paper shadow-overlay sm:w-[640px]"
          >
            {/* 头部 */}
            <div className="flex items-start justify-between gap-3 border-b border-cinnabar-line px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[6px] bg-seal/10 px-2 py-0.5 text-[12px] font-medium text-seal">
                    {draft.invoiceType || '发票类型待补录'}
                  </span>
                  {issues.length === 0 ? (
                    <SealBadge tone="jade">校验通过</SealBadge>
                  ) : (
                    <SealBadge tone="amber">待确认</SealBadge>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[12px] text-ink-faint">
                  来源文件：{item.name}
                  {item.result?.channel ? ` · ${item.result.channel}` : ' · 手动录入'}
                </p>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink" aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            {/* 校验提示条 */}
            {issues.length > 0 && (
              <div className="flex items-center gap-2 border-b border-amber/30 bg-amber/[0.06] px-6 py-2.5 text-[13px] text-amber">
                <AlertTriangle size={15} className="shrink-0" />
                发现 <span className="num font-semibold">{issues.length}</span> 项需人工确认
              </div>
            )}

            {/* 主体滚动区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-5 md:flex-row">
                {/* 票面预览 */}
                <div className="shrink-0 md:w-[240px]">
                  {previewSrc ? (
                    <>
                      <button
                        onClick={() => setLightbox(true)}
                        className="group relative block w-full overflow-hidden rounded-xl border border-cinnabar-line"
                      >
                        <img src={previewSrc} alt="票面预览" className="block aspect-[10/7] w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all group-hover:bg-ink/20 group-hover:opacity-100">
                          <ZoomIn size={22} className="text-white" />
                        </span>
                      </button>
                      <p className="mt-1.5 text-center text-[12px] text-ink-faint">点击放大票面预览</p>
                    </>
                  ) : (
                    <>
                      <div className="flex aspect-[10/7] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cinnabar-line bg-paper-deep text-ink-faint">
                        <FileText size={26} strokeWidth={1.5} />
                        <span className="text-[12px]">{item.format === 'OFD' ? 'OFD 暂无票面预览' : '票面预览不可用'}</span>
                      </div>
                      <p className="mt-1.5 text-center text-[12px] text-ink-faint">不影响识别与入库</p>
                    </>
                  )}
                </div>

                {/* 要素字段区 */}
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <FieldCard label="发票类型" value={draft.invoiceType} onChange={(v) => set({ invoiceType: v })} list="invoice-types" warn={fieldHasIssue('invoiceType', issues)} />
                  <FieldCard label="发票代码" value={draft.invoiceCode} onChange={(v) => set({ invoiceCode: v })} mono />
                  <FieldCard label="发票号码" value={draft.invoiceNumber} onChange={(v) => set({ invoiceNumber: v })} mono warn={fieldHasIssue('invoiceNumber', issues)} />
                  <FieldCard label="开票日期" value={draft.invoiceDate} onChange={(v) => set({ invoiceDate: v })} mono warn={fieldHasIssue('invoiceDate', issues)} placeholder="YYYY-MM-DD" />
                  <FieldCard label="校验码" value={draft.checkCode} onChange={(v) => set({ checkCode: v })} mono />
                  <div />
                  <FieldCard label="购买方名称" value={draft.buyerName} onChange={(v) => set({ buyerName: v })} warn={fieldHasIssue('buyerName', issues)} />
                  <FieldCard label="购买方税号" value={draft.buyerTaxId} onChange={(v) => set({ buyerTaxId: v })} mono warn={fieldHasIssue('buyerTaxId', issues)} />
                  <FieldCard label="销售方名称" value={draft.sellerName} onChange={(v) => set({ sellerName: v })} warn={fieldHasIssue('sellerName', issues)} />
                  <FieldCard label="销售方税号" value={draft.sellerTaxId} onChange={(v) => set({ sellerTaxId: v })} mono warn={fieldHasIssue('sellerTaxId', issues)} />
                  <FieldCard label="合计金额" value={draft.amount} onChange={(v) => set({ amount: v })} mono warn={fieldHasIssue('amount', issues)} placeholder="0.00" />
                  <FieldCard label="合计税额" value={draft.taxAmount} onChange={(v) => set({ taxAmount: v })} mono warn={fieldHasIssue('taxAmount', issues)} placeholder="0.00" />
                  <div className="col-span-2">
                    <FieldCard label="价税合计（小写）" value={draft.totalAmount} onChange={(v) => set({ totalAmount: v })} strong warn={fieldHasIssue('totalAmount', issues)} placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <FieldCard label="备注" value={draft.remark} onChange={(v) => set({ remark: v })} placeholder="无" />
                  </div>
                </div>
              </div>

              <datalist id="invoice-types">
                <option value="电子发票（增值税专用发票）" />
                <option value="电子发票（普通发票）" />
                <option value="增值税专用发票" />
                <option value="增值税普通发票" />
                <option value="增值税电子普通发票" />
                <option value="机动车销售统一发票" />
              </datalist>

              {/* 校验结果区 */}
              <div className="mt-6">
                <h3 className="text-[14px] font-bold text-ink">合规校验</h3>
                <div className="mt-2 space-y-1.5">
                  {checks.map((c) => (
                    <div key={c.label} className="flex items-start gap-2 rounded-lg border border-cinnabar-line/70 bg-warm-white px-3 py-2">
                      {c.pass ? (
                        <CheckCircle2 size={15} className="mt-[3px] shrink-0 text-jade" />
                      ) : (
                        <XCircle size={15} className="mt-[3px] shrink-0 text-amber" />
                      )}
                      <div className="min-w-0">
                        <p className={cn('text-[13px] font-medium', c.pass ? 'text-ink' : 'text-amber')}>{c.label}</p>
                        <p className="text-[12px] leading-[18px] text-ink-faint">{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 商品明细（可折叠） */}
              <div className="mt-6">
                <button
                  onClick={() => setItemsOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-cinnabar-line bg-paper-deep/50 px-3 py-2 text-[14px] font-bold text-ink"
                >
                  <span>
                    商品明细 <span className="num font-normal text-ink-faint">（{draft.items.length} 行）</span>
                  </span>
                  <ChevronDown size={16} className={cn('transition-transform', itemsOpen && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {itemsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 overflow-x-auto rounded-lg border border-cinnabar-line">
                        <table className="data-table min-w-[560px]">
                          <thead>
                            <tr>
                              <th>品名</th>
                              <th>规格</th>
                              <th className="num">数量</th>
                              <th className="num">单价</th>
                              <th className="num">税率</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {draft.items.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center text-[13px] text-ink-faint">
                                  无明细行，可点击下方按钮添加
                                </td>
                              </tr>
                            )}
                            {draft.items.map((it, i) => (
                              <tr key={i}>
                                <td>
                                  <input
                                    value={it.name}
                                    onChange={(e) => setItem(i, { name: e.target.value })}
                                    className="w-full min-w-[120px] bg-transparent outline-none"
                                  />
                                </td>
                                <td>
                                  <input
                                    value={it.spec ?? ''}
                                    onChange={(e) => setItem(i, { spec: e.target.value || undefined })}
                                    className="w-full min-w-[70px] bg-transparent outline-none"
                                  />
                                </td>
                                <td className="num">
                                  <input
                                    value={it.quantity ?? ''}
                                    onChange={(e) => setItem(i, { quantity: parseNum(e.target.value) || undefined })}
                                    className="num w-full min-w-[60px] bg-transparent text-right outline-none"
                                  />
                                </td>
                                <td className="num">
                                  <input
                                    value={it.unitPrice ?? ''}
                                    onChange={(e) => setItem(i, { unitPrice: parseNum(e.target.value) || undefined })}
                                    className="num w-full min-w-[70px] bg-transparent text-right outline-none"
                                  />
                                </td>
                                <td className="num">
                                  <input
                                    value={it.taxRate ?? ''}
                                    onChange={(e) => setItem(i, { taxRate: parseNum(e.target.value) || undefined })}
                                    className="num w-full min-w-[50px] bg-transparent text-right outline-none"
                                  />
                                </td>
                                <td>
                                  <button
                                    onClick={() => setDraft((d) => (d ? { ...d, items: d.items.filter((_, j) => j !== i) } : d))}
                                    className="rounded p-1 text-ink-faint hover:text-seal"
                                    aria-label="删除明细行"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => setDraft((d) => (d ? { ...d, items: [...d.items, { name: '' }] } : d))}
                        className="mt-2 flex items-center gap-1 rounded-lg border border-cinnabar-line px-2.5 py-1 text-[12px] text-ink-soft hover:bg-paper-deep"
                      >
                        <Plus size={13} /> 添加明细行
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 底部操作条 */}
            <div className="flex items-center gap-3 border-t border-cinnabar-line bg-warm-white px-6 py-3.5">
              <button
                onClick={handleArchive}
                disabled={archived}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-medium text-white transition-all active:scale-[0.97]',
                  archived ? 'bg-jade' : 'bg-seal hover:bg-seal-deep',
                )}
              >
                {archived ? (
                  <>
                    <CheckCircle2 size={16} /> 已入库
                  </>
                ) : (
                  <>
                    <Stamp size={16} /> 确认入库
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (item && draft) onMarkPending(item.id, draft);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-4 py-2.5 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                <PenLine size={14} /> 标记为待确认
              </button>
              <button
                onClick={() => {
                  if (item) onRetry(item.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                <RotateCw size={14} /> 重新识别
              </button>
            </div>
          </motion.aside>

          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && previewSrc && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-6"
                onClick={() => setLightbox(false)}
              >
                <motion.img
                  initial={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  src={previewSrc}
                  alt="票面大图"
                  className="max-h-full max-w-full rounded-xl shadow-overlay"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
