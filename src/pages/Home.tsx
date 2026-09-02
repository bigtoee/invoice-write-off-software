import { useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { AnimatePresence, motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useEffect } from 'react';
import {
  ShieldCheck, CopyCheck, Scale, FileArchive, Plus, ArrowRight, Lock,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SealBadge from '@/components/SealBadge';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const EASE = 'power4.out'; // cubic-bezier(0.22,1,0.36,1) ≈ easeOutQuint

/* ---------- 数字滚动（进入视口 CountUp） ---------- */
function CountUp({ to, format }: { to: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = format
            ? format(v)
            : Math.round(v).toLocaleString('zh-CN');
        }
      },
    });
    return () => controls.stop();
  }, [inView, to, mv, format]);
  return <span ref={ref}>0</span>;
}

const fmtMoney = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ---------- FAQ 手风琴（Framer Motion） ---------- */
const FAQS = [
  {
    q: '我的发票数据会上传到服务器吗？',
    a: '不会。识别、校验、存储全部在浏览器本地（IndexedDB）完成，断网也能用。',
  },
  {
    q: '识别准确率如何？',
    a: 'XML 直取 100%；PDF 文本层解析准确率极高；图片 OCR 受拍摄质量影响，识别结果支持逐张人工确认后入库。',
  },
  {
    q: '支持哪些发票？',
    a: '数电票（XML/PDF/OFD）、增值税电子普票/专票 PDF、纸质发票的 JPG/PNG 影像。',
  },
  {
    q: '能直接在别的设备上用吗？',
    a: '网页应用，打开网址即用；台账数据存于本机浏览器，可导出 Excel 随身携带。',
  },
  {
    q: '真伪查验能批量做吗？',
    a: '官方查验平台暂无批量接口，票核提供查验指引与状态人工标记，查重与要素校验已自动化。',
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-cinnabar-line"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-medium text-ink">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-seal"
        >
          <Plus size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[14px] leading-[24px] text-ink-soft">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- 信任条（Framer Motion 卡片） ---------- */
const TRUST = [
  { icon: Lock, title: '数据不出本机', desc: '识别与存储均在浏览器本地，财务数据零上传。' },
  { icon: CopyCheck, title: '查重防重复报销', desc: '发票号码唯一约束，重复上传即时告警。' },
  { icon: Scale, title: '要素勾稽校验', desc: '价税合计 = 金额 + 税额，±0.01 尾差自动提示。' },
  { icon: FileArchive, title: 'XML 归档提醒', desc: '遵循财会〔2020〕6 号，数电票须存含签名 XML。' },
];

function TrustBar() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TRUST.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="group rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card transition-transform duration-200 hover:-translate-y-1"
          >
            <t.icon
              size={28}
              className="text-seal transition-colors duration-200 group-hover:text-seal-deep"
              strokeWidth={1.8}
            />
            <h3 className="mt-4 text-[15px] font-bold">{t.title}</h3>
            <p className="mt-2 text-[13px] leading-[20px] text-ink-soft">{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 识别流水线（GSAP pinned） ---------- */
const STEPS = [
  { no: '01', title: 'XML · 直取数据', desc: '数电票法定源文件，结构化字段直接解析，准确率 100%。' },
  { no: '02', title: 'PDF · 提取文本层', desc: '电子发票内嵌文本提取 + 票面规则解析。' },
  { no: '03', title: '图片 · 本地 OCR', desc: '纸票拍照/扫描件，浏览器端 OCR 兜底，可接入自有模型。' },
];

const FIELD_CARDS = [
  { label: '发票号码', value: '243170000002' },
  { label: '价税合计', value: '¥1,130.00' },
  { label: '销售方税号', value: '91320594MA1WJK3H2X' },
];

function Pipeline() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        const steps = gsap.utils.toArray<HTMLElement>('.pipe-step');
        const cards = gsap.utils.toArray<HTMLElement>('.pipe-card');
        gsap.set(cards, { opacity: 0, scale: 1.2, rotate: -4, y: 16 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '.pipe-pin',
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 0.5,
          },
        });
        // 扫描线 0% → 100%
        tl.fromTo('.pipe-scanline', { top: '6%' }, { top: '88%', duration: 3, ease: 'none' }, 0);
        steps.forEach((step, i) => {
          const at = i * 1.0;
          tl.to(steps, { opacity: 0.3, duration: 0.15 }, at);
          tl.to(
            step,
            { opacity: 1, y: 0, duration: 0.3, ease: EASE },
            at,
          );
          tl.to(step.querySelector('.pipe-no'), { scale: 1.15, duration: 0.3 }, at);
          tl.to(step.querySelector('.pipe-bar'), { opacity: 1, duration: 0.3 }, at);
          if (cards[i]) {
            tl.to(
              cards[i],
              { opacity: 1, scale: 1, rotate: -2, y: 0, duration: 0.35, ease: 'back.out(2)' },
              at + 0.35,
            );
          }
        });
        return () => tl.scrollTrigger?.kill();
      });
      mm.add('(max-width: 767px)', () => {
        gsap.utils.toArray<HTMLElement>('.pipe-step, .pipe-card').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: EASE,
              scrollTrigger: { trigger: el, start: 'top 85%' },
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="pipeline" ref={root} className="py-24">
      <div className="pipe-pin mx-auto max-w-[1200px] px-6 md:min-h-[100dvh] md:flex md:flex-col md:justify-center">
        <h2 className="font-serif text-[28px] font-bold leading-[36px] md:text-[36px] md:leading-[44px]">
          不是「看图猜字」，是<span className="text-seal">按格式取数</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[45%_55%]">
          {/* 左侧步骤 */}
          <div className="flex flex-col justify-center gap-8">
            {STEPS.map((s) => (
              <div key={s.no} className="pipe-step relative flex gap-5 pl-5 opacity-100 md:opacity-30">
                <span className="pipe-bar absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-seal opacity-0" />
                <span className="pipe-no num text-[32px] font-semibold leading-[40px] text-seal">
                  {s.no}
                </span>
                <div>
                  <h3 className="font-serif text-[22px] font-bold leading-[30px]">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-ink-soft">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 右侧视觉 */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-cinnabar-line shadow-card">
              <img src="/pipeline-scan.jpg" alt="发票识别流水线示意" className="block w-full" />
              <span
                className="pipe-scanline absolute left-0 right-0 h-[3px] bg-seal shadow-[0_0_24px_rgba(192,63,43,0.7)]"
                style={{ top: '6%' }}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:absolute md:bottom-6 md:left-6 md:right-6 md:mt-0">
              {FIELD_CARDS.map((c) => (
                <div
                  key={c.label}
                  className="pipe-card rounded-lg border border-cinnabar-line bg-warm-white/95 px-4 py-3 shadow-card"
                >
                  <div className="text-[11px] font-medium tracking-[0.04em] text-ink-faint">{c.label}</div>
                  <div className="num mt-1 text-[15px] font-semibold text-ink">{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 支持格式 ---------- */
const FORMATS = [
  { name: 'PDF', label: 'PDF 电子发票', badge: '文本层', tone: 'seal' as const },
  { name: 'JPG · PNG', label: '纸票影像', badge: 'OCR', tone: 'amber' as const },
  { name: 'XML', label: '数电票源文件', badge: '直取', tone: 'jade' as const },
  { name: 'OFD', label: '版式文件', badge: '文本层', tone: 'seal' as const },
];

function Formats() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-[28px] font-bold leading-[36px] md:text-[36px] md:leading-[44px]">
            PDF、JPG、XML、OFD，<span className="text-seal">照单全收</span>
          </h2>
          <p className="mt-5 max-w-[480px] text-[15px] leading-[26px] text-ink-soft">
            支持批量拖入整个文件夹；自动按格式路由到最佳识别通道；内置 6 张示例发票，无需真实票据即可体验全流程。
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {FORMATS.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between rounded-xl border border-cinnabar-line bg-warm-white px-4 py-3.5 shadow-card"
              >
                <div>
                  <div className="num text-[15px] font-semibold">{f.name}</div>
                  <div className="mt-0.5 text-[12px] text-ink-faint">{f.label}</div>
                </div>
                <SealBadge tone={f.tone} flat className="text-[11px]">
                  {f.badge}
                </SealBadge>
              </motion.div>
            ))}
          </div>
          <Link
            to="/workbench"
            className="group mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium text-seal"
          >
            <span className="relative">
              现在就去工作台试试
              <span className="absolute bottom-[-2px] left-0 h-[1.5px] w-0 bg-seal transition-all duration-300 group-hover:w-full" />
            </span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <motion.div
          initial={{ clipPath: 'inset(100% 0 0 0)' }}
          whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-cinnabar-line shadow-card"
        >
          <img src="/format-tiles.jpg" alt="支持的发票文件格式" className="block w-full" />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 合规保障（深色区块，GSAP 印章盖下） ---------- */
const RULES = [
  {
    code: '财会〔2020〕6 号',
    desc: '数电票报销归档须保存含数字签名的 XML 源文件，票核自动检查并提醒。',
  },
  {
    code: '财政部·国家档案局 79 号令',
    desc: '会计档案电子化归档规范，台账字段按规范设计。',
  },
  {
    code: '2024-12 数电票全国推广',
    desc: '全面数字化的电子发票时代，XML 入账成为法定动作。',
  },
];

function Compliance() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 印章盖下
      gsap.fromTo(
        '.comp-seal',
        { scale: 1.4, rotate: -10, opacity: 0 },
        {
          scale: 1,
          rotate: -4,
          opacity: 1,
          duration: 0.8,
          ease: 'elastic.out(1, 0.5)',
          scrollTrigger: { trigger: root.current, start: 'top 40%' },
        },
      );
      // 列表项左移入
      gsap.fromTo(
        '.comp-rule',
        { opacity: 0, x: -32 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: EASE,
          scrollTrigger: { trigger: '.comp-rules', start: 'top 75%' },
        },
      );
    },
    { scope: root },
  );

  return (
    <section id="compliance" ref={root} className="bg-ink-dark py-28 text-paper-on-dark">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <div className="rounded-2xl border border-paper-on-dark/10 bg-paper-on-dark/[0.03] p-6">
          <img src="/compliance-doc.jpg" alt="会计档案与印章插画" className="w-full rounded-xl" />
        </div>
        <div>
          <div className="flex items-start gap-5">
            <h2 className="font-serif text-[28px] font-bold leading-[38px] text-paper md:text-[36px] md:leading-[46px]">
              规范，是刻在<br />产品里的
            </h2>
            <span className="comp-seal mt-1 inline-flex h-14 w-14 items-center justify-center rounded-[4px] border-2 border-seal bg-seal/10 font-serif text-[22px] font-bold text-seal">
              合规
            </span>
          </div>
          <div className="comp-rules mt-10 space-y-6">
            {RULES.map((r) => (
              <div key={r.code} className="comp-rule flex gap-3">
                <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-jade" />
                <div>
                  <div className="num text-[14px] font-semibold text-paper-on-dark">{r.code}</div>
                  <p className="mt-1 text-[14px] leading-[22px] text-paper-on-dark/65">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 border-t border-paper-on-dark/10 pt-5 text-[12px] leading-[20px] text-paper-on-dark/45">
            真伪查验指引内置合规中心，对接国家税务总局全国增值税发票查验平台流程。
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 数据预览 ---------- */
const PREVIEW_ROWS: Array<{
  no: string; date: string; seller: string; total: string;
  check: 'pass' | 'warn'; status: 'normal' | 'dup' | 'red';
}> = [
  { no: '243170000315', date: '2025-11-15', seller: '北京青云云计算股份有限公司', total: '¥20,000.00', check: 'pass', status: 'normal' },
  { no: '244220000018', date: '2025-12-02', seller: '杭州青竹印务有限公司', total: '¥328.00', check: 'pass', status: 'normal' },
  { no: '244220000018', date: '2025-12-02', seller: '杭州青竹印务有限公司', total: '¥328.00', check: 'warn', status: 'dup' },
  { no: '250310000900', date: '2026-02-25', seller: '上海澜庭酒店管理有限公司', total: '-¥480.00', check: 'pass', status: 'red' },
];

function Preview() {
  return (
    <section id="preview" className="mx-auto max-w-[1200px] px-6 py-24">
      <h2 className="font-serif text-[28px] font-bold leading-[36px] md:text-[36px] md:leading-[44px]">
        识别的结果，长这样
      </h2>
      <p className="mt-4 max-w-[560px] text-[15px] leading-[26px] text-ink-soft">
        每张发票识别后落入台账：号码、日期、双方、金额一一对齐如账簿栏位，查重与勾稽校验即时标注。
      </p>

      <div className="relative mt-10">
        {/* 汇总小卡 */}
        <motion.div
          initial={{ opacity: 0, y: 16, rotate: -2 }}
          whileInView={{ opacity: 1, y: 0, rotate: -2 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 rounded-xl border border-cinnabar-line bg-warm-white px-5 py-4 shadow-card md:absolute md:-top-8 md:right-0 md:z-10 md:mb-0"
        >
          <div className="text-[11px] font-medium tracking-[0.04em] text-ink-faint">本月合计</div>
          <div className="num mt-1 text-[22px] font-semibold text-ink">
            <CountUp to={86420} format={fmtMoney} />
          </div>
          <div className="num mt-1 text-[12px] text-ink-soft">
            税额 <CountUp to={9933.63} format={fmtMoney} /> · <CountUp to={12} /> 张
          </div>
        </motion.div>

        <div className="overflow-x-auto rounded-xl border border-cinnabar-line bg-warm-white shadow-card md:pt-10">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>发票号码</th>
                <th>开票日期</th>
                <th>销售方</th>
                <th className="num">价税合计</th>
                <th>校验</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_ROWS.map((r, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <td className="num">{r.no}</td>
                  <td className="num">{r.date}</td>
                  <td>{r.seller}</td>
                  <td className="num font-medium">{r.total}</td>
                  <td>
                    {r.check === 'pass' ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-jade">
                        <ShieldCheck size={14} /> 通过
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-amber">
                        <Scale size={14} /> 待确认
                      </span>
                    )}
                  </td>
                  <td>
                    {r.status === 'normal' && <SealBadge tone="jade">正常</SealBadge>}
                    {r.status === 'dup' && <SealBadge tone="amber">重复</SealBadge>}
                    {r.status === 'red' && <SealBadge tone="seal">红冲</SealBadge>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-8 text-[14px] text-ink-soft">
        这些示例数据已内置，
        <Link to="/workbench" className="font-medium text-seal hover:underline">
          进入工作台即可体验完整流程 →
        </Link>
      </p>
    </section>
  );
}

/* ---------- 结尾 CTA（GSAP 印章落下） ---------- */
function FinalCta() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 65%' },
      });
      tl.fromTo(
        '.cta-seal',
        { y: -60, opacity: 0, rotate: -14 },
        { y: 0, opacity: 1, rotate: -6, duration: 0.7, ease: 'bounce.out' },
      ).fromTo(
        '.cta-block',
        { y: 2 },
        { y: 0, duration: 0.2 },
        '-=0.15',
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} className="py-28">
      <div className="cta-block relative mx-auto max-w-[760px] px-6 text-center">
        <img
          src="/logo-seal.svg"
          alt=""
          aria-hidden
          className="cta-seal absolute -top-8 right-4 w-[96px] rounded-[4px] opacity-95 md:right-16"
        />
        <h2 className="font-serif text-[32px] font-bold leading-[44px] md:text-[44px] md:leading-[56px]">
          现在，把这叠发票<br />交给我。
        </h2>
        <Link
          to="/workbench"
          className="mt-10 inline-flex h-14 items-center rounded-lg bg-seal px-10 text-[16px] font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-seal-deep hover:shadow-overlay active:scale-[0.97]"
        >
          进入工作台
        </Link>
        <p className="mt-5 text-[13px] text-ink-faint">无需注册 · 打开即用 · 数据不出本机</p>
      </div>
    </section>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 主标题逐字升起
      const split = new SplitText('.hero-title-line', { type: 'chars' });
      gsap.fromTo(
        split.chars,
        { y: 40, opacity: 0, rotate: 4 },
        { y: 0, opacity: 1, rotate: 0, duration: 0.8, stagger: 0.04, ease: EASE, delay: 0.15 },
      );
      // 副文案与 CTA 块级淡入
      gsap.fromTo(
        '.hero-fade',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: EASE, delay: 0.9 },
      );
      // 发票图入场 + 呼吸浮动
      gsap.fromTo(
        '.hero-img',
        { y: 80, opacity: 0, rotateX: 12 },
        { y: 0, opacity: 1, rotateX: 6, duration: 1, ease: EASE, delay: 0.8 },
      );
      gsap.to('.hero-img-inner', {
        y: 12,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.8,
      });
      // 视差：滚动速度 0.85×
      gsap.to('.hero-img', {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      return () => split.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden"
      style={{ minHeight: 'min(100dvh, 1080px)' }}
    >
      {/* 朱砂 radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[58%] h-[420px] w-[420px] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(192,63,43,0.08) 0%, rgba(192,63,43,0) 70%)' }}
      />
      <div className="mx-auto max-w-[1200px] px-6 pt-16 text-center md:pt-24">
        <div className="hero-fade inline-block">
          <SealBadge tone="seal">纯前端 · 数据不出本机</SealBadge>
        </div>
        <div className="relative mt-8 inline-block text-left">
          <h1 className="font-serif text-[38px] font-black leading-[1.18] tracking-tight text-ink md:text-[56px] md:leading-[64px]">
            <span className="hero-title-line block">把一叠发票，</span>
            <span className="hero-title-line block">
              变成一本<span className="ink-underline text-seal">清晰的账</span>。
            </span>
          </h1>
          <span className="absolute -right-2 top-0 hidden rotate-[-6deg] font-instrument text-[18px] italic text-ink-faint md:-right-28 md:block">
            InvoiceCore
          </span>
        </div>
        <p className="hero-fade mx-auto mt-7 max-w-[560px] text-[16px] leading-[26px] text-ink-soft">
          批量拖入 PDF 与图片发票，自动识别票面要素、查重防重复报销、勾稽校验合规，归纳成台账一键导出
          Excel。识别与存储全部在你的浏览器本地完成。
        </p>
        <div className="hero-fade mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/workbench"
            className="flex h-12 items-center rounded-lg bg-seal px-7 text-[15px] font-medium text-white transition-all hover:-translate-y-px hover:bg-seal-deep active:scale-[0.97]"
          >
            进入工作台，开始核销 →
          </Link>
          <a
            href="#preview"
            className="flex h-12 items-center rounded-lg border border-cinnabar-line px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper-deep active:scale-[0.97]"
          >
            先看看示例发票
          </a>
        </div>
      </div>

      <div className="hero-img mx-auto mt-14 max-w-[720px] px-6" style={{ perspective: '1200px' }}>
        <img
          src="/hero-invoice.jpg"
          alt="电子发票样张"
          className="hero-img-inner block w-full rounded-2xl border border-cinnabar-line shadow-card"
          style={{ transform: 'rotateX(6deg)' }}
        />
      </div>
    </section>
  );
}

/* ---------- 页面组装 ---------- */
export default function Home() {
  // Lenis 平滑滚动 + ScrollTrigger 同步
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-paper paper-noise text-ink">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Pipeline />
        <Formats />
        <Compliance />
        <Preview />
        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[760px] px-6 py-24">
          <h2 className="text-center font-serif text-[28px] font-bold leading-[36px] md:text-[36px] md:leading-[44px]">
            常见问题
          </h2>
          <div className="mt-10 border-t border-cinnabar-line">
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
            ))}
          </div>
        </section>
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
