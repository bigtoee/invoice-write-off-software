/**
 * pdf.js worker 引导器（跨设备兼容性修复）。
 *
 * 为什么需要它：pdf.js worker 是独立全局环境，主线程的垫片够不到；
 * pdfjs-dist v5 worker 依赖 ES2024/2025 新 API（Promise.withResolvers / Promise.try /
 * Map.getOrInsertComputed 等），iOS Safari < 17.4 与老 Android WebView 缺失即崩。
 *
 * 为什么用两个有序静态导入而不是动态 import()：
 * 1) ES 模块按导入顺序深度优先求值 —— 垫片模块先于 worker 模块执行，
 *    worker 模块求值时垫片已就位；
 * 2) 整个模块图求值完成后 worker 事件循环才开始处理消息 ——
 *    主线程 pdf.js 发来的握手消息在 onmessage 注册前不会派发，零竞争。
 *    （动态 import() 会在 wrapper 求值结束与 worker 加载完成之间留出空窗，
 *    空窗内派发的消息没有监听者会被丢弃，文本提取静默失败 —— 已实测踩坑。）
 */
import './pdf-worker-polyfills.mjs';
import '/assets/pdf.worker.min.mjs';
