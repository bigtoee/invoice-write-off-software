import { XMLParser } from 'fast-xml-parser';
import { openPdfDocument } from '@/lib/pdfjs';
import { createWorker } from 'tesseract.js';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { getSettings } from '@/lib/settings';

/** 识别通道标签（与 workbench.md 队列卡片文案一致） */
export type RecognitionChannel = 'XML 直取' | 'PDF 文本层' | '本地 OCR' | '手动录入';

export interface RecognitionResult extends Partial<Invoice> {
  /** 0-1，字段完整度与 OCR 置信度加权 */
  confidence: number;
  channel?: RecognitionChannel;
  warnings?: string[];
  rawText?: string;
}

export type ProgressFn = (p: number, stage: string) => void;

/* ------------------------------------------------------------------ */
/* 通用工具                                                            */
/* ------------------------------------------------------------------ */

const KEY_FIELDS: Array<keyof Invoice> = [
  'invoiceNumber',
  'invoiceDate',
  'buyerName',
  'sellerName',
  'totalAmount',
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
}

function parseAmount(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).replace(/[¥￥,\s]/g, '');
  if (!s) return undefined;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  // 2024年3月5日
  const cn = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/.exec(s);
  const iso = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(s.replace(/\D/g, ''));
  const m = cn ?? iso ?? compact;
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const yy = Number(y);
  if (yy < 2000 || yy > 2100) return undefined;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function detectInvoiceType(hint: string | undefined, number: string | undefined, hasCode: boolean): string | undefined {
  const h = hint ?? '';
  if (/电子发票\s*[（(]\s*增值税专用发票\s*[)）]/.test(h) || (/专用/.test(h) && /电子|数电/.test(h))) {
    return '电子发票（增值税专用发票）';
  }
  if (/增值税\s*电子\s*普通\s*发票/.test(h)) return '增值税电子普通发票'; // 传统电子普票，与数电票区分
  if (/电子发票\s*[（(]\s*普通发票\s*[)）]/.test(h) || (/普通/.test(h) && /电子|数电/.test(h))) {
    return '电子发票（普通发票）';
  }
  if (/专用/.test(h)) return '增值税专用发票';
  if (/普通|普票/.test(h)) return '增值税普通发票';
  if (/机动车/.test(h)) return '机动车销售统一发票';
  if (/二手车/.test(h)) return '二手车销售统一发票';
  if (/卷/.test(h)) return '增值税普通发票（卷式）';
  if (number && number.length === 20) return '电子发票（普通发票）';
  if (hasCode) return '增值税电子普通发票';
  return undefined;
}

/** 按关键字段完整度打分（full 为满分基准） */
function fieldConfidence(result: Partial<Invoice>, full: number): number {
  const found = KEY_FIELDS.filter((k) => {
    const v = result[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;
  return Math.round((found / KEY_FIELDS.length) * full * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* XML（数电票法定源文件）                                              */
/* ------------------------------------------------------------------ */

interface XmlMatch {
  key: string;
  value: string;
}

function walkXml(node: unknown, out: XmlMatch[], parent: Record<string, unknown> | null): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const n of node) walkXml(n, out, parent);
    return;
  }
  if (typeof node !== 'object') return;
  const rec = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    if (v !== null && typeof v === 'object') {
      walkXml(v, out, rec);
    } else if (v !== undefined && v !== null) {
      out.push({ key: k, value: String(v) });
    }
  }
}

function findAlias(flat: XmlMatch[], aliases: string[]): string | undefined {
  const norm = aliases.map(normalizeKey);
  for (const m of flat) {
    if (norm.includes(normalizeKey(m.key)) && m.value.trim()) return m.value.trim();
  }
  return undefined;
}

/** 在购/销方子树中提取名称与税号 */
function findParty(doc: unknown, containerRe: RegExp, nameAliases: string[], taxAliases: string[]): { name?: string; taxId?: string } {
  let container: unknown;
  const scan = (node: unknown, key: string | null): void => {
    if (container !== undefined || node === null || typeof node !== 'object') return;
    if (key && containerRe.test(normalizeKey(key))) {
      container = node;
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) scan(n, null);
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (v !== null && typeof v === 'object') scan(v, k);
    }
  };
  scan(doc, null);
  if (container === undefined) return {};
  const flat: XmlMatch[] = [];
  walkXml(container, flat, null);
  return { name: findAlias(flat, nameAliases), taxId: findAlias(flat, taxAliases) };
}

