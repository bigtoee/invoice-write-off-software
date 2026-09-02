import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Upload } from 'lucide-react';
import HealthBanner, { type HealthOverviewItem } from '@/components/compliance/HealthBanner';
import DuplicateReport from '@/components/compliance/DuplicateReport';
import ValidationChecklist from '@/components/compliance/ValidationChecklist';
import XmlArchive, { hasXml, type XmlFileRecord } from '@/components/compliance/XmlArchive';
import VerifyGuide from '@/components/compliance/VerifyGuide';
import PolicySection from '@/components/compliance/PolicySection';
import { listInvoices, deleteInvoice, updateInvoice } from '@/lib/store';
import { validateInvoice } from '@/lib/validate';
import type { Invoice } from '@/types/invoice';

const XML_FILES_KEY = 'invoicecore:xmlFiles';
const VERIFIED_KEY = 'invoicecore:verified';
const DUP_ISSUE = '与已有发票号码重复';

function loadXmlFiles(): Record<string, XmlFileRecord> {
  try {
    return JSON.parse(localStorage.getItem(XML_FILES_KEY) ?? '{}') as Record<string, XmlFileRecord>;
  } catch {
    return {};
  }
}

function loadVerified(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VERIFIED_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as string[]) : [];
  } catch {
    return [];
  }
}

/** 数电票判定：票面类型为电子发票（数电票） */
function isDigital(inv: Invoice): boolean {
  return inv.invoiceType.includes('电子发票');
}

