import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { LogoSeal } from '@/components/Navbar';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; to?: string; href?: string }> }> = [
  {
    title: '产品',
    links: [
      { label: '工作台', to: '/workbench' },
      { label: '发票台账', to: '/ledger' },
      { label: '汇总分析', to: '/analytics' },
      { label: '合规中心', to: '/compliance' },
    ],
  },
  {
    title: '合规依据',
    links: [
      { label: '财会〔2020〕6 号', href: 'https://www.gov.cn/zhengce/zhengceku/2020-03/31/content_5497710.htm' },
      { label: '财政部·国家档案局 79 号令', href: 'https://www.gov.cn/gongbao/content/2016/content_5139388.htm' },
      { label: '数电票全国推广公告', href: 'https://www.chinatax.gov.cn/chinatax/n810341/n810825/index.html' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '使用指引', to: '/workbench' },
      { label: '真伪查验入口', href: 'https://inv-veri.chinatax.gov.cn/' },
      { label: '设置与数据管理', to: '/settings' },
    ],
  },
];

/** 落地页页脚：深墨底 + 印章水印。 */
export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink-dark text-paper-on-dark">
      {/* 淡印章红「核」字水印 */}
      <img
        src="/logo-seal.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-8 w-[240px] opacity-[0.05] select-none"
      />
      <div className="relative mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2.5">
              <LogoSeal size={28} />
              <span className="font-serif text-[17px] font-bold">
                票核 <span className="font-instrument italic text-[14px] opacity-70">InvoiceCore</span>
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-[22px] opacity-70">
              把一叠发票，变成一本清晰的账。
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-[6px] border border-paper-on-dark/25 px-2.5 py-1 text-[12px] opacity-80">
              <Lock size={12} /> 数据不出本机
            </span>
          </motion.div>

          {COLUMNS.map((col, ci) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.1 * (ci + 1), ease: [0.22, 1, 0.36, 1] }}
            >
              <h4 className="text-[12px] font-medium tracking-[0.08em] opacity-50">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-[14px] opacity-80 transition-opacity hover:opacity-100 hover:text-seal">
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[14px] opacity-80 transition-opacity hover:opacity-100 hover:text-seal"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 border-t border-paper-on-dark/15 pt-6 text-[12px] opacity-50">
          © 2026 票核 InvoiceCore · 纯前端应用 · 财务数据不出本机
        </div>
      </div>
    </footer>
  );
}
