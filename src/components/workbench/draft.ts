import type { Invoice, InvoiceItem } from '@/types/invoice';
import type { QueueItem } from './queue-types';

/** 抽屉内可编辑草稿（金额以字符串编辑，入库时解析） */
export interface DraftFields {
  invoiceType: string;
  invoiceCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  checkCode: string;
  buyerName: string;
  buyerTaxId: string;
  sellerName: string;
  sellerTaxId: string;
  amount: string;
  taxAmount: string;
  totalAmount: string;
  remark: string;
  items: InvoiceItem[];
}

export function draftFromResult(item: QueueItem): DraftFields {
  const r: Partial<Invoice> = item.result ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
  return {
    invoiceType: r.invoiceType ?? '',
    invoiceCode: r.invoiceCode ?? '',
    invoiceNumber: r.invoiceNumber ?? '',
    invoiceDate: r.invoiceDate ?? '',
    checkCode: r.checkCode ?? '',
    buyerName: r.buyerName ?? '',
    buyerTaxId: r.buyerTaxId ?? '',
    sellerName: r.sellerName ?? '',
    sellerTaxId: r.sellerTaxId ?? '',
    amount: num(r.amount),
    taxAmount: num(r.taxAmount),
    totalAmount: num(r.totalAmount),
    remark: r.remark ?? '',
    items: (r.items ?? []).map((it) => ({ ...it })),
  };
}

export function parseNum(s: string): number {
  const n = Number.parseFloat(s.replace(/[¥￥,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
}

/** 草稿 → Invoice（校验与入库共用） */
export function draftToInvoice(draft: DraftFields, sourceFile: string): Invoice {
  return {
    id: 'draft',
    createdAt: 0,
    status: 'normal',
    invoiceType: draft.invoiceType.trim(),
    invoiceCode: draft.invoiceCode.trim() || undefined,
    invoiceNumber: draft.invoiceNumber.trim(),
    invoiceDate: draft.invoiceDate.trim(),
    checkCode: draft.checkCode.trim() || undefined,
    buyerName: draft.buyerName.trim(),
    buyerTaxId: draft.buyerTaxId.trim().toUpperCase(),
    sellerName: draft.sellerName.trim(),
    sellerTaxId: draft.sellerTaxId.trim().toUpperCase(),
    amount: parseNum(draft.amount),
    taxAmount: parseNum(draft.taxAmount),
    totalAmount: parseNum(draft.totalAmount),
    items: draft.items.length ? draft.items : undefined,
    remark: draft.remark.trim() || undefined,
    sourceFile,
  };
}
