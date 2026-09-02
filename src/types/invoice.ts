export interface InvoiceItem {
  name: string;
  spec?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
}

export interface Invoice {
  id: string;
  invoiceType: string;
  invoiceCode?: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  checkCode?: string;
  buyerName: string;
  buyerTaxId: string;
  sellerName: string;
  sellerTaxId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  items?: InvoiceItem[];
  remark?: string;
  status: 'normal' | 'red-flush' | 'void' | 'reimbursed';
  sourceFile?: string;
  createdAt: number;
  duplicate?: boolean;
  validationIssues?: string[];
}

export const INVOICE_STATUS_LABEL: Record<Invoice['status'], string> = {
  normal: '正常',
  'red-flush': '红冲',
  void: '作废',
  reimbursed: '已报销',
};