const XML_ALIASES = {
  type: ['invoicetype', 'einvoicecategory', 'invoicecategory', '发票种类', '发票类型', 'fplb', 'einvoicecategoryname'],
  code: ['einvoicecode', 'invoicecode', '发票代码', 'fpdm', 'fp_dm'],
  number: ['einvoicenumber', 'invoicenumber', '发票号码', 'fphm', 'fp_hm', 'invoiceno'],
  date: ['issuetime', 'issuedate', 'invoicedate', 'billingtime', '开票日期', 'kprq', 'issuetime2'],
  checkCode: ['checkcode', '校验码', 'jym'],
  amount: ['totalnet', 'totalamwithouttax', 'totalamountwithouttax', 'amountexcltax', '合计金额', 'hjje', 'totalnetamount', 'netamount'],
  tax: ['totaltax', 'totaltaxam', 'totaltaxamount', '合计税额', 'hjse', 'taxamount'],
  total: ['totalwithtax', 'totaltaxincludedamount', 'totalamounttaxincluded', 'totalamtwithtax', '价税合计', 'jshj', 'totalamountincltax'],
  remark: ['remark', 'remarks', '备注', 'bz'],
  buyerName: ['buyername', 'purchasername', '购买方名称', '购方名称', 'gmfmc', 'gmf_mc', 'buyerenterprisename'],
  buyerTax: ['buyertaxid', 'buyertaxnum', 'buyertaxnumber', 'buyertaxpayerid', '购买方纳税人识别号', '购买方税号', 'gmfnsrsbh', 'gmf_sbh', 'buyeridnumber'],
  sellerName: ['sellername', '销售方名称', '销方名称', 'xsfmc', 'xsf_mc', 'sellerenterprisename'],
  sellerTax: ['sellertaxid', 'sellertaxnum', 'sellertaxnumber', 'sellertaxpayerid', '销售方纳税人识别号', '销售方税号', 'xsfnsrsbh', 'xsf_sbh', 'selleridnumber'],
};

const PARTY_NAME_ALIASES = ['name', '名称', 'enterprisename', 'buyername', 'sellername', '购方名称', '销方名称'];
const PARTY_TAX_ALIASES = [
  'taxid', 'taxnumber', 'taxpayeridentificationnumber', 'unifiedsocialcreditcode', 'creditcode',
  '纳税人识别号', '统一社会信用代码', '税号', 'nsrsbh', 'idnumber', 'taxregistrationnumber',
];

const ITEM_NODE_RE = /^(item|goods|detail|invoiceitem|commodity|line|fp_mxxx|xm)$/;
const ITEM_NAME_ALIASES = ['name', 'itemname', 'goodsservicesname', 'goodsname', '项目名称', '货物或应税劳务名称', 'xmmc', 'spmc', '品名'];
const ITEM_SPEC_ALIASES = ['spec', 'specification', 'model', '规格型号', 'ggxh', 'uom'];
const ITEM_QTY_ALIASES = ['quantity', 'qty', '数量', 'sl'];
const ITEM_PRICE_ALIASES = ['price', 'unitprice', '单价', 'dj'];
const ITEM_RATE_ALIASES = ['taxrateorlevy', 'taxrate', 'rate', '税率', 'slv', 'taxrate2'];

