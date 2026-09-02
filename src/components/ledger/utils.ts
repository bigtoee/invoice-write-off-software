import type { Invoice } from '@/types/invoice';
import { INVOICE_STATUS_LABEL } from '@/types/invoice';
import type { SealBadgeTone } from '@/components/SealBadge';

/** 图表专用低饱和色序（design.md） */
export const CHART_COLORS = ['#C03F2B', '#3E7A5E', '#B97E1E', '#6B5B8C', '#4A6E8A', '#8A8378'] as const;

export const STATUS_TONE: Record<Invoice['status'], SealBadgeTone> = {
  normal: 'jade',
  'red-flush': 'seal',
  void: 'seal',
  reimbursed: 'ink-soft',
};

export const STATUS_HEX: Record<Invoice['status'], string> = {
  normal: '#3E7A5E',
  reimbursed: '#4A453D',
  'red-flush': '#C03F2B',
  void: 'rgba(192,63,43,0.5)',
};

export const STATUS_LIST: Invoice['status'][] = ['normal', 'reimbursed', 'red-flush', 'void'];

/** 筛选用的状态值：四种真实状态 + 待确认（有异常/重复） */
export type StatusFilter = Invoice['status'] | 'pending';

export const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  ...STATUS_LIST.map((s) => ({ value: s as StatusFilter, label: INVOICE_STATUS_LABEL[s] })),
  { value: 'pending', label: '待确认' },
];

export function statusLabel(s: Invoice['status']): string {
  return INVOICE_STATUS_LABEL[s] ?? s;
}

/** 类型归并：数电票 / 增值税专票 / 增值税普票 / 其他 */
export function typeCategory(invoiceType: string): string {
  const t = invoiceType || '';
  if (/数电/.test(t) || /电子/.test(t)) return '数电票';
  if (/专用/.test(t)) return '增值税专票';
  if (/普通/.test(t)) return '增值税普票';
  return '其他';
}

export const TYPE_OPTIONS = ['数电票', '增值税专票', '增值税普票', '其他'] as const;

const TAX_ID_RE = /^[0-9A-Z]{15}$|^[0-9A-Z]{18}$|^[0-9A-Z]{20}$/;

export interface CheckDots {
  /** 勾稽：价税合计 = 金额 + 税额（±0.01） */
  recon: boolean;
  /** 税号格式 */
  taxId: boolean;
  /** 查重 */
  dup: boolean;
}

export function getChecks(inv: Invoice): CheckDots {
  const diff = Math.abs(inv.totalAmount - inv.amount - inv.taxAmount);
  const recon = !Number.isNaN(diff) && diff <= 0.01;
  const taxId =
    (!inv.buyerTaxId || TAX_ID_RE.test(inv.buyerTaxId.trim().toUpperCase())) &&
    (!inv.sellerTaxId || TAX_ID_RE.test(inv.sellerTaxId.trim().toUpperCase()));
  const dup = !inv.duplicate && !(inv.validationIssues ?? []).some((i) => i.includes('重复'));
  return { recon, taxId, dup };
}

export function isAbnormal(inv: Invoice): boolean {
  const c = getChecks(inv);
  return !c.recon || !c.taxId || !c.dup || (inv.validationIssues?.length ?? 0) > 0;
}

export function monthKey(dateStr: string): string {
  return (dateStr || '').slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${y}年${Number(m)}月`;
}

/** 从 anchor（YYYY-MM）往前推 n 个月，返回 YYYY-MM 列表（升序） */
export function trailingMonths(anchor: string, n: number): string[] {
  const [y, m] = anchor.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function hasXmlArchive(inv: Invoice): boolean {
  return !!inv.sourceFile && /\.xml$/i.test(inv.sourceFile);
}

export const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];
