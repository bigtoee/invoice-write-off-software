import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANCHORS = [
  { href: '#features', label: '产品能力' },
  { href: '#pipeline', label: '识别流程' },
  { href: '#compliance', label: '合规保障' },
  { href: '#faq', label: '常见问题' },
];

export function LogoSeal({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo-seal.svg"
      alt="票核印章 Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-[4px]"
    />
  );
}

/** 落地页导航：sticky top-0 z-50，滚动 48px 后出纸色底 + 描边 + 模糊。 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goAnchor = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-50 h-16 transition-all duration-300',
        scrolled
          ? 'bg-paper/90 backdrop-blur border-b border-cinnabar-line'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoSeal size={30} />
          <span className="font-serif text-[18px] font-bold tracking-wide">
            票核 <span className="font-instrument italic text-ink-faint text-[15px]">InvoiceCore</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {ANCHORS.map((a) => (
            <button
              key={a.href}
              onClick={() => goAnchor(a.href)}
              className="group relative py-1 text-[14px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {a.label}
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-seal transition-all duration-300 ease-out-quint group-hover:w-full" />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => goAnchor('#preview')}
            className="h-9 rounded-lg border border-cinnabar-line px-4 text-[14px] font-medium text-ink transition-all hover:bg-paper-deep active:scale-[0.97]"
          >
            查看示例
          </button>
          <Link
            to="/workbench"
            className="flex h-9 items-center rounded-lg bg-seal px-4 text-[14px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
          >
            进入工作台
          </Link>
        </div>

        <button
          className="md:hidden text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="打开菜单"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-16 border-b border-cinnabar-line bg-paper px-6 py-4 shadow-overlay md:hidden"
          >
            <div className="flex flex-col gap-1">
              {ANCHORS.map((a) => (
                <button
                  key={a.href}
                  onClick={() => goAnchor(a.href)}
                  className="rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-ink-soft hover:bg-paper-deep"
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/workbench');
                }}
                className="mt-2 h-11 rounded-lg bg-seal text-[15px] font-medium text-white active:scale-[0.98]"
              >
                进入工作台
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
