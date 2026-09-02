import * as XLSX from 'xlsx';
import type { Invoice } from '@/types/invoice';
import { INVOICE_STATUS_LABEL } from '@/types/invoice';

/** 导出台账 Excel（中文表头），触发浏览器下载。 */
export function exportLedgerXlsx(invoices: Invoice[]): void {
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
  // 数字列保留两位小数格式
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let r = 1; r <= range.e.r; r++) {
    for (const c of [10, 11, 12]) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '发票台账');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `发票台账_${stamp}.xlsx`);
}
