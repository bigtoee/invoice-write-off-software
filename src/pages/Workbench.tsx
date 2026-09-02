import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Database, Eraser, FilePlus2, FolderInput } from 'lucide-react';
import { recognizeFile, type RecognitionChannel } from '@/lib/recognition';
import { generatePdfPreview } from '@/lib/preview';
import { addInvoice, listInvoices, loadSampleData } from '@/lib/store';
import { validateInvoice } from '@/lib/validate';
import type { Invoice } from '@/types/invoice';
import Dropzone from '@/components/workbench/Dropzone';
import QueueCard from '@/components/workbench/QueueCard';
import ConfirmDrawer from '@/components/workbench/ConfirmDrawer';
import { draftFromResult, draftToInvoice, type DraftFields } from '@/components/workbench/draft';
import PendingSection from '@/components/workbench/PendingSection';
import SummaryBar from '@/components/workbench/SummaryBar';
import { useToasts } from '@/components/workbench/Toasts';
import type { QueueItem, QueueStatus } from '@/components/workbench/queue-types';
import { detectFormat, isImageFormat, SUPPORTED_EXT } from '@/components/workbench/queue-types';

const CHANNEL_BY_FORMAT: Record<string, RecognitionChannel> = {
  XML: 'XML 直取',
  PDF: 'PDF 文本层',
  JPG: '本地 OCR',
  PNG: '本地 OCR',
  OFD: '手动录入',
};

let uid = 0;
function nextId(): string {
  uid += 1;
  return `q_${Date.now()}_${uid}`;
}

/** 空状态插画：无限浮动动画隔离在 memo 微组件中 */
const FloatingIllustration = memo(function FloatingIllustration() {
  return (
    <motion.img
      src="/empty-ledger.jpg"
      alt="空账簿插画"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: [0, -5, 0, 5, 0] }}
      transition={{
        opacity: { duration: 0.6 },
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="mx-auto w-[320px] max-w-full"
    />
  );
});

