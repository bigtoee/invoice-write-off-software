// 三份用户真实文件逐一诊断：识别结果 + rawText + 预览渲染
const fs = require('fs');
const path = require('path');
const { recognizeFile, __setPdfjsAssets, openPdfDocument } = require('./bundle.cjs');

(async () => {
  const nm = path.resolve(__dirname, '../node_modules/pdfjs-dist');
  __setPdfjsAssets({
    cMapUrl: path.join(nm, 'cmaps') + '/',
    standardFontDataUrl: path.join(nm, 'standard_fonts') + '/',
    wasmUrl: path.join(nm, 'wasm') + '/',
    iccUrl: path.join(nm, 'iccs') + '/',
  });
  const files = [
    '/mnt/agents/output/发票测试包/滴滴电子发票(2).pdf',
    '/mnt/agents/output/发票测试包/144032409110_15247567_深圳前海麦格美科技有限公司(1).pdf',
    '/mnt/agents/output/发票测试包/dzfp_25332000000070495168_杭州沫尚文化创意有限公司_20250223143442.pdf',
  ];
  for (const p of files) {
    const name = path.basename(p);
    console.log('\n==================== ' + name + ' ====================');
    try {
      const file = new File([fs.readFileSync(p)], name, { type: 'application/pdf' });
      const r = await recognizeFile(file);
      console.log('FIELDS:', JSON.stringify({ ...r, rawText: undefined }, null, 1));
      console.log('--- RAWTEXT (前 1500 字) ---');
      console.log((r.rawText || '(空)').slice(0, 1500));
    } catch (e) {
      console.log('RECOGNIZE ERROR:', e.message || e);
    }
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
