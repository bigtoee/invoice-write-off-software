import * as XLSX from 'xlsx';
import type { Invoice } from '@/types/invoice';
import { INVOICE_STATUS_LABEL } from '@/types/invoice';
import { exportLedgerXlsx } from '@/lib/export';

/**
 * 归纳导出：票面要素表 + 可选商品明细表。
 * 不含商品明细时直接复用全局 exportLedgerXlsx。
 */
export function exportFullLedger(invoices: Invoice[], includeItems: boolean): { rows: number; sheets: number } {
  if (!includeItems) {
    exportLedgerXlsx(invoices);
    return { rows: invoices.length, sheets: 1 };
  }

  const header = [
    '序号', '发票类型', '发票代码', '发票号码', '开票日期', '校验码',
    '购买方名称', '购买方税号', '销售方名称', '销售方税号',
    '金额', '税额', '价税合计', '状态', '是否重复', '校验问题', '来源文件', '备注',
  ];
  const rows = invoices.map((inv, i) => [
    i + 1,
    inv.invoiceType,
    inv.invoiceCode ?? '',
    inv.invoiceNumber,
    inv.invoiceDate,
    inv.checkCode ?? '',
    inv.buyerName,
    inv.buyerTaxId,
    inv.sellerName,
    inv.sellerTaxId,
    inv.amount,
    inv.taxAmount,
    inv.totalAmount,
    INVOICE_STATUS_LABEL[inv.status] ?? inv.status,
    inv.duplicate ? '是' : '',
    (inv.validationIssues ?? []).join('；'),
    inv.sourceFile ?? '',
    inv.remark ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 6 }, { wch: 26 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 22 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 24 }, { wch: 20 },
  ];

  const itemHeader = ['发票号码', '开票日期', '销售方名称', '商品/服务名称', '规格型号', '数量', '单价', '税率'];
  const itemRows: Array<Array<string | number>> = [];
  for (const inv of invoices) {
    for (const it of inv.items ?? []) {
      itemRows.push([
        inv.invoiceNumber,
        inv.invoiceDate,
        inv.sellerName,
        it.name,
        it.spec ?? '',
        it.quantity ?? '',
        it.unitPrice ?? '',
        typeof it.taxRate === 'number' ? `${Math.round(it.taxRate * 100)}%` : '',
      ]);
    }
  }
  const wsItems = XLSX.utils.aoa_to_sheet([itemHeader, ...itemRows]);
  wsItems['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '票面要素');
  XLSX.utils.book_append_sheet(wb, wsItems, '商品明细');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `发票台账_${stamp}.xlsx`);
  return { rows: invoices.length, sheets: 2 };
}