function parseXmlInvoice(text: string): Partial<Invoice> {
  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
  });
  const doc: unknown = parser.parse(text);
  const flat: XmlMatch[] = [];
  walkXml(doc, flat, null);
  if (flat.length === 0) return {};

  const get = (aliases: string[]) => findAlias(flat, aliases);

  const typeRaw = get(XML_ALIASES.type);
  const code = get(XML_ALIASES.code)?.replace(/\D/g, '') || undefined;
  const number = get(XML_ALIASES.number)?.replace(/\D/g, '') || undefined;
  const date = normalizeDate(get(XML_ALIASES.date));
  const checkCode = get(XML_ALIASES.checkCode)?.replace(/\s/g, '') || undefined;

  const buyer = findParty(doc, /buyer|purchaser|购买方|购方|gmf/, PARTY_NAME_ALIASES, PARTY_TAX_ALIASES);
  const seller = findParty(doc, /seller|销售方|销方|xsf/, PARTY_NAME_ALIASES, PARTY_TAX_ALIASES);

  const result: Partial<Invoice> = {
    invoiceType: detectInvoiceType(typeRaw, number, !!code),
    invoiceCode: code,
    invoiceNumber: number,
    invoiceDate: date,
    checkCode,
    buyerName: buyer.name ?? get(XML_ALIASES.buyerName),
    buyerTaxId: (buyer.taxId ?? get(XML_ALIASES.buyerTax))?.replace(/\s/g, '').toUpperCase(),
    sellerName: seller.name ?? get(XML_ALIASES.sellerName),
    sellerTaxId: (seller.taxId ?? get(XML_ALIASES.sellerTax))?.replace(/\s/g, '').toUpperCase(),
    amount: parseAmount(get(XML_ALIASES.amount)),
    taxAmount: parseAmount(get(XML_ALIASES.tax)),
    totalAmount: parseAmount(get(XML_ALIASES.total)),
    remark: get(XML_ALIASES.remark),
  };

  // 明细行：定位 Item 节点
  const items: InvoiceItem[] = [];
  const scanItems = (node: unknown, key: string | null): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) scanItems(n, key);
      return;
    }
    if (key && ITEM_NODE_RE.test(normalizeKey(key))) {
      const sub: XmlMatch[] = [];
      walkXml(node, sub, null);
      const name = findAlias(sub, ITEM_NAME_ALIASES);
      if (name) {
        const rateRaw = findAlias(sub, ITEM_RATE_ALIASES);
        let taxRate = parseAmount(rateRaw);
        if (taxRate !== undefined && taxRate > 1) taxRate = taxRate / 100;
        items.push({
          name,
          spec: findAlias(sub, ITEM_SPEC_ALIASES),
          quantity: parseAmount(findAlias(sub, ITEM_QTY_ALIASES)),
          unitPrice: parseAmount(findAlias(sub, ITEM_PRICE_ALIASES)),
          taxRate,
        });
      }
      return; // 不再深入该 Item 的子节点
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (v !== null && typeof v === 'object') scanItems(v, k);
    }
  };
  scanItems(doc, null);
  if (items.length > 0) result.items = items;

  if (result.totalAmount === undefined && result.amount !== undefined && result.taxAmount !== undefined) {
    result.totalAmount = Math.round((result.amount + result.taxAmount) * 100) / 100;
  }

  return result;
}

/**
 * OCR 输出预处理：chi_sim 常在中文字符之间插入空格（"深 圳 市 扫 描"），
 * 直接喂给规则解析会把名称截断、让「开票日期」等标签失配。
 * 仅折叠 CJK 字符之间的半角空格/制表符（不动换行，避免跨行误拼接）。
 */
function normalizeOcrText(raw: string): string {
  return raw
.replace(/\u00a0/g, ' ')
    .replace(/([\u3400-\u9fff\uff00-\uffef])[ \t]+(?=[\u3400-\u9fff\uff00-\uffef])/g, '$1');
}

