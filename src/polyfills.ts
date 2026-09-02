/**
 * 全兼容垫片（主线程）：把 2022–2025 年的新 JS API 补齐到 ES2020 基线。
 * 覆盖 pdf.js v5 / react-router 等依赖用到的：
 *   Promise.withResolvers / Promise.try          (ES2024/2025)
 *   Map·WeakMap getOrInsert / getOrInsertComputed (ES2025)
 *   Array.prototype.findLast / findLastIndex      (ES2023)
 *   Array / TypedArray.prototype.at               (ES2022)
 *   Uint8Array toHex/fromHex/toBase64/fromBase64/setFromHex/setFromBase64 (ES2025)
 *   crypto.randomUUID                             (Chrome 92+/Safari 15.4+)
 *   structuredClone                               (Safari 15.4+)
 * 缺少这些 API 的旧内核（iOS Safari<17.4、老安卓 WebView）不再抛错。
 * 注意：本文件只覆盖主线程；pdf.js worker 由 public/pdf-worker-polyfills.mjs
 * 做同样的垫片（两个文件内容必须保持同步）。
 */

interface MapWithInsert<K, V> extends Map<K, V> {
  getOrInsert?(key: K, value: V): V;
  getOrInsertComputed?(key: K, callback: (k: K) => V): V;
}
interface WeakMapWithInsert<K extends object, V> extends WeakMap<K, V> {
  getOrInsert?(key: K, value: V): V;
  getOrInsertComputed?(key: K, callback: (k: K) => V): V;
}

const mapProto = Map.prototype as MapWithInsert<unknown, unknown>;
if (typeof mapProto.getOrInsert !== 'function') {
  mapProto.getOrInsert = function getOrInsert(key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}
if (typeof mapProto.getOrInsertComputed !== 'function') {
  mapProto.getOrInsertComputed = function getOrInsertComputed(key, callback) {
    if (this.has(key)) return this.get(key);
    const v = callback(key);
    this.set(key, v);
    return v;
  };
}

const weakMapProto = WeakMap.prototype as WeakMapWithInsert<object, unknown>;
if (typeof weakMapProto.getOrInsert !== 'function') {
  weakMapProto.getOrInsert = function getOrInsert(key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}
if (typeof weakMapProto.getOrInsertComputed !== 'function') {
  weakMapProto.getOrInsertComputed = function getOrInsertComputed(key, callback) {
    if (this.has(key)) return this.get(key);
    const v = callback(key);
    this.set(key, v);
    return v;
  };
}

interface PromiseWithResolvers {
  withResolvers?<T>(): { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (e?: unknown) => void };
  try?<T>(fn: (...args: unknown[]) => T, ...args: unknown[]): Promise<T>;
}

const promiseCtor = Promise as unknown as PromiseWithResolvers;
if (typeof promiseCtor.withResolvers !== 'function') {
  promiseCtor.withResolvers = function withResolvers<T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (e?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
if (typeof promiseCtor.try !== 'function') {
  promiseCtor.try = function pTry<T>(fn: (...args: unknown[]) => T, ...args: unknown[]) {
    return new Promise<T>((resolve) => resolve(fn(...args)));
  };
}

interface ArrayFindLast {
  findLast?(pred: (v: unknown, i: number, arr: unknown[]) => boolean): unknown;
  findLastIndex?(pred: (v: unknown, i: number, arr: unknown[]) => boolean): number;
}

const arrayProto = Array.prototype as ArrayFindLast;
if (typeof arrayProto.findLast !== 'function') {
  arrayProto.findLast = function findLast(this: unknown[], pred: (v: unknown, i: number, arr: unknown[]) => boolean) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (pred(this[i], i, this)) return this[i];
    }
    return undefined;
  };
}
if (typeof arrayProto.findLastIndex !== 'function') {
  arrayProto.findLastIndex = function findLastIndex(this: unknown[], pred: (v: unknown, i: number, arr: unknown[]) => boolean) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (pred(this[i], i, this)) return i;
    }
    return -1;
  };
}

/* Array / TypedArray .at（ES2022；react-router 与 pdf.js 内部在用） */
interface AtCapable {
  at?(index: number): unknown;
}
const atImpl = function at(this: { length: number; [k: number]: unknown }, index: number): unknown {
  const len = this.length >>> 0;
  const k = index >= 0 ? index : len + index;
  return k >= 0 && k < len ? this[k] : undefined;
};
if (typeof (Array.prototype as AtCapable).at !== 'function') {
  (Array.prototype as AtCapable).at = atImpl;
}
const typedArrayProto = Object.getPrototypeOf(Int8Array.prototype) as AtCapable;
if (typeof typedArrayProto.at !== 'function') {
  typedArrayProto.at = atImpl;
}

