import type { Invoice } from '@/types/invoice';

const TAX_ID_RE = /^[0-9A-Z]{15}$|^[0-9A-Z]{18}$|^[0-9A-Z]{20}$/;

/**
 * 合规校验：查重、要素勾稽、税号格式、必填缺失。
 * 返回问题描述数组，空数组表示通过。
 */
export function validateInvoice(inv: Invoice, existing: Invoice[]): string[] {
  const issues: string[] = [];

  // 必填缺失
  const required: Array<[keyof Invoice, string]> = [
    ['invoiceNumber', '发票号码缺失'],
    ['invoiceDate', '开票日期缺失'],
    ['buyerName', '购买方名称缺失'],
    ['sellerName', '销售方名称缺失'],
    ['invoiceType', '发票类型缺失'],
  ];
  for (const [key, msg] of required) {
    const v = inv[key];
    if (v === undefined || v === null || String(v).trim() === '') issues.push(msg);
  }
  if (typeof inv.totalAmount !== 'number' || Number.isNaN(inv.totalAmount)) {
    issues.push('价税合计缺失或无效');
  }

  // 查重：号码相同且不是同一条记录
  if (inv.invoiceNumber) {
    const dup = existing.some((e) => e.invoiceNumber === inv.invoiceNumber && e.id !== inv.id);
    if (dup) issues.push('与已有发票号码重复');
  }

  // 要素勾稽：价税合计 = 金额 + 税额（±0.01 尾差容忍）
  if (
    typeof inv.amount === 'number' &&
    typeof inv.taxAmount === 'number' &&
    typeof inv.totalAmount === 'number' &&
    !Number.isNaN(inv.amount) &&
    !Number.isNaN(inv.taxAmount) &&
    !Number.isNaN(inv.totalAmount)
  ) {
    const diff = Math.abs(inv.totalAmount - inv.amount - inv.taxAmount);
    if (diff > 0.01) {
      issues.push(
        `价税合计与金额+税额不符（尾差 ¥${diff.toFixed(2)}，请核对票面）`,
      );
    }
  }

  // 税号格式：15/18/20 位字母数字
  if (inv.buyerTaxId && !TAX_ID_RE.test(inv.buyerTaxId.trim().toUpperCase())) {
    issues.push('购买方税号格式不正确（应为 15/18/20 位字母数字）');
  }
  if (inv.sellerTaxId && !TAX_ID_RE.test(inv.sellerTaxId.trim().toUpperCase())) {
    issues.push('销售方税号格式不正确（应为 15/18/20 位字母数字）');
  }

  return issues;
}

/** 千分位 + ¥，tabular-nums 场景使用 */
export function formatCNY(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}¥${grouped}.${decPart}`;
}
