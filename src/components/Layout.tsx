import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Stamp, BookOpen, BarChart3, ShieldCheck, Settings as SettingsIcon,
  PanelLeftClose, PanelLeftOpen, Lock, Upload, Database, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoSeal } from '@/components/Navbar';
import { storageUsage, loadSampleData, clearAll, countInvoices } from '@/lib/store';

const NAV_ITEMS = [
  { to: '/workbench', label: '工作台', icon: Stamp },
  { to: '/ledger', label: '发票台账', icon: BookOpen },
  { to: '/analytics', label: '汇总分析', icon: BarChart3 },
  { to: '/compliance', label: '合规中心', icon: ShieldCheck },
  { to: '/settings', label: '设置', icon: SettingsIcon },
];

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

/** 应用壳：深墨 Sidebar（232px 可收起为 64px）+ 顶栏 + 内容 Outlet。 */
export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number }>({ used: 0, quota: 0 });
  const [count, setCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const current = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to));

  useEffect(() => {
    let alive = true;
    storageUsage().then((u) => alive && setUsage(u));
    countInvoices().then((c) => alive && setCount(c));
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const toggleSample = async () => {
    if (count > 0) {
      if (window.confirm('清空全部发票数据？此操作不可恢复。')) {
        await clearAll();
        setCount(0);
      }
    } else {
      await loadSampleData();
      setCount(12);
    }
    const u = await storageUsage();
    setUsage(u);
  };

  const quotaPct = usage.quota > 0 ? Math.min(100, (usage.used / usage.quota) * 100) : 0;

  return (
    <div className="flex min-h-[100dvh] bg-paper paper-noise">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col bg-ink-dark text-paper-on-dark transition-[width] duration-300 ease-out-quint md:flex',
          collapsed ? 'w-16' : 'w-[232px]',
        )}
      >
        <div className={cn('flex h-16 items-center gap-2.5 border-b border-paper-on-dark/10', collapsed ? 'justify-center px-0' : 'px-5')}>
          <LogoSeal size={28} />
          {!collapsed && (
            <span className="font-serif text-[16px] font-bold">
              票核 <span className="font-instrument italic text-[12px] opacity-60">InvoiceCore</span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-seal/12 text-paper-on-dark font-medium'
                    : 'text-paper-on-dark/60 hover:bg-paper-on-dark/5 hover:text-paper-on-dark',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-seal" />}
                  <item.icon size={18} className={isActive ? 'text-seal' : ''} />
                  {!collapsed && item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cn('border-t border-paper-on-dark/10 p-4', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] opacity-60">
                <span>本地存储</span>
                <span className="num">
                  {formatMB(usage.used)} / {formatMB(usage.quota)} MB
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper-on-dark/15">
                <div className="h-full rounded-full bg-seal" style={{ width: `${Math.max(2, quotaPct)}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] opacity-50">
                <Lock size={11} /> 数据仅存本机
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] text-paper-on-dark/50 hover:bg-paper-on-dark/5 hover:text-paper-on-dark"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && '收起导航'}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className={cn('flex min-h-[100dvh] flex-1 flex-col transition-[margin] duration-300 ease-out-quint', collapsed ? 'md:ml-16' : 'md:ml-[232px]')}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cinnabar-line bg-paper/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-ink-faint">
            <span>票核</span>
            <ChevronRight size={14} />
            <span className="font-serif text-[16px] font-bold text-ink">{current?.label ?? ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSample}
              className="hidden items-center gap-1.5 rounded-lg border border-cinnabar-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep sm:flex"
            >
              <Database size={14} />
              {count > 0 ? '清空数据' : '加载示例数据'}
            </button>
            <button
              onClick={() => navigate('/workbench')}
              className="flex items-center gap-1.5 rounded-lg bg-seal px-3.5 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-seal-deep active:scale-[0.97]"
            >
              <Upload size={14} /> 批量上传
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-paper">
              财
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-cinnabar-line bg-paper/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]',
                isActive ? 'text-seal font-medium' : 'text-ink-faint',
              )
            }
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
