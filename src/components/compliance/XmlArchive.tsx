import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, FileUp, ExternalLink, Package } from 'lucide-react';
import SealBadge from '@/components/SealBadge';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';

export interface XmlFileRecord {
  name: string;
  content: string;
}

interface XmlArchiveProps {
  /** 全部数电票 */
  digital: Invoice[];
  /** 本机补传的 XML（invoiceId → 文件） */
  xmlFiles: Record<string, XmlFileRecord>;
  onUpload: (invoiceId: string, file: XmlFileRecord) => void;
}

/** 该票是否已有 XML 留存：来源为 .xml 文件，或本机补传过 */
export function hasXml(inv: Invoice, xmlFiles: Record<string, XmlFileRecord>): boolean {
  return Boolean(inv.sourceFile?.toLowerCase().endsWith('.xml')) || Boolean(xmlFiles[inv.id]);
}

/* ---------- 最小 ZIP 构建器（STORE 无压缩，UTF-8 文件名） ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [time, date];
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const [time, date] = dosDateTime(new Date());

  const pushU16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const pushU32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const crc = crc32(file.data);

    const local: number[] = [];
    pushU32(local, 0x04034b50);
    pushU16(local, 20); // version needed
    pushU16(local, 0x0800); // UTF-8 flag
    pushU16(local, 0); // STORE
    pushU16(local, time);
    pushU16(local, date);
    pushU32(local, crc);
    pushU32(local, file.data.length);
    pushU32(local, file.data.length);
    pushU16(local, nameBytes.length);
    pushU16(local, 0);
    const localHeader = new Uint8Array(local);
    chunks.push(localHeader, nameBytes, file.data);

    const cd: number[] = [];
    pushU32(cd, 0x02014b50);
    pushU16(cd, 20); // version made by
    pushU16(cd, 20); // version needed
    pushU16(cd, 0x0800);
    pushU16(cd, 0);
    pushU16(cd, time);
    pushU16(cd, date);
    pushU32(cd, crc);
    pushU32(cd, file.data.length);
    pushU32(cd, file.data.length);
    pushU16(cd, nameBytes.length);
    pushU16(cd, 0); // extra
    pushU16(cd, 0); // comment
    pushU16(cd, 0); // disk
    pushU16(cd, 0); // internal attr
    pushU32(cd, 0); // external attr
    pushU32(cd, offset);
    const cdHeader = new Uint8Array(cd);
    central.push(cdHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + file.data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) centralSize += c.length;

  const end: number[] = [];
  pushU32(end, 0x06054b50);
  pushU16(end, 0);
  pushU16(end, 0);
  pushU16(end, files.length);
  pushU16(end, files.length);
  pushU32(end, centralSize);
  pushU32(end, centralStart);
  pushU16(end, 0);

  return new Blob([...chunks, ...central, new Uint8Array(end)] as BlobPart[], {
    type: 'application/zip',
  });
}

/* ---------- 组件 ---------- */

