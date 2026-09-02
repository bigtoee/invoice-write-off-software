import './polyfills'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// 纯静态托管无 SPA 回退：必须用 HashRouter，否则在 /workbench 等子路由刷新会得到 404 白屏
createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
)