/* ------------------------------------------------------------------ */
/* 中文发票文本规则解析（PDF 文本层 / OCR 共用）                          */
/* ------------------------------------------------------------------ */

const TAX_ID_RE = /\b[0-9A-Z]{15}(?:[0-9A-Z]{3})?(?:[0-9A-Z]{2})?\b/;

function pickMoney(s: string | undefined): number | undefined {
  return parseAmount(s);
}

export function parseChineseInvoiceText(raw: string): Partial<Invoice> {
  const text = raw.replace(/\u00a0/g, ' ');
  const compact = text.replace(/\s+/g, ' ');
  const result: Partial<Invoice> = {};

  // 发票类型
  const typeM = /(电子发票\s*[（(]\s*(?:增值税专用发票|普通发票)\s*[)）]|增值税电子普通发票|增值税专用发票|增值税普通发票\s*[（(]?\s*卷式\s*[)）]?|增值税普通发票|机动车销售统一发票|二手车销售统一发票)/.exec(compact);
  result.invoiceType = detectInvoiceType(typeM?.[1], undefined, false);

  // 发票号码（数电票 20 位 / 传统 8 位）——容忍文本层碎片（数字被拆成多段、段间带空格）
  const numM = /发票号码\s*[:：]?\s*((?:\d\s*){8,24})/.exec(compact)
    ?? /号码\s*[:：]\s*((?:\d\s*){8,24})/.exec(compact)
    ?? /\b(\d{15,24})\b/.exec(compact)
    ?? /No\s*[:：]?\s*(\d{8})\b/i.exec(compact);
  if (numM) result.invoiceNumber = numM[1].replace(/\s/g, '');

  const codeM = /发票代码\s*[:：]?\s*((?:\d\s*){10,12})/.exec(compact);
  if (codeM) result.invoiceCode = codeM[1].replace(/\s/g, '');

  const dateM = /开票日期\s*[:：]?\s*((?:\d\s*){4}\s*年\s*(?:\d\s*){1,2}\s*月\s*(?:\d\s*){1,2}\s*日?|\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2})/.exec(compact);
  result.invoiceDate = normalizeDate(dateM?.[1]?.replace(/\s/g, ''));

  const checkM = /校验码\s*[:：]?\s*([\d\s]{20,26})/.exec(compact);
  if (checkM) result.checkCode = checkM[1].replace(/\s/g, '').slice(0, 20);

  // 购买方 / 销售方名称
  // 真实数电票左侧「购买方信息/销售方信息」为竖排字，文本层中被打散，
  // 最可靠的是按出现顺序取所有「名称：xxx」——版式上购买方恒在销售方之前。
  const nameMatches: string[] = [];
  const nameRe = /名\s*称\s*[:：]\s*([^\s:：，,（(]{2,40})/g;
  let nm: RegExpExecArray | null;
  while ((nm = nameRe.exec(compact)) !== null) nameMatches.push(nm[1].trim());
  if (nameMatches.length >= 2) {
    result.buyerName = nameMatches[0];
    result.sellerName = nameMatches[1];
  } else {
    const buyerM = /购\s*买\s*方[\s\S]{0,24}?名\s*称\s*[:：]?\s*([^\s:：]+)/.exec(text)
      ?? /购买方\s*[:：]?\s*([^\s:：]+)/.exec(compact)
      ?? /(?:^|\s)购\s+名\s*称\s*[:：]?\s*([^\s:：]+)/.exec(compact);
    const sellerM = /销\s*售\s*方[\s\S]{0,24}?名\s*称\s*[:：]?\s*([^\s:：]+)/.exec(text)
      ?? /销售方\s*[:：]?\s*([^\s:：]+)/.exec(compact)
      ?? /(?:^|\s)销\s+名\s*称\s*[:：]?\s*([^\s:：]+)/.exec(compact);
    if (buyerM) result.buyerName = buyerM[1].trim();
    if (sellerM) result.sellerName = sellerM[1].trim();
    if (nameMatches.length === 1 && !result.buyerName) result.buyerName = nameMatches[0];
  }

  // 税号：优先取「统一社会信用代码/纳税人识别号」标签后的值，按出现顺序 = 购买方、销售方
  const labeled: string[] = [];
  const labelRe = /(?:统一社会信用代码|纳税人识别号|税号)\s*[/／]?\s*(?:纳税人识别号)?\s*[:：]?\s*([0-9A-Z]{15,20})\b/g;
  let lm: RegExpExecArray | null;
  while ((lm = labelRe.exec(compact)) !== null) labeled.push(lm[1]);
  if (labeled.length === 0) {
    const bare: string[] = [];
    const bareRe = new RegExp(TAX_ID_RE.source, 'g');
    let bm: RegExpExecArray | null;
    while ((bm = bareRe.exec(compact)) !== null) {
      if (bm[0] !== result.invoiceNumber && bm[0] !== result.invoiceCode) bare.push(bm[0]);
    }
    labeled.push(...bare.slice(0, 2));
  }
  if (labeled[0]) result.buyerTaxId = labeled[0];
  if (labeled[1]) result.sellerTaxId = labeled[1];

  // 在指定标签每次出现后的窗口内提取所有 ¥ 金额（真实 PDF 文本层中标签与金额常被拆行/拆段）。
  // skipPrefix：标签前若紧跟这些字符（忽略空格）则跳过该次出现——用于把「价税合计」排除在「合计」之外。
  const amountsAfter = (labelRe: RegExp, window: number, skipPrefix?: string): number[] => {
    const out: number[] = [];
    const re = new RegExp(labelRe.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(compact)) !== null) {
      if (skipPrefix) {
        const before = compact.slice(Math.max(0, m.index - 6), m.index).replace(/\s/g, '');
        if (before.endsWith(skipPrefix)) continue;
      }
      const seg = compact.slice(m.index, m.index + m[0].length + window);
      const yenRe = /[¥￥]\s*([\d,]+\.?\d{0,2})/g;
      let am: RegExpExecArray | null;
      while ((am = yenRe.exec(seg)) !== null) {
        const v = pickMoney(am[1]);
        if (v !== undefined) out.push(v);
      }
      break; // 只取第一次有效出现
    }
    return out;
  };

  // 价税合计（小写）：取「小写）」后首个 ¥；否则取「价税合计」窗口内最后一个 ¥ 金额
  const smallM = /[（(]\s*小\s*写\s*[)）]\s*[¥￥]?\s*([\d,]+\.?\d{0,2})/.exec(compact);
  if (smallM) {
    result.totalAmount = pickMoney(smallM[1]);
  } else {
    const wins = amountsAfter(/价\s*税\s*合\s*计/, 120);
    if (wins.length > 0) result.totalAmount = wins[wins.length - 1];
  }

  // OCR 兜底：¥ 常被误识别为「对/3/中」等，退化为「价税合计」窗口内最后一个两位小数
  if (result.totalAmount === undefined) {
    const jshj = /价\s*税\s*合\s*计/.exec(compact);
    if (jshj) {
      const win = compact.slice(jshj.index, jshj.index + 100);
      const nums = [...win.matchAll(/(\d[\d,]*\.\d{2})/g)];
      if (nums.length > 0) result.totalAmount = pickMoney(nums[nums.length - 1][1]);
    }
  }

  // 合计金额 / 合计税额：明细表「合 计」行的两个 ¥ 金额（排除「价税合计」所在行）
  const wins = amountsAfter(/合\s*计/, 80, '价税');
  if (wins.length >= 2) {
    result.amount = wins[0];
    result.taxAmount = wins[1];
  }

  // OCR 兜底：无 ¥ 时取「合计」（非价税合计）后紧邻的两个两位小数
  if (result.amount === undefined || result.taxAmount === undefined) {
    const hjRe = /合\s*计/g;
    let hm: RegExpExecArray | null;
    while ((hm = hjRe.exec(compact)) !== null) {
      const before = compact.slice(Math.max(0, hm.index - 4), hm.index).replace(/\s/g, '');
      if (before.endsWith('价税')) continue;
      const seg = compact.slice(hm.index, hm.index + 40);
      const dm = /(\d[\d,]*\.\d{2})[\s\S]{0,12}?(\d[\d,]*\.\d{2})/.exec(seg);
      if (dm) {
        if (result.amount === undefined) result.amount = pickMoney(dm[1]);
        if (result.taxAmount === undefined) result.taxAmount = pickMoney(dm[2]);
        break;
      }
    }
  }

  const remarkM = /备\s*注\s*[:：]?\s*([^\n]{2,80})/.exec(text);
  if (remarkM) result.remark = remarkM[1].trim();

  if (result.totalAmount === undefined && result.amount !== undefined && result.taxAmount !== undefined) {
    result.totalAmount = Math.round((result.amount + result.taxAmount) * 100) / 100;
  }
  if (!result.invoiceType && result.invoiceNumber) {
    result.invoiceType = detectInvoiceType(undefined, result.invoiceNumber, !!result.invoiceCode);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* PDF 文本层提取                                                       */
/* ------------------------------------------------------------------ */

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

/**
 * 真实发票 PDF 的文本层高度碎片化：同一逻辑字符串被拆成多个 text item
 * （数字断段、表格单元格独立、字体切换导致基线抖动、左侧竖排标签逐字成项）。
 * 因此按 Y 聚簇 + 按 X 排序 + 按间隙拼接：相邻碎片直接相连，栏位空隙才补空格。
 */
async function extractPdfText(file: File, onProgress?: ProgressFn): Promise<string> {
  const data = await file.arrayBuffer();
  const doc = await openPdfDocument(data).promise;
  const chunks: string[] = [];
  const Y_TOL = 4; // 基线抖动容忍（不同字体混排时同行基线可差 2-4px）
  const GAP_SP = 2; // 超过此间隙（用户单位）视为栏位分隔，补一个空格
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str) continue;
        const t = item.transform as number[];
        items.push({ str: item.str, x: t[4], y: t[5], w: item.width ?? 0 });
      }
      // 页面坐标 y 向上：先按 y 降序（视觉上从上到下），再按 x 升序
      items.sort((a, b) => (Math.abs(b.y - a.y) > Y_TOL ? b.y - a.y : a.x - b.x));
      const lines: PdfTextItem[][] = [];
      let cur: PdfTextItem[] = [];
      let curY: number | null = null;
      for (const it of items) {
        if (curY !== null && Math.abs(it.y - curY) > Y_TOL) {
          lines.push(cur);
          cur = [];
          curY = null;
        }
        cur.push(it);
        curY = curY === null ? it.y : (curY + it.y) / 2; // 滚动均值，防漂移
      }
      if (cur.length) lines.push(cur);
      for (const line of lines) {
        line.sort((a, b) => a.x - b.x);
        let s = '';
        let prevEnd: number | null = null;
        for (const it of line) {
          if (prevEnd !== null && it.x - prevEnd > GAP_SP && s && !s.endsWith(' ') && !/^\s/.test(it.str)) {
            s += ' ';
          }
          s += it.str;
          prevEnd = Math.max(prevEnd ?? 0, it.x + it.w);
        }
        if (s.trim()) chunks.push(s);
      }
      onProgress?.(0.1 + 0.65 * (p / doc.numPages), `提取文本层 ${p}/${doc.numPages}`);
    }
  } finally {
    void doc.destroy();
  }
  return chunks.join('\n');
}