export default function Compliance() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [xmlFiles, setXmlFiles] = useState<Record<string, XmlFileRecord>>(loadXmlFiles);
  const [verifiedIds] = useState<string[]>(loadVerified);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setInvoices(await listInvoices());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- 派生数据 ---------- */

  const dupGroups = useMemo(() => {
    const byNumber = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      if (!inv.invoiceNumber) continue;
      const list = byNumber.get(inv.invoiceNumber) ?? [];
      list.push(inv);
      byNumber.set(inv.invoiceNumber, list);
    }
    return [...byNumber.values()].filter((g) => g.length > 1 || g.some((i) => i.duplicate));
  }, [invoices]);

  const issueMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const inv of invoices) {
      const computed = validateInvoice(inv, invoices);
      const stored = (inv.validationIssues ?? []).filter((m) => !computed.includes(m));
      map.set(inv.id, [...computed, ...stored]);
    }
    return map;
  }, [invoices]);

  const digital = useMemo(() => invoices.filter(isDigital), [invoices]);
  const xmlMissing = useMemo(() => digital.filter((inv) => !hasXml(inv, xmlFiles)), [digital, xmlFiles]);

  const abnormalCount = useMemo(
    () => invoices.filter((inv) => (issueMap.get(inv.id) ?? []).length > 0).length,
    [invoices, issueMap],
  );
  const reconFailCount = useMemo(
    () =>
      invoices.filter((inv) =>
        (issueMap.get(inv.id) ?? []).some((m) => m.includes('价税合计') || m.includes('尾差')),
      ).length,
    [invoices, issueMap],
  );
  const taxFailCount = useMemo(
    () => invoices.filter((inv) => (issueMap.get(inv.id) ?? []).some((m) => m.includes('税号'))).length,
    [invoices, issueMap],
  );

  const score = useMemo(() => {
    const dupExtra = dupGroups.reduce((sum, g) => sum + g.length - 1, 0);
    const penalty = dupExtra * 5 + abnormalCount * 4 + xmlMissing.length * 2;
    return Math.max(0, Math.min(100, 100 - penalty));
  }, [dupGroups, abnormalCount, xmlMissing]);

  const overview: HealthOverviewItem[] = useMemo(
    () => [
      {
        key: 'dup',
        label: '查重',
        ok: dupGroups.length === 0,
        text: dupGroups.length === 0 ? '无重复号码' : `${dupGroups.length} 组重复`,
        target: 'sec-dup',
      },
      {
        key: 'recon',
        label: '要素勾稽',
        ok: reconFailCount === 0,
        text: reconFailCount === 0 ? '全部通过' : `${reconFailCount} 张尾差不符`,
        target: 'sec-validate',
      },
      {
        key: 'tax',
        label: '税号格式',
        ok: taxFailCount === 0,
        text: taxFailCount === 0 ? '全部通过' : `${taxFailCount} 张格式异常`,
        target: 'sec-validate',
      },
      {
        key: 'xml',
        label: 'XML 归档',
        ok: xmlMissing.length === 0,
        text: xmlMissing.length === 0 ? '全部归档' : `缺 ${xmlMissing.length} 份`,
        target: 'sec-xml',
      },
    ],
    [dupGroups.length, reconFailCount, taxFailCount, xmlMissing.length],
  );

  const allGreen = invoices.length > 0 && dupGroups.length === 0 && abnormalCount === 0 && xmlMissing.length === 0;
  const verifiedCount = invoices.filter((inv) => verifiedIds.includes(inv.id)).length;

  /* ---------- 查重处理 ---------- */

  const clearDupFlag = async (inv: Invoice) => {
    await updateInvoice(inv.id, {
      duplicate: false,
      validationIssues: (inv.validationIssues ?? []).filter((m) => m !== DUP_ISSUE),
    });
  };

  const handleKeepOne = async (group: Invoice[], keep: Invoice) => {
    for (const inv of group) {
      if (inv.id !== keep.id) await deleteInvoice(inv.id);
    }
    await clearDupFlag(keep);
    setToast('重复已处理');
    await reload();
  };

  const handleRemove = async (group: Invoice[], inv: Invoice) => {
    await deleteInvoice(inv.id);
    const rest = group.filter((g) => g.id !== inv.id);
    if (rest.length === 1 && rest[0]) await clearDupFlag(rest[0]);
    setToast('重复已处理');
    await reload();
  };

  const handleKeepAll = async (group: Invoice[]) => {
    for (const inv of group) await clearDupFlag(inv);
    setToast('重复已处理');
    await reload();
  };

  /* ---------- XML 补传 ---------- */

  const handleXmlUpload = (invoiceId: string, file: XmlFileRecord) => {
    const next = { ...xmlFiles, [invoiceId]: file };
    setXmlFiles(next);
    localStorage.setItem(XML_FILES_KEY, JSON.stringify(next));
    setToast('XML 已归档');
  };

  /* ---------- 渲染 ---------- */

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="h-[72px] animate-pulse rounded-xl bg-paper-deep/60" />
        <div className="h-[180px] animate-pulse rounded-xl bg-paper-deep/60" />
        <div className="h-[320px] animate-pulse rounded-xl bg-paper-deep/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.25 }}
            className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-jade/30 bg-warm-white px-4 py-2.5 text-[13px] font-medium text-jade shadow-overlay"
          >
            <Check size={15} strokeWidth={3} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* S1 头部 */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="font-serif text-[28px] font-bold text-ink md:text-[36px]">合规中心</h1>
        <p className="mt-1 text-[14px] text-ink-faint">依据财会〔2020〕6 号与会计档案规范自动检查台账</p>
      </motion.header>

      {loaded && invoices.length === 0 ? (
        /* 空台账 */
        <div className="flex flex-col items-center gap-4 rounded-xl border border-cinnabar-line bg-warm-white px-6 py-14 text-center shadow-card">
          <img src="/compliance-doc.jpg" alt="会计档案插画" className="w-[220px] rounded-lg" />
          <p className="text-[15px] font-medium text-ink">台账还是空的，无从检查</p>
          <p className="max-w-[360px] text-[13px] text-ink-faint">
            先上传发票建立台账，票核会随台账变动自动执行查重、勾稽与归档检查。
          </p>
          <Link
            to="/workbench"
            className="flex items-center gap-1.5 rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep active:scale-[0.97]"
          >
            <Upload size={14} /> 上传发票
          </Link>
        </div>
      ) : (
        <>
          {/* S1 健康度横幅 */}
          <HealthBanner score={score} items={overview} />

          {/* S7 全部合规 */}
          {allGreen && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-3 rounded-xl border border-jade/25 bg-warm-white px-6 py-12 text-center shadow-card"
            >
              <motion.span
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
                className="flex h-16 w-16 -rotate-3 items-center justify-center rounded-md border-[3px] border-jade bg-jade/5 text-jade"
              >
                <Check size={34} strokeWidth={3} />
              </motion.span>
              <p className="font-serif text-[20px] font-bold text-ink">全部合规 · 继续保持</p>
              <p className="text-[12px] text-ink-faint">上次检查：刚刚 · 随台账变动自动重检</p>
            </motion.div>
          )}

          {/* S2 查重报告 */}
          {!allGreen && (
            <DuplicateReport
              groups={dupGroups}
              onKeepOne={(g, k) => void handleKeepOne(g, k)}
              onRemove={(g, i) => void handleRemove(g, i)}
              onKeepAll={(g) => void handleKeepAll(g)}
            />
          )}

          {/* S3 要素校验清单 */}
          {!allGreen && <ValidationChecklist invoices={invoices} issueMap={issueMap} />}

          {/* S4 XML 归档检查 */}
          {!allGreen && <XmlArchive digital={digital} xmlFiles={xmlFiles} onUpload={handleXmlUpload} />}

          {/* S5 真伪查验指引 */}
          <VerifyGuide verifiedCount={verifiedCount} total={invoices.length} />

          {/* S6 政策依据 */}
          <PolicySection />
        </>
      )}

      {loaded && invoices.length > 0 && allGreen && (
        <div className="flex items-center justify-center gap-2 text-[12px] text-ink-faint">
          <ShieldCheck size={13} className="text-jade" />
          台账 {invoices.length} 张发票全部通过查重、勾稽、税号与归档检查
        </div>
      )}
    </div>
  );
}
