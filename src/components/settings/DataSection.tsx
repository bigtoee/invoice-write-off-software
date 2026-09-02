import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Eraser, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionCard, Row } from '@/components/settings/common';
import { listInvoices, addInvoice, clearAll, storageUsage } from '@/lib/store';
import { getSettings } from '@/lib/settings';
import { EXTRA_SETTINGS_KEY } from '@/pages/Settings';
import type { Invoice } from '@/types/invoice';

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function download(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface BackupFile {
  app: string;
  version: string;
  exportedAt: string;
  settings: unknown;
  extra?: unknown;
  invoices: Array<Omit<Invoice, 'id' | 'createdAt'>>;
}

/** S4 数据与存储：用量条、备份导出/导入、清缓存、危险区。 */
export default function DataSection() {
  const [usage, setUsage] = useState({ used: 0, quota: 0 });
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setUsage(await storageUsage());
    setCount((await listInvoices()).length);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void refresh();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const quotaPct = usage.quota > 0 ? Math.min(100, (usage.used / usage.quota) * 100) : 0;

  /* 导出备份：台账 JSON + 设置 + XML 归档 */
  const exportBackup = async () => {
    const invoices = await listInvoices();
    const xmlFiles = localStorage.getItem('invoicecore:xmlFiles');
    const backup: BackupFile = {
      app: 'invoicecore',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      extra: {
        prefs: localStorage.getItem(EXTRA_SETTINGS_KEY),
        xmlFiles: xmlFiles ? (JSON.parse(xmlFiles) as unknown) : {},
      },
      invoices: invoices.map((inv) => {
        const rest = { ...inv };
        delete (rest as Partial<Invoice>).id;
        delete (rest as Partial<Invoice>).createdAt;
        return rest;
      }),
    };
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    download(`票核备份_${stamp}.json`, JSON.stringify(backup, null, 2));
    setNotice({ ok: true, text: `已导出 ${invoices.length} 张发票的备份文件` });
  };

  /* 导入备份：覆盖式恢复 */
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    let parsed: BackupFile;
    try {
      parsed = JSON.parse(await file.text()) as BackupFile;
    } catch {
      setNotice({ ok: false, text: '导入失败：文件不是有效的 JSON 备份' });
      return;
    }
    if (parsed.app !== 'invoicecore' || !Array.isArray(parsed.invoices)) {
      setNotice({ ok: false, text: '导入失败：文件不是票核备份格式' });
      return;
    }
    if (!window.confirm(`导入将覆盖当前台账（${count} 张），恢复为备份中的 ${parsed.invoices.length} 张。继续？`)) {
      return;
    }
    setBusy(true);
    try {
      await clearAll();
      for (const inv of parsed.invoices) {
        await addInvoice(inv);
      }
      setNotice({ ok: true, text: `已恢复 ${parsed.invoices.length} 张发票` });
      await refresh();
    } catch {
      setNotice({ ok: false, text: '导入失败：写入本地存储时出错' });
    } finally {
      setBusy(false);
    }
  };

  /* 清除 OCR 模型缓存（Cache Storage + tesseract 相关 IndexedDB），不动台账 */
  const clearCache = async () => {
    setBusy(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('indexedDB' in window && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name && db.name !== 'invoicecore' && /tess|ocr|cache/i.test(db.name)) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      setNotice({ ok: true, text: '识别缓存已清除，台账数据未受影响' });
    } catch {
      setNotice({ ok: false, text: '清除缓存时出现错误' });
    } finally {
      setBusy(false);
    }
  };

  /* 危险区：清空全部数据 */
  const wipeAll = async () => {
    setBusy(true);
    try {
      await clearAll();
      localStorage.removeItem('invoicecore:settings');
      localStorage.removeItem(EXTRA_SETTINGS_KEY);
      localStorage.removeItem('invoicecore:xmlFiles');
      localStorage.removeItem('invoicecore:verified');
      setDialogOpen(false);
      setConfirmText('');
      setNotice({ ok: true, text: '全部数据已清空' });
      window.location.reload();
    } catch {
      setNotice({ ok: false, text: '清空失败，请重试' });
      setBusy(false);
    }
  };

  return (
    <SectionCard id="sec-data" title="数据与存储" desc="发票与设置均保存在本机浏览器（IndexedDB / localStorage）。">
      {/* 存储用量条 */}
      <div className="mb-2 border-b border-cinnabar-line pb-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-ink">本地存储用量</span>
          <span className="font-mono tabular-nums text-ink-soft">
            {formatMB(usage.used)} / {formatMB(usage.quota)} MB
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
          <motion.div
            className={quotaPct > 60 ? 'h-full rounded-full bg-seal' : 'h-full rounded-full bg-jade'}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: Math.max(0.01, quotaPct / 100) }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-faint">
          共 {count} 张发票 · 数据保存在本机浏览器，清除浏览器数据将丢失台账。
        </p>
      </div>

      <Row label="导出完整备份" hint="台账 JSON + 设置 + 全部 XML 归档打包为一个备份文件。">
        <button
          type="button"
          onClick={() => void exportBackup()}
          className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-3.5 py-2 text-[13px] font-medium text-ink transition-all hover:bg-paper-deep active:scale-[0.97]"
        >
          <Download size={14} /> 导出备份 (.json)
        </button>
      </Row>

      <Row label="导入备份" hint="从备份文件恢复台账（覆盖当前数据）。">
        <button
          type="button"
          disabled={busy}
          onClick={() => importInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-3.5 py-2 text-[13px] font-medium text-ink transition-all hover:bg-paper-deep active:scale-[0.97] disabled:opacity-60"
        >
          <Upload size={14} /> 导入备份
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            void importBackup(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </Row>

      <Row label="清除缓存" hint="仅清除 OCR 模型缓存，不影响台账与设置。">
        <button
          type="button"
          disabled={busy}
          onClick={() => void clearCache()}
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] text-ink-soft transition-all hover:bg-paper-deep active:scale-[0.97] disabled:opacity-60"
        >
          <Eraser size={14} /> 清除缓存
        </button>
      </Row>

      {notice && (
        <div
          className={
            notice.ok
              ? 'mt-2 rounded-lg bg-jade/[0.07] px-3.5 py-2.5 text-[13px] text-jade'
              : 'mt-2 rounded-lg bg-seal/[0.06] px-3.5 py-2.5 text-[13px] text-seal'
          }
        >
          {notice.text}
        </div>
      )}

      {/* 危险区 */}
      <div className="mt-5 rounded-xl border border-seal/50 bg-seal/[0.03] p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-seal" />
          <h3 className="text-[15px] font-bold text-seal">危险区</h3>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14px] font-medium text-ink">清空全部台账数据</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              删除本机全部发票与设置，不可恢复。强烈建议先导出备份。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="shrink-0 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep active:scale-[0.97]"
          >
            清空数据
          </button>
        </div>
      </div>

      {/* 二次确认 Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setConfirmText('');
        }}
      >
        <DialogContent className="bg-warm-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-seal">确认清空全部数据？</DialogTitle>
            <DialogDescription>
              将删除本机全部发票、XML 归档与设置，<span className="font-medium text-seal">不可恢复</span>
              。请输入「确认清空」四字以继续。
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="确认清空"
            autoComplete="off"
            className="w-full rounded-lg border border-cinnabar-line bg-warm-white px-3 py-2.5 font-mono text-[14px] tracking-[0.2em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-faint focus:border-seal"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-cinnabar-line px-4 py-2 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep"
            >
              取消
            </button>
            <button
              type="button"
              disabled={confirmText !== '确认清空' || busy}
              onClick={() => void wipeAll()}
              className="flex items-center gap-1.5 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              永久清空
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
