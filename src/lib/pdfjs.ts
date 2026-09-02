import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// 生产构建的浏览器端改用 wrapper 作为 workerSrc：wrapper 先在 worker 全局内补齐
// Promise.withResolvers / Promise.try / Map.getOrInsert 等垫片（iOS Safari < 17.4 没有这些 API，
// 缺少时 worker 内抛错、PDF 识别整体失败），再加载真正的 worker 模块。
// 开发服务器没有 /assets/ 构建产物路径、Node/测试环境无此问题，均保留原始 worker 路径。
pdfjsLib.GlobalWorkerOptions.workerSrc =
  typeof window !== 'undefined' && typeof document !== 'undefined' && import.meta.env.PROD
    ? `${import.meta.env.BASE_URL}pdf-worker-wrapper.mjs`
    : pdfWorkerUrl;

/**
 * 真实税局发票常使用 CID 嵌入字体：缺少 CMap 时 pdf.js 无法把字形翻译回
 * Unicode（中文整段从文本层丢失）；缺少 standard_fonts 时渲染会抛错。
 * 票面中的二维码/印章/Logo 常以 JBIG2、JPEG2000 编码或带 ICC 色彩profile，
 * 渲染时需要 wasm 解码器与 icc 配置文件，否则 render 抛错、预览失败。
 * 四份资源随站点分发在 public/ 下，测试环境可通过 setPdfjsAssets 覆盖为本地路径。
 */
const assets = {
  cMapUrl: `${import.meta.env.BASE_URL}cmaps/`,
  standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
  wasmUrl: `${import.meta.env.BASE_URL}wasm/`,
  iccUrl: `${import.meta.env.BASE_URL}iccs/`,
};

export function setPdfjsAssets(next: Partial<typeof assets>): void {
  Object.assign(assets, next);
}

export function openPdfDocument(data: ArrayBuffer | Uint8Array) {
  return pdfjsLib.getDocument({
    data,
    cMapUrl: assets.cMapUrl,
    cMapPacked: true,
    standardFontDataUrl: assets.standardFontDataUrl,
    wasmUrl: assets.wasmUrl,
    iccUrl: assets.iccUrl,
  });
}

export { pdfjsLib };
