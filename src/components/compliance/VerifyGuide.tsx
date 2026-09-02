import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, ClipboardList, Stamp, Copy, Check } from 'lucide-react';

const VERIFY_URL = 'https://inv-veri.chinatax.gov.cn';

interface VerifyGuideProps {
  verifiedCount: number;
  total: number;
}

const STEPS = [
  {
    icon: Globe,
    title: '打开查验平台',
    desc: '国家税务总局全国增值税发票查验平台（官方唯一入口）。',
    action: 'copy',
  },
  {
    icon: ClipboardList,
    title: '录入票面要素',
    desc: '发票号码、开票日期、金额 / 校验码；票核详情抽屉内可一键复制。',
    action: null,
  },
  {
    icon: Stamp,
    title: '回标查验结果',
    desc: '查验完成后回到发票台账，在详情中人工标记「已查验」状态章。',
    action: null,
  },
] as const;

/** S5 真伪查验三步指引 + 已查验进度条。 */
export default function VerifyGuide({ verifiedCount, total }: VerifyGuideProps) {
  const [copied, setCopied] = useState(false);
  const pct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(VERIFY_URL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = VERIFY_URL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="rounded-xl border border-cinnabar-line bg-warm-white p-6 shadow-card">
      <h2 className="font-serif text-[20px] font-bold text-ink">发票真伪查验</h2>
      <p className="mb-5 mt-1 text-[13px] text-ink-faint">
        国家税务总局全国增值税发票查验平台暂无批量接口，请按以下流程逐张查验并回标记。
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-cinnabar-line bg-paper p-4 transition-all hover:-translate-y-1 hover:shadow-card"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-seal text-white">
                <step.icon size={16} />
              </span>
              <span className="text-[12px] font-medium text-ink-faint">第 {['一', '二', '三'][i]} 步</span>
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{step.desc}</p>
            {step.action === 'copy' && (
              <button
                type="button"
                onClick={copyUrl}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-cinnabar-line bg-warm-white px-3 py-2 font-mono text-[12px] text-ink-soft transition-all hover:bg-paper-deep active:scale-[0.97]"
              >
                {copied ? <Check size={13} className="text-jade" /> : <Copy size={13} />}
                {copied ? '已复制' : VERIFY_URL}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-paper-deep/60 px-4 py-3">
        <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
          <span className="text-ink-soft">
            已查验进度 <span className="font-mono tabular-nums text-jade">{verifiedCount}</span>
            <span className="text-ink-faint"> / </span>
            <span className="font-mono tabular-nums">{total}</span>
          </span>
          <span className="font-mono tabular-nums text-ink-faint">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cinnabar-line">
          <motion.div
            className="h-full rounded-full bg-jade"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: total > 0 ? verifiedCount / total : 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">
          查验平台每张发票每日限查 5 次，可查验近 5 年内开具的发票；查验结果以平台返回为准，请在台账详情中人工标记。
        </p>
      </div>
    </section>
  );
}
