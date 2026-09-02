import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SectionCard, Row, ChipGroup, SelectBox } from '@/components/settings/common';
import ByokSection from '@/components/settings/ByokSection';
import DataSection from '@/components/settings/DataSection';
import { getSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

/* ---------- 设置页私有的扩展偏好（localStorage 单 key 存储） ---------- */

export const EXTRA_SETTINGS_KEY = 'invoicecore:settings:extra';

export interface ExtraSettings {
  /** 命中查重时的默认动作 */
  dupAction: 'mark' | 'block';
  /** 勾稽校验允许的尾差（元） */
  tolerance: number;
  /** 工作台显示「加载示例发票」入口 */
  showSample: boolean;
  byokEnabled: boolean;
  byokProvider: 'openai' | 'custom';
  byokStrategy: 'low-confidence' | 'always';
}

const DEFAULT_EXTRA: ExtraSettings = {
  dupAction: 'mark',
  tolerance: 0.01,
  showSample: true,
  byokEnabled: false,
  byokProvider: 'openai',
  byokStrategy: 'low-confidence',
};

function loadExtra(): ExtraSettings {
  try {
    const raw = localStorage.getItem(EXTRA_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_EXTRA };
    return { ...DEFAULT_EXTRA, ...(JSON.parse(raw) as Partial<ExtraSettings>) };
  } catch {
    return { ...DEFAULT_EXTRA };
  }
}

const NAV = [
  { id: 'sec-prefs', label: '识别偏好' },
  { id: 'sec-byok', label: '智能识别增强' },
  { id: 'sec-data', label: '数据与存储' },
  { id: 'sec-about', label: '关于' },
];

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [extra, setExtra] = useState<ExtraSettings>(loadExtra);
  /** 各分组「已保存」提示的计数器 */
  const [ticks, setTicks] = useState({ prefs: 0, byok: 0 });

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(saveSettings(patch));
  }, []);

  const updateExtra = useCallback((patch: Partial<ExtraSettings>) => {
    setExtra((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(EXTRA_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const touch = useCallback((key: 'prefs' | 'byok') => {
    setTicks((t) => ({ ...t, [key]: t[key] + 1 }));
  }, []);

  const updatePrefs = (patch: Partial<AppSettings>) => {
    update(patch);
    touch('prefs');
  };
  const updateExtraPrefs = (patch: Partial<ExtraSettings>) => {
    updateExtra(patch);
    touch('prefs');
  };
  const updateByok = (patch: Partial<AppSettings>) => {
    update(patch);
    touch('byok');
  };
  const updateExtraByok = (patch: Partial<ExtraSettings>) => {
    updateExtra(patch);
    touch('byok');
  };

  const resetAll = () => {
    setSettings(saveSettings({ ...DEFAULT_SETTINGS }));
    setExtra({ ...DEFAULT_EXTRA });
    localStorage.setItem(EXTRA_SETTINGS_KEY, JSON.stringify(DEFAULT_EXTRA));
    setTicks((t) => ({ prefs: t.prefs + 1, byok: t.byok + 1 }));
  };

  return (
    <div className="flex gap-8">
      {/* 左侧锚点导航 */}
      <aside className="hidden w-[200px] shrink-0 lg:block">
        <nav className="sticky top-24 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={cn(
                'block w-full rounded-lg px-3.5 py-2 text-left text-[13px] text-ink-soft transition-colors',
                'hover:bg-paper-deep hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 右侧表单区 */}
      <div className="w-full max-w-[720px] space-y-8">
        {/* S1 头部 */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="font-serif text-[28px] font-bold text-ink md:text-[36px]">设置</h1>
            <p className="mt-1 text-[14px] text-ink-faint">所有设置保存在本机浏览器，不上传</p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
          >
            <RotateCcw size={14} /> 恢复默认
          </button>
        </motion.header>

        {/* S2 识别偏好 */}
        <SectionCard id="sec-prefs" title="识别偏好" desc="识别与入库环节的默认行为。" savedTick={ticks.prefs}>
          <Row label="OCR 语言" hint="图片识别使用的语言模型。">
            <SelectBox
              options={[
                { value: 'chi_sim', label: '中文简体 chi_sim（默认）' },
                { value: 'chi_sim+eng', label: '中文 + 英文' },
                { value: 'eng', label: '英文' },
              ]}
              value={settings.ocrLang}
              onChange={(v) => updatePrefs({ ocrLang: v })}
            />
          </Row>

          <Row label="识别后自动校验" hint="入库前自动执行勾稽、税号、查重检查。">
            <Switch checked={settings.autoValidate} onCheckedChange={(v) => updatePrefs({ autoValidate: v })} />
          </Row>

          <Row label="重复发票处理" hint="命中查重时的默认动作。">
            <ChipGroup
              options={[
                { value: 'mark', label: '标记待确认（默认）' },
                { value: 'block', label: '直接拦截不入库' },
              ]}
              value={extra.dupAction}
              onChange={(v) => updateExtraPrefs({ dupAction: v })}
            />
          </Row>

          <Row label="尾差容许范围" hint="勾稽校验允许的金额误差（0–0.10 元）。">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateExtraPrefs({ tolerance: Math.max(0, Number((extra.tolerance - 0.01).toFixed(2))) })}
                className="h-8 w-8 rounded-md border border-cinnabar-line text-[15px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
                aria-label="减少尾差"
              >
                −
              </button>
              <span className="w-[72px] rounded-md bg-paper-deep px-2 py-1.5 text-center font-mono text-[13px] tabular-nums text-ink">
                ¥{extra.tolerance.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => updateExtraPrefs({ tolerance: Math.min(0.1, Number((extra.tolerance + 0.01).toFixed(2))) })}
                className="h-8 w-8 rounded-md border border-cinnabar-line text-[15px] text-ink-soft transition-colors hover:bg-paper-deep active:scale-[0.97]"
                aria-label="增加尾差"
              >
                +
              </button>
            </div>
          </Row>

          <Row label="示例发票" hint="在工作台显示「加载示例发票」入口。">
            <Switch checked={extra.showSample} onCheckedChange={(v) => updateExtraPrefs({ showSample: v })} />
          </Row>
        </SectionCard>

        {/* S3 BYOK */}
        <ByokSection
          settings={settings}
          extra={extra}
          update={updateByok}
          updateExtra={updateExtraByok}
          savedTick={ticks.byok}
        />

        {/* S4 数据与存储 */}
        <DataSection />

        {/* S5 关于 */}
        <SectionCard id="sec-about" title="关于票核">
          <div className="flex items-center gap-4">
            <motion.img
              src="/logo-seal.svg"
              alt="票核 Logo"
              className="h-12 w-12"
              initial={{ rotate: -3 }}
              whileHover={{ rotate: 0 }}
              transition={{ duration: 0.3 }}
            />
            <div>
              <p className="font-serif text-[18px] font-bold text-ink">
                票核 <span className="font-instrument text-[13px] italic text-ink-faint">InvoiceCore</span>
                <span className="ml-2 font-mono text-[12px] font-normal text-ink-faint">v1.0.0</span>
              </p>
              <p className="text-[13px] text-ink-soft">纯前端发票核销工具 · 数据不出本机</p>
              <p className="mt-1 text-[12px] text-ink-faint">当前版本 v1.2.3（构建 2026-08-10）· 全平台兼容版：2020 年后浏览器内核均可识别（含 CID 字体 / 扫描件 OCR / 刷新修复）</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 border-t border-cinnabar-line pt-4 text-[13px]">
            <div className="flex gap-3">
              <span className="w-[72px] shrink-0 text-[12px] text-ink-faint">技术说明</span>
              <span className="text-ink-soft">识别、校验、存储均在浏览器本地完成（IndexedDB），财务数据零上传。</span>
            </div>
            <div className="flex gap-3">
              <span className="w-[72px] shrink-0 text-[12px] text-ink-faint">合规依据</span>
              <span className="text-ink-soft">财会〔2020〕6 号 · 财政部·国家档案局令第 79 号 · 数电票 2024 年第 11 号公告。</span>
            </div>
            <div className="flex gap-3">
              <span className="w-[72px] shrink-0 text-[12px] text-ink-faint">反馈入口</span>
              <a href="mailto:feedback@invoicecore.app" className="font-medium text-seal hover:underline">
                意见反馈 →
              </a>
            </div>
          </div>

          <p className="mt-4 border-t border-cinnabar-line pt-3 text-[12px] leading-relaxed text-ink-faint">
            票核提供识别与校验辅助，不构成税务或法律意见。真伪查验请以国家税务总局平台结果为准。
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