/* ------------------------------------------------------------------ */
/* 图片 OCR（tesseract.js + chi_sim）                                   */
/* ------------------------------------------------------------------ */

/**
 * OCR 引擎资产全部随站点本地分发（public/tesseract/），不再依赖任何外部 CDN。
 * 默认配置会从 jsdelivr / tessdata 远程仓库拉取 worker、core wasm 与语言包，
 * 国内移动网络下手机端经常拉取失败 → 图片/扫描件识别挂死。
 * corePath 固定指向无 SIMD 的通用核心：所有浏览器（含老 iOS / 老 WebView）都能实例化，
 * 避免按 SIMD 能力分发三个变体带来约 20MB 的包体膨胀。
 */
const TESSERACT_LOCAL_ASSETS = {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract/core/tesseract-core-lstm.wasm.js',
  langPath: '/tesseract/lang',
};

async function ocrImage(file: File, onProgress?: ProgressFn): Promise<{ text: string; ocrConfidence: number }> {
  const lang = getSettings().ocrLang;
  let worker;
  try {
    worker = await createWorker(lang, undefined, {
      ...TESSERACT_LOCAL_ASSETS,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          onProgress?.(0.15 + 0.7 * m.progress, '本地 OCR');
        }
      },
    });
  } catch (err) {
    console.warn('[票核] 本地 OCR 引擎加载失败：', err instanceof Error ? err.message : err);
    return { text: '', ocrConfidence: 0 };
  }
  try {
    onProgress?.(0.15, '本地 OCR');
    const { data } = await worker.recognize(file);
    return { text: data.text, ocrConfidence: (data.confidence ?? 0) / 100 };
  } finally {
    await worker.terminate();
  }
}