export default function Workbench() {
  const navigate = useNavigate();
  const { push, node: toastNode } = useToasts();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [existing, setExisting] = useState<Invoice[]>([]);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [sessionUploaded, setSessionUploaded] = useState(0);
  const [sampleLoading, setSampleLoading] = useState(false);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const existingRef = useRef<Invoice[]>([]);
  const processingRef = useRef(false);
  const pickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listInvoices().then((list) => {
      existingRef.current = list;
      setExisting(list);
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  /* ---------------- 队列处理器：单文件串行识别 ---------------- */
  useEffect(() => {
    if (processingRef.current) return;
    const next = queue.find((it) => it.status === 'queued');
    if (!next) return;
    processingRef.current = true;

    (async () => {
      const channel = CHANNEL_BY_FORMAT[next.format];
      updateItem(next.id, { status: 'recognizing', progress: 0.02, stage: '准备中', channel });
      const result = await recognizeFile(next.file, (p, stage) => {
        updateItem(next.id, { progress: Math.min(1, p), stage });
      });

      // 识别完成 → 查重 + 勾稽 + 税号校验（对照 idb 台账 + 本队列已识别结果）
      const draft = draftFromResult({ ...next, result });
      const inv = draftToInvoice(draft, next.name);
      const issues = validateInvoice(inv, existingRef.current);
      if (
        inv.invoiceNumber &&
        !issues.some((i) => i.includes('重复')) &&
        queueRef.current.some(
          (it) =>
            it.id !== next.id &&
            (it.status === 'recognized' || it.status === 'pending' || it.status === 'archived') &&
            it.result?.invoiceNumber &&
            it.result.invoiceNumber === inv.invoiceNumber,
        )
      ) {
        issues.push('与已有发票号码重复');
      }

      let status: QueueStatus;
      let reason: string | undefined;
      if (result.confidence <= 0) {
        status = 'error';
        reason = result.warnings?.[0] ?? '未能识别票面要素，请手动录入';
      } else if (result.confidence < 0.6 || issues.length > 0) {
        status = 'pending';
        reason = issues[0] ?? result.warnings?.[0] ?? '识别置信度偏低，请人工核对票面要素';
      } else {
        status = 'recognized';
      }
      updateItem(next.id, { status, result, issues, reason, progress: 1, stage: '' });
      if (status === 'recognized') {
        push('jade', `「${next.name}」识别完成${inv.invoiceNumber ? `：${inv.invoiceNumber}` : ''}`);
      } else if (status === 'pending') {
        push('amber', `「${next.name}」需要人工确认`);
      } else {
        push('amber', `「${next.name}」识别异常，可手动录入`);
      }
      processingRef.current = false;
    })();
  }, [queue, updateItem, push]);

  /* ---------------- 文件入口 ---------------- */
  const addFiles = useCallback(
    (files: File[]) => {
      const accepted = files.filter((f) =>
        SUPPORTED_EXT.has((/\.([a-z0-9]+)$/i.exec(f.name)?.[1] ?? '').toLowerCase()),
      );
      if (accepted.length === 0) {
        push('seal', '未找到可识别的发票文件（支持 PDF / JPG / PNG / XML / OFD）');
        return;
      }
      const items: QueueItem[] = accepted.map((f) => {
        const format = detectFormat(f.name);
        return {
          id: nextId(),
          file: f,
          name: f.name,
          size: f.size,
          format,
          previewUrl: isImageFormat(format) ? URL.createObjectURL(f) : undefined,
          status: 'queued' as QueueStatus,
          progress: 0,
          stage: '',
        };
      });
      setQueue((q) => [...q, ...items]);
      setSessionUploaded((n) => n + accepted.length);
      push('jade', `已加入识别队列 ${accepted.length} 个文件`);
      // PDF 票面预览：后台渲染首页缩略图（图片格式已用 objectURL，XML/OFD 无票面用占位图）
      for (const it of items) {
        if (it.format === 'PDF') {
          void generatePdfPreview(it.file).then((url) => {
            if (url) setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, previewUrl: url } : x)));
          });
        }
      }
    },
    [push],
  );

  const handlePickChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  /* ---------------- 队列操作 ---------------- */
  const removeItem = useCallback((id: string) => {
    setQueue((q) => {
      const target = q.find((it) => it.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return q.filter((it) => it.id !== id);
    });
  }, []);

  const retryItem = useCallback(
    (id: string) => {
      updateItem(id, { status: 'queued', progress: 0, stage: '', result: undefined, issues: undefined, reason: undefined });
    },
    [updateItem],
  );

  const clearQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;
    if (!window.confirm('清空当前识别队列？已入库的发票不受影响。')) return;
    for (const it of queueRef.current) {
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
    }
    setQueue([]);
  }, []);

  /* ---------------- 入库 ---------------- */
  const doArchive = useCallback(
    async (id: string, draft: DraftFields, issues: string[]) => {
      const item = queueRef.current.find((it) => it.id === id);
      if (!item) return;
      const inv = draftToInvoice(draft, item.name);
      const duplicate = issues.some((i) => i.includes('重复'));
      const saved = await addInvoice({
        invoiceType: inv.invoiceType,
        invoiceCode: inv.invoiceCode,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        checkCode: inv.checkCode,
        buyerName: inv.buyerName,
        buyerTaxId: inv.buyerTaxId,
        sellerName: inv.sellerName,
        sellerTaxId: inv.sellerTaxId,
        amount: inv.amount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        items: inv.items,
        remark: inv.remark,
        status: inv.status,
        sourceFile: inv.sourceFile,
        duplicate: duplicate || undefined,
        validationIssues: issues.length ? issues : undefined,
      });
      existingRef.current = [...existingRef.current, saved];
      setExisting(existingRef.current);
      updateItem(id, {
        status: 'archived',
        archivedId: saved.id,
        result: {
          confidence: item.result?.confidence ?? 0,
          channel: item.result?.channel,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
        },
        issues,
      });
    },
    [updateItem],
  );

  const handleArchive = useCallback(
    (id: string, draft: DraftFields, issues: string[]) => {
      void doArchive(id, draft, issues).then(() => {
        const inv = draftToInvoice(draft, queueRef.current.find((it) => it.id === id)?.name ?? '');
        push('jade', `发票 ${inv.invoiceNumber || ''} 已归入台账`);
      });
    },
    [doArchive, push],
  );

  const handleMarkPending = useCallback(
    (id: string, draft: DraftFields) => {
      const item = queueRef.current.find((it) => it.id === id);
      if (!item) return;
      const inv = draftToInvoice(draft, item.name);
      updateItem(id, {
        status: 'pending',
        reason: '人工标记：待确认',
        result: { confidence: item.result?.confidence ?? 0, channel: item.result?.channel, ...inv },
      });
      push('amber', `「${item.name}」已标记为待确认`);
    },
    [updateItem, push],
  );

  const archiveAll = useCallback(async () => {
    const targets = queueRef.current.filter((it) => it.status === 'recognized');
    for (const t of targets) {
      const draft = draftFromResult(t);
      const issues = validateInvoice(draftToInvoice(draft, t.name), existingRef.current);
      await doArchive(t.id, draft, issues);
    }
    if (targets.length > 0) push('jade', `已将 ${targets.length} 张发票归入台账`);
    navigate('/ledger');
  }, [doArchive, navigate, push]);

  const handleLoadSample = useCallback(async () => {
    setSampleLoading(true);
    try {
      await loadSampleData();
      const list = await listInvoices();
      existingRef.current = list;
      setExisting(list);
      push('jade', '已注入示例发票数据，可前往台账查看');
    } finally {
      setSampleLoading(false);
    }
  }, [push]);

  /* ---------------- 统计 ---------------- */
  const archivedCount = queue.filter((it) => it.status === 'archived').length;
  const pendingItems = queue.filter((it) => it.status === 'pending' || it.status === 'error');
  const duplicateCount = queue.filter((it) => it.issues?.some((i) => i.includes('重复'))).length;
  const doneCount = queue.filter((it) => it.status === 'recognized' || it.status === 'archived').length;
  const finishedCount = doneCount + pendingItems.length;
  const successRate = finishedCount > 0 ? Math.round((doneCount / finishedCount) * 100) : 100;
  const drawerItem = drawerItemId ? (queue.find((it) => it.id === drawerItemId) ?? null) : null;

  return (
    <div className="relative">
      {toastNode}
      <input
        ref={pickInputRef}
        type="file"
        multiple
        accept=".pdf,.xml,.ofd,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handlePickChange}
      />

      {/* S1 页面头部 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="font-serif text-[28px] font-bold leading-[36px] text-ink">工作台</h1>
          <p className="mt-1 text-[13px] text-ink-faint">
            批量放入 PDF、JPG、XML、OFD 发票文件，识别确认后归入台账。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            onClick={() => void handleLoadSample()}
            disabled={sampleLoading}
            className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line bg-warm-white px-3.5 py-2 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97] disabled:opacity-60"
          >
            <Database size={14} /> {sampleLoading ? '加载中…' : '加载示例发票'}
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            onClick={clearQueue}
            disabled={queue.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97] disabled:opacity-40"
          >
            <Eraser size={14} /> 清空队列
          </motion.button>
        </div>
      </motion.div>

      {/* S2 上传区 */}
      <div className="mt-6">
        <Dropzone compact={queue.length > 0} onFiles={addFiles} />
      </div>

      {/* S3 识别队列 */}
      {queue.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[13px] text-ink-soft">
              已识别 <span className="num font-semibold text-ink">{doneCount}</span> /{' '}
              <span className="num">{queue.length}</span> · 成功率{' '}
              <span className="num font-semibold text-jade">{successRate}%</span>
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full rounded-full bg-seal transition-[width] duration-300"
                style={{ width: `${queue.length ? (finishedCount / queue.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((item, i) => (
              <QueueCard
                key={item.id}
                item={item}
                index={i}
                onRemove={removeItem}
                onConfirm={setDrawerItemId}
                onManual={setDrawerItemId}
                onRetry={retryItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* S5 待确认与异常分区 */}
      <PendingSection items={pendingItems} onManual={setDrawerItemId} onRetry={retryItem} onRemove={removeItem} />

      {/* S7 空状态 */}
      {queue.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 text-center"
        >
          <FloatingIllustration />
          <p className="mt-4 text-[14px] text-ink-soft">
            还没有发票。拖入文件，或先加载 6 张示例发票体验全流程。
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              onClick={() => pickInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
            >
              <FilePlus2 size={14} /> 选择文件
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
              onClick={() => void handleLoadSample()}
              disabled={sampleLoading}
              className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line bg-warm-white px-4 py-2 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97] disabled:opacity-60"
            >
              <FolderInput size={14} /> 加载示例发票
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* S6 底部 sticky 汇总条 */}
      <SummaryBar
        uploaded={sessionUploaded}
        archived={archivedCount}
        pending={pendingItems.length}
        duplicates={duplicateCount}
        onArchiveAll={() => void archiveAll()}
      />

      {/* S4 识别结果确认抽屉 */}
      <ConfirmDrawer
        item={drawerItem}
        existing={existing}
        onClose={() => setDrawerItemId(null)}
        onArchive={handleArchive}
        onMarkPending={handleMarkPending}
        onRetry={retryItem}
      />
    </div>
  );
}
