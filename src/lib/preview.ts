import { openPdfDocument, pdfjsLib } from '@/lib/pdfjs';

/**
 * 生成 PDF 首页的票面缩略图（dataURL）。
 * 失败时返回 undefined（调用方回退到占位样式），但会打印原因便于排查。
 */
export async function generatePdfPreview(file: File, targetWidth = 640): Promise<string | undefined> {
  try {
    const data = await file.arrayBuffer();
    const doc = await openPdfDocument(data).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = targetWidth / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
      void doc.destroy();
    }
  } catch (err) {
    console.warn(`[票核] PDF 票面预览渲染失败（${file.name}）：`, err instanceof Error ? err.message : err);
    return undefined;
  }
}

/**
 * 把 PDF 首页渲染为 PNG Blob（供无文本层的扫描件走本地 OCR）。
 * 失败返回 undefined；仅在浏览器环境可用。
 */
export async function renderPdfPageToBlob(file: File, targetWidth = 2000): Promise<Blob | undefined> {
  if (typeof document === 'undefined') return undefined;
  try {
    const data = await file.arrayBuffer();
    const doc = await openPdfDocument(data).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = targetWidth / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      return await new Promise<Blob | undefined>((resolve) => {
        canvas.toBlob((b) => resolve(b ?? undefined), 'image/png');
      });
    } finally {
      void doc.destroy();
    }
  } catch (err) {
    console.warn(`[票核] 扫描件 PDF 页面渲染失败（${file.name}）：`, err instanceof Error ? err.message : err);
    return undefined;
  }
}

export { pdfjsLib };
