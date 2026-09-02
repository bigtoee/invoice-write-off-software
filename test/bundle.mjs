// 端到端测试打包器：把真实 recognition.ts 打成 cjs 供 node 运行
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const stubAndAlias = {
  name: 'stub-and-alias',
  setup(b) {
    b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'url-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'url-stub' }, (a) => {
      // ?url 资源：给 pdfjs 一个真实的 worker 文件路径（Node 下按文件路径动态加载）
      if (a.path.includes('pdf.worker')) {
        const wp = path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
        return { contents: `export default ${JSON.stringify(wp)}` };
      }
      return { contents: 'export default ""' };
    });
    b.onResolve({ filter: /^@\// }, (a) => {
      const p = path.join(root, 'src', a.path.slice(2));
      for (const cand of [p, `${p}.ts`, `${p}.tsx`, `${p}/index.ts`]) {
        try { fs.accessSync(cand); return { path: cand }; } catch { /* try next */ }
      }
      return { path: p };
    });
  },
};

await build({
  entryPoints: [path.join(root, 'test/entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(root, 'test/bundle.cjs'),
  plugins: [stubAndAlias],
  external: ['@napi-rs/canvas'],
  loader: { '.ts': 'ts' },
  logLevel: 'warning',
});
console.log('bundled ok');
