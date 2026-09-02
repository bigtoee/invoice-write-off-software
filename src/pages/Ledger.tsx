import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Download,
  MoreHorizontal,
  Receipt,
  Stamp,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import {
  deleteInvoice,
  listInvoices,
  loadSampleData,
  updateInvoice,
  clearAll,
} from '@/lib/store';
import { formatCNY } from '@/lib/validate';
import { exportLedgerXlsx } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CountUp from '@/components/ledger/CountUp';
import EmptyState from '@/components/ledger/EmptyState';
import ConfirmDialog from '@/components/ledger/ConfirmDialog';
import FilterBar, { DEFAULT_FILTERS, type LedgerFilters } from '@/components/ledger/FilterBar';
import LedgerTable, { type SortDir, type SortKey } from '@/components/ledger/LedgerTable';
import CardView from '@/components/ledger/CardView';
import InvoiceDrawer from '@/components/ledger/InvoiceDrawer';
import { ToastHost, showToast } from '@/components/ledger/Toast';
import {
  EASE_OUT_QUINT,
  STATUS_LIST,
  getChecks,
  isAbnormal,
  monthKey,
  statusLabel,
  typeCategory,
} from '@/components/ledger/utils';
import { cn } from '@/lib/utils';

export default function Ledger() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<LedgerFilters>(() => {
    const s = searchParams.get('status');
    return STATUS_LIST.includes(s as Invoice['status'])
      ? { ...DEFAULT_FILTERS, status: s as Invoice['status'] }
      : DEFAULT_FILTERS;
  });
  const [view, setView] = useState<'table' | 'card'>('table');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'invoiceDate', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  const reload = useCallback(async () => {
    const all = await listInvoices();
    setInvoices(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void reload();
  }, [reload]);

  // 筛选 / 分页变化时清空选择并回到第一页
  const applyFilters = (f: LedgerFilters) => {
    setFilters(f);
    setPage(1);
    setSelected(new Set());
  };

  const months = useMemo(() => {
    const set = new Set(invoices.map((i) => monthKey(i.invoiceDate)).filter(Boolean));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1)).slice(0, 12);
  }, [invoices]);

  const filtered = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    let out = invoices.filter((inv) => {
      if (kw) {
        const hay = [inv.invoiceNumber, inv.buyerName, inv.sellerName, inv.buyerTaxId, inv.sellerTaxId]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (filters.type !== 'all' && typeCategory(inv.invoiceType) !== filters.type) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'pending') {
          if (!isAbnormal(inv)) return false;
        } else if (inv.status !== filters.status) return false;
      }
      if (filters.check !== 'all') {
        const ab = isAbnormal(inv);
        if (filters.check === 'abnormal' && !ab) return false;
        if (filters.check === 'pass' && ab) return false;
      }
      if (filters.month !== 'all' && monthKey(inv.invoiceDate) !== filters.month) return false;
      if (filters.dupOnly && getChecks(inv).dup) return false;
      return true;
    });
    // 「有异常」筛选时异常发票置顶
    if (filters.check === 'abnormal') {
      out = [...out].sort((a, b) => Number(isAbnormal(b)) - Number(isAbnormal(a)));
    }
    return out;
  }, [invoices, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'invoiceDate':
          return a.invoiceDate < b.invoiceDate ? -dir : a.invoiceDate > b.invoiceDate ? dir : 0;
        case 'totalAmount':
          return (a.totalAmount - b.totalAmount) * dir;
        case 'taxAmount':
          return (a.taxAmount - b.taxAmount) * dir;
        case 'invoiceNumber':
          return a.invoiceNumber < b.invoiceNumber ? -dir : a.invoiceNumber > b.invoiceNumber ? dir : 0;
      }
    });
    return arr;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    let total = 0;
    let tax = 0;
    let abnormal = 0;
    for (const inv of invoices) {
      total += inv.totalAmount;
      tax += inv.taxAmount;
      if (isAbnormal(inv)) abnormal += 1;
    }
    return { count: invoices.length, total, tax, abnormal };
  }, [invoices]);

  const activeInvoice = activeId ? invoices.find((i) => i.id === activeId) ?? null : null;

  const handleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  const handleStatusChange = async (id: string, status: Invoice['status']) => {
    await updateInvoice(id, { status });
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    showToast(`已标记为「${statusLabel(status)}」`, 'jade');
  };

  const handleDelete = async (ids: string[]) => {
    for (const id of ids) await deleteInvoice(id);
    setInvoices((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelected(new Set());
    if (activeId && ids.includes(activeId)) setActiveId(null);
    showToast(`已移出 ${ids.length} 张发票`, 'seal');
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    await loadSampleData();
    await reload();
    setLoadingSample(false);
    showToast('已加载 12 张示例发票', 'jade');
  };

  const selectedInvoices = sorted.filter((i) => selected.has(i.id));

  const summaryCards = [
    { label: '发票总数', value: summary.count, format: (n: number) => `${Math.round(n)} 张`, cls: 'text-ink' },
    { label: '价税合计', value: summary.total, format: formatCNY, cls: 'text-seal' },
    { label: '合计税额', value: summary.tax, format: formatCNY, cls: 'text-ink' },
    { label: '异常 / 重复', value: summary.abnormal, format: (n: number) => `${Math.round(n)} 张`, cls: 'text-amber' },
  ];

  return (
    <div>
      <ToastHost />

      {/* S1 页面头部 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-bold leading-[36px] text-ink">发票台账</h1>
          <p className="mt-1 text-[13px] text-ink-faint">全部已入库发票 · 数据保存在本机浏览器</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/workbench')}
            className="flex items-center gap-1.5 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
          >
            <Upload size={14} /> 批量上传
          </button>
          <button
            onClick={() => {
              exportLedgerXlsx(filtered);
              showToast(`台账已导出 · ${filtered.length} 行`, 'jade');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-4 py-2 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
          >
            <Download size={14} /> 导出台账 Excel
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-paper-deep"
                aria-label="更多操作"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLoadSample} disabled={loadingSample}>
                <Receipt size={14} className="mr-2" /> 加载示例数据
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmClear(true)} className="text-seal focus:text-seal">
                <Trash2 size={14} className="mr-2" /> 清空台账
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* S1 汇总条 */}
      {invoices.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((c, i) => (
            <motion.button
              key={c.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT_QUINT }}
              onClick={
                c.label === '异常 / 重复' ? () => applyFilters({ ...filters, check: 'abnormal' }) : undefined
              }
              className={cn(
                'rounded-xl border border-cinnabar-line bg-warm-white px-5 py-4 text-left shadow-card transition-transform duration-200 hover:-translate-y-[3px]',
              )}
            >
              <div className="flex items-center gap-1.5 text-[12px] font-medium tracking-[0.04em] text-ink-faint">
                {c.label === '异常 / 重复' && <AlertTriangle size={12} className="text-amber" />}
                {c.label}
              </div>
              <CountUp value={c.value} format={c.format} className={cn('num mt-1 block text-[26px] font-semibold leading-[34px]', c.cls)} />
            </motion.button>
          ))}
        </div>
      )}

      {/* S2 筛选工具栏 */}
      {invoices.length > 0 && (
        <div className="mt-6">
          <FilterBar
            filters={filters}
            onChange={applyFilters}
            months={months}
            view={view}
            onViewChange={setView}
            resultCount={filtered.length}
          />
        </div>
      )}

      {/* 批量操作条 */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT_QUINT }}
            className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-seal/30 bg-seal/5 px-4 py-2.5"
          >
            <span className="num text-[13px] font-medium text-seal">已选 {selected.size} 张</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={async () => {
                  for (const inv of selectedInvoices) await updateInvoice(inv.id, { status: 'reimbursed' });
                  setInvoices((prev) =>
                    prev.map((i) => (selected.has(i.id) ? { ...i, status: 'reimbursed' as const } : i)),
                  );
                  setSelected(new Set());
                  showToast(`已将 ${selectedInvoices.length} 张标记为已报销`, 'jade');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line bg-warm-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                <Stamp size={13} /> 标记已报销
              </button>
              <button
                onClick={() => {
                  exportLedgerXlsx(selectedInvoices);
                  showToast(`已导出所选 · ${selectedInvoices.length} 行`, 'jade');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line bg-warm-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
              >
                <Download size={13} /> 导出所选
              </button>
              <button
                onClick={() => setConfirmBatchDelete(true)}
                className="flex items-center gap-1.5 rounded-lg border border-seal/60 bg-warm-white px-3 py-1.5 text-[12px] text-seal transition-colors hover:bg-seal/5 active:scale-[0.97]"
              >
                <Trash2 size={13} /> 移出台账
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主区域 */}
      <div className="mt-4">
        {!loaded ? null : invoices.length === 0 ? (
          <EmptyState
            description="台账还是空的。先去工作台识别发票，或加载示例数据。"
            primaryLabel="前往工作台"
            secondaryLabel="加载示例发票"
            onSecondary={handleLoadSample}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cinnabar-line py-16 text-center">
            <p className="text-[14px] text-ink-faint">没有符合筛选条件的发票。</p>
            <button
              onClick={() => applyFilters(DEFAULT_FILTERS)}
              className="text-[13px] text-seal underline-offset-4 hover:underline"
            >
              清除全部筛选
            </button>
          </div>
        ) : view === 'table' ? (
          <LedgerTable
            rows={pageRows}
            sort={sort}
            onSort={handleSort}
            selected={selected}
            onToggle={(id) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAll={() =>
              setSelected((prev) => {
                const allChecked = pageRows.every((r) => prev.has(r.id));
                const next = new Set(prev);
                for (const r of pageRows) {
                  if (allChecked) next.delete(r.id);
                  else next.add(r.id);
                }
                return next;
              })
            }
            onOpen={(inv) => setActiveId(inv.id)}
            onDelete={(inv) => setDeleteTarget(inv)}
            onMarkReimbursed={(inv) => void handleStatusChange(inv.id, 'reimbursed')}
            activeId={activeId ?? undefined}
            page={safePage}
            pageCount={pageCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            totalCount={sorted.length}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key="card-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <CardView rows={pageRows} onOpen={(inv) => setActiveId(inv.id)} />
              {/* 卡片视图简易分页 */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'num h-7 min-w-7 rounded-md px-1.5 text-[12px] transition-colors',
                      p === safePage ? 'bg-seal text-white' : 'text-ink-soft hover:bg-paper-deep',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* S4 详情抽屉 */}
      <InvoiceDrawer
        invoice={activeInvoice}
        onClose={() => setActiveId(null)}
        onStatusChange={(id, s) => void handleStatusChange(id, s)}
        onDelete={(inv) => void handleDelete([inv.id])}
      />

      {/* S7 删除确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="确认移出 1 张发票？"
        description="此操作仅从本机浏览器删除，不可恢复。建议先导出 Excel 备份。"
        confirmLabel="移出"
        onConfirm={() => {
          if (deleteTarget) void handleDelete([deleteTarget.id]);
          setDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        title={`确认移出 ${selected.size} 张发票？`}
        description="此操作仅从本机浏览器删除，不可恢复。建议先导出 Excel 备份。"
        confirmLabel="移出"
        onConfirm={() => void handleDelete(Array.from(selected))}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="确认清空全部台账？"
        description="此操作将从本机浏览器删除全部发票记录，不可恢复。建议先导出 Excel 备份。"
        confirmLabel="清空"
        onConfirm={() => {
          void clearAll().then(() => {
            setInvoices([]);
            setSelected(new Set());
            setActiveId(null);
            showToast('台账已清空', 'seal');
          });
        }}
      />
    </div>
  );
}
