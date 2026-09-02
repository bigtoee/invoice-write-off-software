// pdfjs v5 在 Node 20 需要 withResolvers 垫片（必须先于 pdfjs 评估）
// @ts-expect-error 垫片
if (typeof Promise.withResolvers !== 'function') {
  // @ts-expect-error 垫片
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (e?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
// @ts-expect-error 垫片
if (typeof Promise.try !== 'function') {
  // @ts-expect-error 垫片
  Promise.try = function pTry<T>(fn: (...args: unknown[]) => T, ...args: unknown[]) {
    return new Promise<T>((resolve) => resolve(fn(...args)));
  };
}
// pdfjs v5 使用的 2025 新 API（Node 20 无）
// @ts-expect-error 垫片
if (typeof Uint8Array.prototype.toHex !== 'function') {
  // @ts-expect-error 垫片
  Uint8Array.prototype.toHex = function toHex(this: Uint8Array): string {
    let s = '';
    for (const b of this) s += b.toString(16).padStart(2, '0');
    return s;
  };
}
// @ts-expect-error 垫片
if (typeof (Uint8Array as any).fromHex !== 'function') {
  // @ts-expect-error 垫片
  (Uint8Array as any).fromHex = function fromHex(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  };
}
// settings 模块防御：Node 无 localStorage
// @ts-expect-error 垫片
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map<string, string>();
  // @ts-expect-error 垫片
  globalThis.localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: () => null,
    get length() { return mem.size; },
  };
}
// pdfjs 主构建在模块求值期引用少量 DOM API（文本提取路径不会真正用到）
// Node 下渲染路径需要真实实现：优先嫁接 @napi-rs/canvas（Path2D/DOMMatrix/ImageData）
try {
  const napi = require('@napi-rs/canvas') as Record<string, unknown>;
  for (const k of ['Path2D', 'DOMMatrix', 'DOMPoint', 'DOMRect', 'ImageData', 'Image'] as const) {
    if (napi[k] && typeof (globalThis as Record<string, unknown>)[k] === 'undefined') {
      (globalThis as Record<string, unknown>)[k] = napi[k];
    }
  }
} catch { /* 无 canvas 包时退回桩实现 */ }
// @ts-expect-error 垫片
if (typeof (Map.prototype as any).getOrInsertComputed !== 'function') {
  // @ts-expect-error 垫片
  (Map.prototype as any).getOrInsertComputed = function getOrInsertComputed<K, V>(this: Map<K, V>, key: K, callback: (k: K) => V): V {
    if (this.has(key)) return this.get(key) as V;
    const v = callback(key);
    this.set(key, v);
    return v;
  };
}
// @ts-expect-error 垫片
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error 垫片
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: unknown) { void init; }
    multiply() { return new (globalThis.DOMMatrix as any)(); }
    inverse() { return new (globalThis.DOMMatrix as any)(); }
    translate() { return new (globalThis.DOMMatrix as any)(); }
    scale() { return new (globalThis.DOMMatrix as any)(); }
    transformPoint(p?: unknown) { return p ?? { x: 0, y: 0 }; }
  };
}
// @ts-expect-error 垫片
if (typeof globalThis.ImageData === 'undefined') {
  // @ts-expect-error 垫片
  globalThis.ImageData = class ImageData { constructor(..._a: unknown[]) {} };
}
// @ts-expect-error 垫片
if (typeof globalThis.Path2D === 'undefined') {
  // @ts-expect-error 垫片
  globalThis.Path2D = class Path2D { constructor(..._a: unknown[]) {} };
}
export {};
