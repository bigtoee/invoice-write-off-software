/**
 * pdf.js worker 线程垫片模块（被 pdf-worker-wrapper.mjs 静态导入）。
 *
 * pdf.js 的 worker 运行在独立全局环境，主线程 src/polyfills.ts 的垫片够不到这里。
 * 覆盖 pdfjs-dist v5 worker 用到的 ES2022–2025 API：
 *   Promise.withResolvers / Promise.try / Map·WeakMap getOrInsert(Computed) /
 *   Array findLast / Array·TypedArray at / Uint8Array hex·base64 一族
 *   （worker 中文档指纹计算 n.toHex() 是每次打开 PDF 的必经路径）/
 *   crypto.randomUUID / structuredClone
 * 缺少这些 API 的旧内核（iOS Safari<17.4、老安卓 WebView）不再抛错。
 * 与 src/polyfills.ts 保持同步修改。
 */

/* eslint-disable no-extend-native */

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

if (typeof Promise.try !== 'function') {
  Promise.try = function pTry(fn, ...args) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

if (typeof Map.prototype.getOrInsert !== 'function') {
  Map.prototype.getOrInsert = function getOrInsert(key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}

if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Map.prototype.getOrInsertComputed = function getOrInsertComputed(key, callback) {
    if (this.has(key)) return this.get(key);
    const v = callback(key);
    this.set(key, v);
    return v;
  };
}

if (typeof WeakMap.prototype.getOrInsert !== 'function') {
  WeakMap.prototype.getOrInsert = function getOrInsert(key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}

if (typeof WeakMap.prototype.getOrInsertComputed !== 'function') {
  WeakMap.prototype.getOrInsertComputed = function getOrInsertComputed(key, callback) {
    if (this.has(key)) return this.get(key);
    const v = callback(key);
    this.set(key, v);
    return v;
  };
}

if (typeof Array.prototype.findLast !== 'function') {
  Array.prototype.findLast = function findLast(pred) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (pred(this[i], i, this)) return this[i];
    }
    return undefined;
  };
}

if (typeof Array.prototype.findLastIndex !== 'function') {
  Array.prototype.findLastIndex = function findLastIndex(pred) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (pred(this[i], i, this)) return i;
    }
    return -1;
  };
}

/* Array / TypedArray .at（ES2022） */
const __atImpl = function at(index) {
  const len = this.length >>> 0;
  const k = index >= 0 ? index : len + index;
  return k >= 0 && k < len ? this[k] : undefined;
};
if (typeof Array.prototype.at !== 'function') {
  Array.prototype.at = __atImpl;
}
const __typedArrayProto = Object.getPrototypeOf(Int8Array.prototype);
if (typeof __typedArrayProto.at !== 'function') {
  __typedArrayProto.at = __atImpl;
}

/* Uint8Array hex / base64 一族（ES2025） */
const __HEX = '0123456789abcdef';
const __hexVal = (ch) => {
  const c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 102) return c - 87;
  if (c >= 65 && c <= 70) return c - 55;
  return -1;
};

if (typeof Uint8Array.prototype.toHex !== 'function') {
  Uint8Array.prototype.toHex = function toHex() {
    let s = '';
    for (let i = 0; i < this.length; i++) {
      s += __HEX[this[i] >> 4] + __HEX[this[i] & 15];
    }
    return s;
  };
}

if (typeof Uint8Array.fromHex !== 'function') {
  Uint8Array.fromHex = function fromHex(hex) {
    if (typeof hex !== 'string') throw new TypeError('Uint8Array.fromHex 需要字符串参数');
    if (hex.length % 2 !== 0) throw new SyntaxError('hex 字符串长度必须为偶数');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      const hi = __hexVal(hex[i * 2]);
      const lo = __hexVal(hex[i * 2 + 1]);
      if (hi < 0 || lo < 0) throw new SyntaxError('非法 hex 字符');
      out[i] = (hi << 4) | lo;
    }
    return out;
  };
}

if (typeof Uint8Array.prototype.toBase64 !== 'function') {
  Uint8Array.prototype.toBase64 = function toBase64() {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < this.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(this.subarray(i, i + CHUNK)));
    }
    return btoa(bin);
  };
}

if (typeof Uint8Array.fromBase64 !== 'function') {
  Uint8Array.fromBase64 = function fromBase64(b64) {
    if (typeof b64 !== 'string') throw new TypeError('Uint8Array.fromBase64 需要字符串参数');
    const bin = atob(b64.replace(/[\t\n\f\r ]/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
}

if (typeof Uint8Array.prototype.setFromHex !== 'function') {
  Uint8Array.prototype.setFromHex = function setFromHex(hex) {
    if (typeof hex !== 'string') throw new TypeError('setFromHex 需要字符串参数');
    if (hex.length % 2 !== 0) throw new SyntaxError('hex 字符串长度必须为偶数');
    const max = Math.min(this.length, hex.length / 2);
    let written = 0;
    for (let i = 0; i < max; i++) {
      const hi = __hexVal(hex[i * 2]);
      const lo = __hexVal(hex[i * 2 + 1]);
      if (hi < 0 || lo < 0) throw new SyntaxError('非法 hex 字符');
      this[i] = (hi << 4) | lo;
      written++;
    }
    return { read: written * 2, written };
  };
}

if (typeof Uint8Array.prototype.setFromBase64 !== 'function') {
  Uint8Array.prototype.setFromBase64 = function setFromBase64(b64) {
    const decoded = Uint8Array.fromBase64(b64);
    const written = Math.min(this.length, decoded.length);
    this.set(decoded.subarray(0, written));
    return { read: b64.length, written };
  };
}

/* crypto.randomUUID（Chrome 92+/Safari 15.4+） */
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function' && typeof crypto.getRandomValues === 'function') {
  crypto.randomUUID = function randomUUID() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let h = '';
    for (let i = 0; i < 16; i++) h += __HEX[b[i] >> 4] + __HEX[b[i] & 15];
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
}

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) =>
    value === undefined ? value : JSON.parse(JSON.stringify(value));
}
