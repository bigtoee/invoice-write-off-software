/* 端到端验证：直接运行修复后的 recognition.ts 真实源码 */
const fs = require('node:fs');
const path = require('node:path');
const { parseChineseInvoiceText, recognizeFile, __setPdfjsAssets } = require('./bundle.cjs');

// Node 环境下把 pdf.js 的 CID 字库/标准字体指向本地 node_modules（浏览器为 /cmaps/、/standard_fonts/）
{
  const nm = path.resolve(__dirname, '../node_modules/pdfjs-dist');
  __setPdfjsAssets({ cMapUrl: path.join(nm, 'cmaps') + '/', standardFontDataUrl: path.join(nm, 'standard_fonts') + '/', wasmUrl: path.join(nm, 'wasm') + '/', iccUrl: path.join(nm, 'iccs') + '/' });
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`  ✓ ${name}: ${JSON.stringify(actual)}`); }
  else { fail++; console.log(`  ✗ ${name}: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`); }
}

(async () => {
  /* ---------- T1：用户真实发票的碎片化文本层（按截图逐字段重建） ---------- */
  console.log('\n[T1] 用户真实发票「杭州沫尚」碎片文本层 → 规则解析');
  const realText = [
    '电子发票（普通发票）',
    '发票号码：2533200000000704 95168',          // 号码断两段
    '开票日期：2025 年02月23日',                  // 日期碎片
    '共1页 第1页',
    '购', '名称：深圳前海麦格美科技集团有限公司', '买', '方', '信', '息',   // 竖排标签打散
    '统一社会信用代码/纳税人识别号：91440300MA5ENKC13N',
    '销', '名称：杭州沫尚文化创意有限公司', '售', '方', '信', '息',
    '统一社会信用代码/纳税人识别号：91330105MAC0HMGP8M',
    '项目名称 规格型号 单 位 数 量 单 价 金 额 税率/征收率 税 额',
    '*工艺品*工艺品 件 1 81.6732673267327 81.67 1% 0.82',
    '合 计',                                     // 合计标签与金额分行
    '¥81.67 ¥0.82',
    '价税合计（大写） ⊗捌拾贰圆肆角玖分',
    '（小写）¥82.49',
    '备', '注',
  ].join('\n');
  const r1 = parseChineseInvoiceText(realText);
  check('发票号码', r1.invoiceNumber, '253320000000070495168');
  check('开票日期', r1.invoiceDate, '2025-02-23');
  check('购买方名称', r1.buyerName, '深圳前海麦格美科技集团有限公司');
  check('销售方名称', r1.sellerName, '杭州沫尚文化创意有限公司');
  check('购买方税号', r1.buyerTaxId, '91440300MA5ENKC13N');
  check('销售方税号', r1.sellerTaxId, '91330105MAC0HMGP8M');
  check('合计金额', r1.amount, 81.67);
  check('合计税额', r1.taxAmount, 0.82);
  check('价税合计', r1.totalAmount, 82.49);
  check('发票类型', r1.invoiceType, '电子发票（普通发票）');

  /* ---------- T2：端到端 PDF → pdf.js 提取 → 规则解析 ---------- */
  const DIR = '/mnt/agents/output/发票测试包';
  const cases = [
    ['09_真实碎片版式_数电票.pdf', {
      invoiceNumber: '253320000000070495168', invoiceDate: '2025-02-23',
      buyerName: '深圳前海麦格美科技集团有限公司', sellerName: '杭州沫尚文化创意有限公司',
      buyerTaxId: '91440300MA5ENKC13N', sellerTaxId: '91330105MAC0HMGP8M',
      amount: 81.67, taxAmount: 0.82, totalAmount: 82.49,
      invoiceType: '电子发票（普通发票）',
    }],
    ['03_数电票_普票_住宿680元.pdf', {
      invoiceNumber: '25312000000012345003', invoiceDate: '2026-07-25',
      buyerName: '深圳市云启科技有限公司', sellerName: '上海云庭酒店管理有限公司',
      buyerTaxId: '91440300MA5F8K2X7A', sellerTaxId: '91310115MA1K4Q9R8D',
      amount: 641.51, taxAmount: 38.49, totalAmount: 680,
      invoiceType: '电子发票（普通发票）',
    }],
    ['04_电子普票_文具300元.pdf', {
      invoiceNumber: '87654321', invoiceCode: '011002500112', invoiceDate: '2026-07-09',
      checkCode: '82614903775201648820',
      buyerName: '深圳市云启科技有限公司', sellerName: '杭州晨光文具供应链有限公司',
      amount: 265.49, taxAmount: 34.51, totalAmount: 300,
      invoiceType: '增值税电子普通发票',
    }],
    ['08_异常票_勾稽不符.pdf', {
      invoiceNumber: '25312000000012345008', invoiceDate: '2026-08-01',
      buyerName: '深圳市云启科技有限公司', sellerName: '成都捷印图文制作有限公司',
      amount: 100, taxAmount: 13, totalAmount: 113.05,
    }],
  ];

  /* ---------- T4：用户实际上传的真实发票（深圳电子普通发票，CID 字体） ---------- */
  cases.push(['10_真实票_144032409110.pdf', {
    invoiceType: '增值税电子普通发票',
    invoiceCode: '144032409110', invoiceNumber: '15247567', invoiceDate: '2024-04-14',
    buyerName: '深圳前海麦格美科技有限公司', sellerName: '深圳市农耕记餐饮有限公司',
    buyerTaxId: '91440300MA5ENKC13N', sellerTaxId: '91440300MA5EEF1N0R',
    amount: 106.6, taxAmount: 6.4, totalAmount: 113,
    channel: 'PDF 文本层',
  }]);

  /* ---------- T5：用户第二批真实发票（滴滴 / 144 重传 / 沫尚 dzfp） ---------- */
  cases.push(['滴滴电子发票(2).pdf', {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '25127000000071213699', invoiceDate: '2025-03-10',
    buyerName: '深圳前海麦格美科技集团有限公司', sellerName: '滴滴出行科技有限公司',
    buyerTaxId: '91440300MA5ENKC13N', sellerTaxId: '911201163409833307',
    amount: 23.19, taxAmount: 0.7, totalAmount: 23.89,
    channel: 'PDF 文本层',
  }]);
  cases.push(['144032409110_15247567_深圳前海麦格美科技有限公司(1).pdf', {
    invoiceType: '增值税电子普通发票',
    invoiceCode: '144032409110', invoiceNumber: '15247567', invoiceDate: '2024-04-14',
    buyerName: '深圳前海麦格美科技有限公司', sellerName: '深圳市农耕记餐饮有限公司',
    buyerTaxId: '91440300MA5ENKC13N', sellerTaxId: '91440300MA5EEF1N0R',
    amount: 106.6, taxAmount: 6.4, totalAmount: 113,
    channel: 'PDF 文本层',
  }]);
  cases.push(['dzfp_25332000000070495168_杭州沫尚文化创意有限公司_20250223143442.pdf', {
    invoiceType: '电子发票（普通发票）',
    invoiceNumber: '25332000000070495168', invoiceDate: '2025-02-23',
    buyerName: '深圳前海麦格美科技集团有限公司', sellerName: '杭州沫尚文化创意有限公司',
    buyerTaxId: '91440300MA5ENKC13N', sellerTaxId: '91330105MAC0HMGP8M',
    amount: 81.67, taxAmount: 0.82, totalAmount: 82.49,
    channel: 'PDF 文本层',
  }]);

  for (const [fname, exp] of cases) {
    console.log(`\n[E2E] 端到端 ${fname}`);
    const buf = fs.readFileSync(`${DIR}/${fname}`);
    const file = new File([buf], fname, { type: 'application/pdf' });
    const r = await recognizeFile(file);
    console.log(`  channel=${r.channel} confidence=${r.confidence}`);
    for (const [k, v] of Object.entries(exp)) check(k, r[k], v);
  }

  /* ---------- T3：文件名兜底（文本层全废时也能拿到号码+日期） ---------- */
  console.log('\n[T3] 文件名兜底 dzfp_ 命名');
  const r3 = parseChineseInvoiceText('电子发票（普通发票） 合 计');
  check('无号码时为空', r3.invoiceNumber, undefined);
  const buf = fs.readFileSync(`${DIR}/08_异常票_勾稽不符.pdf`);
  const renamed = new File([buf], 'dzfp_253320000000070495168_杭州沫尚文化创意有限公司_20250223143442.pdf', { type: 'application/pdf' });
  const r3b = await recognizeFile(renamed);
  check('文件名不覆盖文本层号码', r3b.invoiceNumber, '25312000000012345008');

  console.log(`\n===== 结果：${pass} 通过，${fail} 失败 =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('RUN ERROR', e); process.exit(2); });