/** S4 XML 归档检查：数电票 XML 留存清单 + 政策说明卡。 */
export default function XmlArchive({ digital, xmlFiles, onUpload }: XmlArchiveProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingIdRef = useRef<string | null>(null);

  const archived = digital.filter((inv) => hasXml(inv, xmlFiles));
  const missing = digital.filter((inv) => !hasXml(inv, xmlFiles));
  const total = digital.length;
  const archivedPct = total > 0 ? (archived.length / total) * 100 : 100;

  const pickFile = (id: string) => {
    pendingIdRef.current = id;
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    const id = pendingIdRef.current;
    pendingIdRef.current = null;
    if (!file || !id) return;
    const content = await file.text();
    onUpload(id, { name: file.name, content });
  };

  const exportZip = () => {
    const enc = new TextEncoder();
    const files: Array<{ name: string; data: Uint8Array }> = [];

    // 已补传的 XML 原样打包
    for (const inv of digital) {
      const rec = xmlFiles[inv.id];
      if (rec) {
        files.push({ name: `${inv.invoiceNumber || inv.id}.xml`, data: enc.encode(rec.content) });
      }
    }
    // 归档清单（含以 XML 入库、内容未留存于本机的票）
    const lines = [
      '票核 InvoiceCore · 数电票 XML 归档清单',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `数电票 ${total} 张 · 已归档 ${archived.length} · 待补 ${missing.length}`,
      '',
      ...digital.map((inv) => {
        const rec = xmlFiles[inv.id];
        const status = rec
          ? `已存 XML（${rec.name}，见包内文件）`
          : inv.sourceFile?.toLowerCase().endsWith('.xml')
            ? `已存 XML（来源：${inv.sourceFile}，源文件未留存于本机，请自行归档原件）`
            : '缺 XML · 待补传';
        return `${inv.invoiceNumber}\t${inv.invoiceDate}\t${inv.sellerName}\t${status}`;
      }),
    ];
    files.push({ name: '归档清单.txt', data: enc.encode(lines.join('\n')) });

    const blob = buildZip(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `XML归档包_${stamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="sec-xml" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* 左：归档清单 */}
      <div className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-[20px] font-bold text-ink">XML 归档清单</h2>
          {missing.length > 0 ? (
            <SealBadge tone="amber" flat>
              缺 {missing.length} 份
            </SealBadge>
          ) : total > 0 ? (
            <SealBadge tone="jade" flat>
              全部归档
            </SealBadge>
          ) : null}
        </div>
        <p className="mb-4 text-[13px] text-ink-faint">
          依据财会〔2020〕6 号，数电票报销入账归档须保存含数字签名的 XML 源文件。
        </p>

        {/* 统计条 */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-ink-soft">
              数电票 <span className="font-mono tabular-nums">{total}</span> 张 · 已归档{' '}
              <span className="font-mono tabular-nums text-jade">{archived.length}</span> · 待补{' '}
              <span className="font-mono tabular-nums text-amber">{missing.length}</span>
            </span>
            <span className="font-mono tabular-nums text-ink-faint">{Math.round(archivedPct)}%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <motion.div
              className="h-full bg-jade"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: total > 0 ? archived.length / total : 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'left' }}
            />
            <motion.div
              className="h-full bg-amber"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: total > 0 ? missing.length / total : 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'left' }}
            />
          </div>
        </div>

        {/* 清单 */}
        {total === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-paper-deep/60 px-4 py-3.5 text-[13px] text-ink-faint">
            <FileArchive size={16} />
            台账内暂无数电票。
          </div>
        ) : (
          <ul className="divide-y divide-cinnabar-line rounded-lg border border-cinnabar-line">
            {digital.map((inv, i) => {
              const ok = hasXml(inv, xmlFiles);
              return (
                <motion.li
                  key={inv.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.04 }}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 px-4 py-3',
                    i % 2 === 1 && 'bg-paper-deep/40',
                  )}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[13px] tabular-nums text-ink">{inv.invoiceNumber || '—'}</span>
                    <span className="ml-2.5 truncate text-[12px] text-ink-faint">{inv.sellerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ok ? (
                      <SealBadge tone="jade" flat>
                        已存 XML
                      </SealBadge>
                    ) : (
                      <>
                        <SealBadge tone="amber" flat>
                          缺 XML
                        </SealBadge>
                        <button
                          type="button"
                          onClick={() => pickFile(inv.id)}
                          className="flex items-center gap-1 rounded-md border border-cinnabar-line px-2.5 py-1 text-[12px] text-ink-soft transition-all hover:bg-paper-deep active:scale-[0.97]"
                        >
                          <FileUp size={12} /> 补传 XML
                        </button>
                      </>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={exportZip}
            disabled={total === 0}
            className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-3.5 py-2 text-[13px] font-medium text-ink transition-all hover:bg-paper-deep active:scale-[0.97] disabled:opacity-50"
          >
            <Package size={14} /> 一键导出全部 XML 归档包 (.zip)
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,text/xml"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {/* 右：政策说明卡 */}
      <motion.aside
        className="h-fit rounded-xl bg-paper-deep p-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src="/compliance-doc.jpg" alt="会计档案与印章插画" className="w-full rounded-lg" />
        </motion.div>
        <h3 className="mt-5 font-serif text-[18px] font-bold text-ink">什么是 XML 归档？</h3>
        <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-ink-soft">
          <li className="flex gap-2">
            <span className="font-mono text-seal">①</span>
            PDF / OFD 仅用于预览与打印，不是法定入账格式。
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-seal">②</span>
            XML 含数字签名，是数电票的法定源文件；以 PDF/OFD 打印件报销的，必须同时保存该 XML 电子文件。
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-seal">③</span>
            开票方交付发票时，应一并通过税务数字账户或邮箱索取 XML 文件留存。
          </li>
        </ul>
        <a
          href="https://www.gov.cn/zhengce/zhengceku/2020-04/03/content_5498598.htm"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-seal hover:underline"
        >
          查看政策原文 <ExternalLink size={13} />
        </a>
      </motion.aside>
    </section>
  );
}