/* ------------------------------------------------------------------ */
/* 入口：按文件类型路由                                                  */
/* ------------------------------------------------------------------ */

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png']);

export function fileExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/**
 * 文件名兜底：税务平台下载的文件名自带关键信息，
 * 如 dzfp_25332000000007049516_杭州沫尚文化创意有限公司_20250223143442.pdf
 */
function hintsFromFilename(name: string): Partial<Invoice> {
  const base = name.replace(/\.[a-z0-9]+$/i, '');
  const out: Partial<Invoice> = {};
  const numM = /(?<!\d)(\d{15,24})(?!\d)/.exec(base) ?? /(?<!\d)(\d{8})(?!\d)/.exec(base);
  if (numM) out.invoiceNumber = numM[1];
  const dateRuns = base.match(/\d{14}|\d{8}/g);
  if (dateRuns) {
    const last = dateRuns[dateRuns.length - 1];
    const d = normalizeDate(`${last.slice(0, 4)}-${last.slice(4, 6)}-${last.slice(6, 8)}`);
    if (d) out.invoiceDate = d;
  }
  return out;
}

/**
 * 智能识别管线：.xml 直取结构化数据 → .pdf 文本层规则解析 → 图片客户端 OCR。
 * 解析失败不抛死：返回部分字段 + confidence=0，交由用户手动补录。
 */
