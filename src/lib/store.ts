import { openDB, type IDBPDatabase } from 'idb';
import type { Invoice } from '@/types/invoice';

const DB_NAME = 'invoicecore';
const STORE = 'invoices';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
          store.createIndex('invoiceDate', 'invoiceDate', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  const all = (await db.getAll(STORE)) as Invoice[];
  return all.sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
}

export async function addInvoice(inv: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
  const db = await getDB();
  const full: Invoice = { ...inv, id: genId(), createdAt: Date.now() };
  await db.put(STORE, full);
  return full;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  const db = await getDB();
  const existing = (await db.get(STORE, id)) as Invoice | undefined;
  if (!existing) return;
  await db.put(STORE, { ...existing, ...patch, id });
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}

export async function countInvoices(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}

export async function storageUsage(): Promise<{ used: number; quota: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { used: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { used: 0, quota: 0 };
}

const SAMPLE_BUYER = {
  buyerName: '杭州云栖科技有限公司',
  buyerTaxId: '91330106MA27X2Y88K',
};

type SampleSeed = Omit<Invoice, 'id' | 'createdAt'>;

const SAMPLE_INVOICES: SampleSeed[] = [
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '243170000002',
    invoiceDate: '2025-11-08',
    ...SAMPLE_BUYER,
    sellerName: '苏州墨田办公设备有限公司',
    sellerTaxId: '91320594MA1WJK3H2X',
    amount: 890.0, taxAmount: 115.7, totalAmount: 1005.7,
    items: [
      { name: '办公用品*复印纸', spec: 'A4 70g', quantity: 20, unitPrice: 28.5, taxRate: 0.13 },
      { name: '办公用品*签字笔', spec: '0.5mm', quantity: 100, unitPrice: 3.2, taxRate: 0.13 },
    ],
    status: 'reimbursed', sourceFile: '墨田办公-11月.pdf',
  },
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '243170000315',
    invoiceDate: '2025-11-15',
    ...SAMPLE_BUYER,
    sellerName: '北京青云云计算股份有限公司',
    sellerTaxId: '91110108MA01C7T33B',
    amount: 18867.92, taxAmount: 1132.08, totalAmount: 20000.0,
    items: [{ name: '信息技术服务*云服务器租赁', spec: '包年', quantity: 1, unitPrice: 18867.92, taxRate: 0.06 }],
    status: 'normal', sourceFile: '青云云-年费.xml',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '244220000018',
    invoiceDate: '2025-12-02',
    ...SAMPLE_BUYER,
    sellerName: '杭州青竹印务有限公司',
    sellerTaxId: '91330109MA2B1Q4D6P',
    amount: 320.39, taxAmount: 7.61, totalAmount: 328.0,
    items: [{ name: '印刷服务*名片印制', quantity: 10, unitPrice: 32.04, taxRate: 0.01 }],
    status: 'normal', sourceFile: '青竹印务-名片.ofd',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '244220000018',
    invoiceDate: '2025-12-02',
    ...SAMPLE_BUYER,
    sellerName: '杭州青竹印务有限公司',
    sellerTaxId: '91330109MA2B1Q4D6P',
    amount: 320.39, taxAmount: 7.61, totalAmount: 328.0,
    items: [{ name: '印刷服务*名片印制', quantity: 10, unitPrice: 32.04, taxRate: 0.01 }],
    status: 'normal', sourceFile: '青竹印务-名片-重复上传.pdf', duplicate: true,
    validationIssues: ['与已有发票号码重复'],
  },
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '250310000771',
    invoiceDate: '2025-12-19',
    ...SAMPLE_BUYER,
    sellerName: '上海澜庭酒店管理有限公司',
    sellerTaxId: '91310115MA1K4PQ91T',
    amount: 1358.49, taxAmount: 81.51, totalAmount: 1440.0,
    items: [{ name: '住宿服务*住宿费', spec: '3晚', quantity: 3, unitPrice: 452.83, taxRate: 0.06 }],
    status: 'reimbursed', sourceFile: '澜庭酒店-上海出差.pdf', remark: '12月上海出差住宿',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '251090000234',
    invoiceDate: '2026-01-06',
    ...SAMPLE_BUYER,
    sellerName: '深圳迅捷物流有限公司',
    sellerTaxId: '91440300MA5F8K2X7Q',
    amount: 440.37, taxAmount: 39.63, totalAmount: 480.0,
    items: [{ name: '运输服务*快递费', quantity: 1, unitPrice: 440.37, taxRate: 0.09 }],
    status: 'normal', sourceFile: '迅捷物流-1月.jpg',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '251090000519',
    invoiceDate: '2026-01-14',
    ...SAMPLE_BUYER,
    sellerName: '广州半盏餐饮管理有限公司',
    sellerTaxId: '91440106MA59T3RW2L',
    amount: 627.36, taxAmount: 62.64, totalAmount: 690.0,
    items: [{ name: '餐饮服务*餐费', quantity: 1, unitPrice: 627.36, taxRate: 0.06 }],
    status: 'normal', sourceFile: '半盏餐饮-客户宴请.jpg', remark: '客户接待',
  },
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '253130000088',
    invoiceDate: '2026-01-22',
    ...SAMPLE_BUYER,
    sellerName: '南京衡准财税咨询有限公司',
    sellerTaxId: '91320105MA1XQ8C55N',
    amount: 4716.98, taxAmount: 283.02, totalAmount: 5000.0,
    items: [{ name: '咨询服务*年度财税顾问费', quantity: 1, unitPrice: 4716.98, taxRate: 0.06 }],
    status: 'normal', sourceFile: '衡准财税-顾问费.xml',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '256620000147',
    invoiceDate: '2026-02-03',
    ...SAMPLE_BUYER,
    sellerName: '成都轨行交通集团有限公司',
    sellerTaxId: '91510100MA61R7T48A',
    amount: 92.45, taxAmount: 7.55, totalAmount: 100.0,
    items: [{ name: '运输服务*市内交通费', quantity: 1, unitPrice: 92.45, taxRate: 0.09 }],
    status: 'void', sourceFile: '市内交通-2月.pdf', remark: '行程取消，已作废',
  },
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '253130000291',
    invoiceDate: '2026-02-11',
    ...SAMPLE_BUYER,
    sellerName: '北京青云云计算股份有限公司',
    sellerTaxId: '91110108MA01C7T33B',
    amount: 4716.98, taxAmount: 283.02, totalAmount: 5000.0,
    items: [{ name: '信息技术服务*对象存储扩容', quantity: 1, unitPrice: 4716.98, taxRate: 0.06 }],
    status: 'normal', sourceFile: '青云云-扩容.xml',
  },
  {
    invoiceType: '电子发票（增值税专用发票）',
    invoiceNumber: '250310000900',
    invoiceDate: '2026-02-25',
    ...SAMPLE_BUYER,
    sellerName: '上海澜庭酒店管理有限公司',
    sellerTaxId: '91310115MA1K4PQ91T',
    amount: -452.83, taxAmount: -27.17, totalAmount: -480.0,
    items: [{ name: '住宿服务*住宿费（红字）', quantity: 1, unitPrice: -452.83, taxRate: 0.06 }],
    status: 'red-flush', sourceFile: '澜庭酒店-红冲.xml', remark: '对应 250310000771 部分红冲',
  },
  {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '244220000213',
    invoiceDate: '2026-03-05',
    ...SAMPLE_BUYER,
    sellerName: '杭州青竹印务有限公司',
    sellerTaxId: '91330109MA2B1Q4D6P',
    amount: 1000.0, taxAmount: 130.0, totalAmount: 1130.0,
    items: [{ name: '印刷服务*宣传册印制', spec: 'A4 32P', quantity: 500, unitPrice: 2.0, taxRate: 0.13 }],
    status: 'normal', sourceFile: '青竹印务-宣传册.pdf',
  },
];

/** 写入 12 张覆盖各类型/月份/状态的示例发票（含 2 张同号重复票）。先清空再写入。 */
export async function loadSampleData(): Promise<void> {
  await clearAll();
  for (const inv of SAMPLE_INVOICES) {
    await addInvoice(inv);
  }
}
