import { motion } from 'framer-motion';
import { ExternalLink, Landmark } from 'lucide-react';

const POLICIES = [
  {
    code: '财会〔2020〕6 号',
    title: '《关于规范电子会计凭证报销入账归档的通知》',
    desc: '来源合法、真实的电子会计凭证与纸质凭证具有同等法律效力；以数电票 PDF/OFD 打印件报销入账的，必须同时保存含数字签名的 XML 电子文件。',
    url: 'https://www.gov.cn/zhengce/zhengceku/2020-04/03/content_5498598.htm',
  },
  {
    code: '财政部 · 国家档案局令第 79 号',
    title: '《会计档案管理办法》',
    desc: '明确电子会计档案的归档范围、保管期限与移交规范；外部接收且附合规电子签名的电子会计资料，可仅以电子形式归档保存。',
    url: 'https://www.gov.cn/gongbao/content/2016/content_5041555.htm',
  },
  {
    code: '国家税务总局公告 2024 年第 11 号',
    title: '《关于推广应用全面数字化电子发票的公告》',
    desc: '2024-12-01 起数电发票在全国正式推广应用，与纸质发票具有同等法律效力；可通过税务数字账户免费查询、下载、导出发票。',
    url: 'https://www.gov.cn/zhengce/zhengceku/202411/content_6989164.htm',
  },
];

/** S6 规范依据：深墨底政策卡区。 */
export default function PolicySection() {
  return (
    <motion.section
      initial={{ backgroundColor: 'rgba(34,31,26,0)' }}
      whileInView={{ backgroundColor: 'rgba(34,31,26,1)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8 }}
      className="rounded-2xl p-6 text-paper-on-dark md:p-10"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-seal">
          <Landmark size={17} className="text-white" />
        </span>
        <div>
          <h2 className="font-serif text-[22px] font-bold">规范依据</h2>
          <p className="text-[12px] text-paper-on-dark/50">票核的检查规则对照以下法规内置</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {POLICIES.map((p, i) => (
          <motion.article
            key={p.code}
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col rounded-xl border border-paper-on-dark/10 bg-white/[0.04] p-5 transition-all hover:-translate-y-1 hover:border-seal/30"
          >
            <span className="font-mono text-[12px] font-medium text-seal">{p.code}</span>
            <h3 className="mt-2 text-[15px] font-bold leading-snug">{p.title}</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-paper-on-dark/60">{p.desc}</p>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-seal transition-colors hover:text-[#E1705C]"
            >
              政策原文 <ExternalLink size={13} />
            </a>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}