export async function recognizeFile(file: File, onProgress?: ProgressFn): Promise<RecognitionResult> {
  const ext = fileExt(file.name);
  try {
    if (ext === 'xml') {
      onProgress?.(0.1, '读取文件');
      const text = await file.text();
      onProgress?.(0.5, '解析 XML');
      const result = parseXmlInvoice(text);
      onProgress?.(0.9, '提取字段');
      const confidence = fieldConfidence(result, 1);
      return {
        ...result,
        confidence,
        channel: 'XML 直取',
        rawText: text.slice(0, 4000),
        warnings: confidence < 1 ? ['部分票面要素未能从 XML 中提取，请人工核对'] : undefined,
      };
    }

    if (ext === 'pdf') {
      onProgress?.(0.05, '读取文件');
      const text = await extractPdfText(file, onProgress);
      if (text.replace(/\s/g, '').length < 20) {
        // 无文本层（扫描件/图片型 PDF）：渲染首页为图片，自动走本地 OCR
        onProgress?.(0.2, '扫描件转图片');
        const { renderPdfPageToBlob } = await import('@/lib/preview');
        const blob = await renderPdfPageToBlob(file);
        if (blob) {
          const png = new File([blob], file.name.replace(/\.pdf$/i, '') + '.png', { type: 'image/png' });
          const { text: ocrRaw, ocrConfidence } = await ocrImage(png, onProgress);
          const ocrText = normalizeOcrText(ocrRaw);
          if (ocrText.replace(/\s/g, '').length >= 10) {
            onProgress?.(0.9, '规则解析');
            const result = parseChineseInvoiceText(ocrText);
            const hints = hintsFromFilename(file.name);
            result.invoiceNumber ??= hints.invoiceNumber;
            result.invoiceDate ??= hints.invoiceDate;
            const fields = fieldConfidence(result, 0.9);
            const confidence = Math.round(Math.min(fields, Math.max(0.1, ocrConfidence) * 0.9) * 100) / 100;
            const warnings: string[] = ['PDF 无文本层，已按扫描件自动转本地 OCR 识别'];
            if (ocrConfidence < 0.7) warnings.push('OCR 置信度偏低（票面可能模糊，请人工核对）');
            if (fields < 0.7) warnings.push('部分票面要素未识别，请人工核对');
            return {
              ...result,
              confidence,
              channel: '本地 OCR',
              rawText: ocrText.slice(0, 4000),
              warnings,
            };
          }
        }
        return {
          confidence: 0,
          channel: 'PDF 文本层',
          warnings: ['PDF 无文本层（可能为扫描件），本地 OCR 未提取到有效内容，请导出为图片后重试或手动录入'],
        };
      }
      onProgress?.(0.85, '规则解析');
      const result = parseChineseInvoiceText(text);
      const hints = hintsFromFilename(file.name);
      result.invoiceNumber ??= hints.invoiceNumber;
      result.invoiceDate ??= hints.invoiceDate;
      const confidence = fieldConfidence(result, 0.95);
      return {
        ...result,
        confidence,
        channel: 'PDF 文本层',
        rawText: text.slice(0, 4000),
        warnings: confidence < 0.7 ? ['部分票面要素未识别，请人工核对'] : undefined,
      };
    }

    if (IMAGE_EXT.has(ext)) {
      onProgress?.(0.05, '初始化 OCR 引擎');
      const { text: ocrRaw, ocrConfidence } = await ocrImage(file, onProgress);
      const text = normalizeOcrText(ocrRaw);
      onProgress?.(0.9, '规则解析');
      const result = parseChineseInvoiceText(text);
      const hints = hintsFromFilename(file.name);
      result.invoiceNumber ??= hints.invoiceNumber;
      result.invoiceDate ??= hints.invoiceDate;
      const fields = fieldConfidence(result, 0.9);
      const confidence = Math.round(Math.min(fields, Math.max(0.1, ocrConfidence) * 0.9) * 100) / 100;
      const warnings: string[] = [];
      if (ocrConfidence < 0.7) warnings.push('OCR 置信度偏低（图片可能模糊，建议重拍）');
      if (fields < 0.7) warnings.push('部分票面要素未识别，请人工核对');
      return {
        ...result,
        confidence,
        channel: '本地 OCR',
        rawText: text.slice(0, 4000),
        warnings: warnings.length ? warnings : undefined,
      };
    }

    if (ext === 'ofd') {
      return {
        confidence: 0,
        channel: '手动录入',
        warnings: ['OFD 版式文件暂不支持浏览器端自动识别，请手动录入票面要素'],
      };
    }

    return { confidence: 0, warnings: [`不支持的文件格式 .${ext || '未知'}，请手动录入`] };
  } catch (err) {
    return {
      confidence: 0,
      warnings: [`识别过程出错：${err instanceof Error ? err.message : String(err)}，请手动录入`],
    };
  }
}
