import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
// BUILD_SELFTEST=1 时输出到 dist-test 并加入自检入口（正式 dist 永不含测试内容）
const withSelftest = process.env.BUILD_SELFTEST === '1';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [command !== 'build' && inspectAttr(), react()].filter(Boolean),
  build: {
    outDir: withSelftest ? 'dist-test' : 'dist',
    rollupOptions: {
      ...(withSelftest
        ? {
            input: {
              main: path.resolve(__dirname, 'index.html'),
              selftest: path.resolve(__dirname, 'selftest.html'),
              selftestOld: path.resolve(__dirname, 'selftest-old.html'),
            },
          }
        : {}),
      output: {
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? '';
          // pdf.js worker 必须保持固定文件名：
          // public/pdf-worker-wrapper.mjs 会以 '/assets/pdf.worker.min.mjs' 静态引用它
          if (name.includes('pdf.worker')) return 'assets/[name][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