/* Uint8Array hex / base64 一族（ES2025；pdf.js 文档指纹 toHex 为每次加载必经路径） */
interface U8HexBase64 {
  toHex?(): string;
  toBase64?(): string;
  setFromHex?(hex: string): { read: number; written: number };
  setFromBase64?(b64: string): { read: number; written: number };
}
interface U8Statics {
  fromHex?(hex: string): Uint8Array;
  fromBase64?(b64: string): Uint8Array;
}

const u8Proto = Uint8Array.prototype as U8HexBase64;
const u8Ctor = Uint8Array as unknown as U8Statics;

const HEX_DIGITS = '0123456789abcdef';
const hexVal = (ch: string): number => {
  const c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return c - 48; // 0-9
  if (c >= 97 && c <= 102) return c - 87; // a-f
  if (c >= 65 && c <= 70) return c - 55; // A-F
  return -1;
};

if (typeof u8Proto.toHex !== 'function') {
  u8Proto.toHex = function toHex(this: Uint8Array): string {
    let s = '';
    for (let i = 0; i < this.length; i++) {
      s += HEX_DIGITS[this[i] >> 4] + HEX_DIGITS[this[i] & 15];
    }
    return s;
  };
}

if (typeof u8Ctor.fromHex !== 'function') {
  u8Ctor.fromHex = function fromHex(hex: string): Uint8Array {
    if (typeof hex !== 'string') throw new TypeError('Uint8Array.fromHex 需要字符串参数');
    if (hex.length % 2 !== 0) throw new SyntaxError('hex 字符串长度必须为偶数');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      const hi = hexVal(hex[i * 2]);
      const lo = hexVal(hex[i * 2 + 1]);
      if (hi < 0 || lo < 0) throw new SyntaxError('非法 hex 字符');
      out[i] = (hi << 4) | lo;
    }
    return out;
  };
}

if (typeof u8Proto.toBase64 !== 'function') {
  u8Proto.toBase64 = function toBase64(this: Uint8Array): string {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < this.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(this.subarray(i, i + CHUNK)));
    }
    return btoa(bin);
  };
}

if (typeof u8Ctor.fromBase64 !== 'function') {
  u8Ctor.fromBase64 = function fromBase64(b64: string): Uint8Array {
    if (typeof b64 !== 'string') throw new TypeError('Uint8Array.fromBase64 需要字符串参数');
    const bin = atob(b64.replace(/[\t\n\f\r ]/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
}

if (typeof u8Proto.setFromHex !== 'function') {
  u8Proto.setFromHex = function setFromHex(this: Uint8Array, hex: string): { read: number; written: number } {
    if (typeof hex !== 'string') throw new TypeError('setFromHex 需要字符串参数');
    if (hex.length % 2 !== 0) throw new SyntaxError('hex 字符串长度必须为偶数');
    const max = Math.min(this.length, hex.length / 2);
    let written = 0;
    for (let i = 0; i < max; i++) {
      const hi = hexVal(hex[i * 2]);
      const lo = hexVal(hex[i * 2 + 1]);
      if (hi < 0 || lo < 0) throw new SyntaxError('非法 hex 字符');
      this[i] = (hi << 4) | lo;
      written++;
    }
    return { read: written * 2, written };
  };
}

if (typeof u8Proto.setFromBase64 !== 'function') {
  u8Proto.setFromBase64 = function setFromBase64(this: Uint8Array, b64: string): { read: number; written: number } {
    const decoded = (u8Ctor.fromBase64 as (s: string) => Uint8Array)(b64);
    const written = Math.min(this.length, decoded.length);
    this.set(decoded.subarray(0, written));
    return { read: b64.length, written };
  };
}

/* crypto.randomUUID（Chrome 92+/Safari 15.4+；pdf.js 编辑器在用） */
const cryptoRef = globalThis.crypto;
if (cryptoRef && typeof (cryptoRef as { randomUUID?: unknown }).randomUUID !== 'function' && typeof cryptoRef.getRandomValues === 'function') {
  (cryptoRef as { randomUUID: () => string }).randomUUID = function randomUUID(): string {
    const b = cryptoRef.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let h = '';
    for (let i = 0; i < 16; i++) h += HEX_DIGITS[b[i] >> 4] + HEX_DIGITS[b[i] & 15];
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}

if (typeof globalThis.structuredClone !== 'function') {
  // 兜底实现：pdf.js 只对可序列化数据使用 structuredClone
  (globalThis as Record<string, unknown>).structuredClone = <T>(value: T): T =>
    value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export {};
