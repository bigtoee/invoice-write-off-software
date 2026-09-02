import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SectionCard, Row, ChipGroup, SelectBox } from '@/components/settings/common';
import { cn } from '@/lib/utils';
import type { AppSettings } from '@/lib/settings';
import type { ExtraSettings } from '@/pages/Settings';

type TestState = 'idle' | 'loading' | 'ok' | 'fail';

interface ByokSectionProps {
  settings: AppSettings;
  extra: ExtraSettings;
  update: (patch: Partial<AppSettings>) => void;
  updateExtra: (patch: Partial<ExtraSettings>) => void;
  savedTick: number;
}

/** 向用户配置的 OpenAI 兼容接口发一条最小 chat 请求，验证连通性。 */
async function testConnection(endpoint: string, key: string, model: string): Promise<{ ok: boolean; message: string }> {
  const base = endpoint.trim().replace(/\/+$/, '');
  if (!base) return { ok: false, message: '请先填写 Base URL' };
  if (!key.trim()) return { ok: false, message: '请先填写 API Key' };
  if (!model.trim()) return { ok: false, message: '请先填写模型名' };

  const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: '连接超时（15 秒无响应），请检查 Base URL 或网络' };
    }
    return { ok: false, message: '无法连接到服务商：请检查 Base URL 是否正确、网络是否可用（可能受跨域限制）' };
  }
  clearTimeout(timer);

  if (res.ok) return { ok: true, message: '连接成功，接口可用' };
  if (res.status === 401 || res.status === 403) return { ok: false, message: `密钥无效或没有访问权限（HTTP ${res.status}）` };
  if (res.status === 404) return { ok: false, message: '接口路径或模型名不存在（HTTP 404），请核对 Base URL 与模型名' };
  if (res.status === 429) return { ok: false, message: '请求被限流或额度不足（HTTP 429）' };
  return { ok: false, message: `服务商返回错误（HTTP ${res.status}），请查看服务商控制台` };
}

/** S3 智能识别增强（BYOK 大模型配置）。 */
export default function ByokSection({ settings, extra, update, updateExtra, savedTick }: ByokSectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMsg, setTestMsg] = useState('');

  const enabled = extra.byokEnabled;

  const runTest = async () => {
    setTestState('loading');
    setTestMsg('');
    const result = await testConnection(settings.byokEndpoint, settings.byokKey, settings.byokModel);
    setTestState(result.ok ? 'ok' : 'fail');
    setTestMsg(result.message);
  };

  const inputCls =
    'w-full rounded-lg border border-cinnabar-line bg-warm-white px-3 py-2 font-mono text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-seal disabled:opacity-50 sm:w-[300px]';

  return (
    <SectionCard
      id="sec-byok"
      title="智能识别增强"
      desc="可选的大模型识别增强，密钥仅保存在本机浏览器。"
      badge={
        <span className="rounded-md border border-cinnabar-line px-2 py-0.5 text-[11px] font-medium text-ink-faint">
          可选 · 自备密钥
        </span>
      }
      savedTick={savedTick}
    >
      <div className="mb-2 rounded-lg bg-paper-deep p-4 text-[13px] leading-relaxed text-ink-soft">
        默认的本地 OCR 免费且离线。若需更高的图片识别准确率，可接入你自己的多模态大模型 API
        Key——密钥仅存本机浏览器，请求由你的浏览器直连服务商。
      </div>

      <Row label="启用大模型识别" hint="关闭时仅使用本地 OCR，不会产生任何费用。">
        <Switch checked={enabled} onCheckedChange={(v) => updateExtra({ byokEnabled: v })} />
      </Row>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Row label="服务商" hint="任何兼容 OpenAI Chat Completions 的接口均可接入。">
              <SelectBox
                options={[
                  { value: 'openai', label: '通用 OpenAI 兼容接口' },
                  { value: 'custom', label: '自定义 Base URL' },
                ]}
                value={extra.byokProvider}
                onChange={(v) => {
                  const patch: Partial<ExtraSettings> = { byokProvider: v };
                  updateExtra(patch);
                  if (v === 'openai' && !settings.byokEndpoint) {
                    update({ byokEndpoint: 'https://api.openai.com/v1' });
                  }
                }}
              />
            </Row>

            <Row label="API Key" hint="仅存本机浏览器 localStorage，不会上传到任何票核服务器。">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.byokKey}
                    onChange={(e) => update({ byokKey: e.target.value })}
                    placeholder="sk-…"
                    autoComplete="off"
                    className={cn(inputCls, 'pr-9')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
                    aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void runTest()}
                  disabled={testState === 'loading'}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cinnabar-line px-3 py-2 text-[12px] font-medium text-ink-soft transition-all hover:bg-paper-deep active:scale-[0.97] disabled:opacity-60"
                >
                  {testState === 'loading' && <Loader2 size={13} className="animate-spin" />}
                  测试连接
                </button>
              </div>
            </Row>

            {testState !== 'idle' && testState !== 'loading' && (
              <div
                className={cn(
                  'mb-1 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px]',
                  testState === 'ok' ? 'bg-jade/[0.07] text-jade' : 'bg-seal/[0.06] text-seal',
                )}
              >
                {testState === 'ok' ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                {testState === 'ok' ? '连接成功 ✓' : '连接失败'}
                <span className="text-[12px] opacity-80">{testMsg}</span>
              </div>
            )}

            <Row label="Base URL" hint="OpenAI 兼容接口地址，通常以 /v1 结尾。">
              <input
                type="text"
                value={settings.byokEndpoint}
                onChange={(e) => update({ byokEndpoint: e.target.value })}
                placeholder="https://api.example.com/v1"
                autoComplete="off"
                className={inputCls}
              />
            </Row>

            <Row label="模型名" hint="需为支持图片输入的多模态模型。">
              <input
                type="text"
                value={settings.byokModel}
                onChange={(e) => update({ byokModel: e.target.value })}
                placeholder="gpt-4o / qwen-vl-max …"
                autoComplete="off"
                className={inputCls}
              />
            </Row>

            <Row label="使用策略" hint="控制何时调用大模型，避免不必要的费用。">
              <ChipGroup
                options={[
                  { value: 'low-confidence', label: '仅 OCR 置信度低时调用（推荐）' },
                  { value: 'always', label: '所有图片都调用' },
                ]}
                value={extra.byokStrategy}
                onChange={(v) => updateExtra({ byokStrategy: v })}
              />
            </Row>

            <div className="mt-2 rounded-lg border border-amber/30 bg-amber/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber">
              调用产生的费用由你的服务商账户承担；启用后图片内容将发送至该服务商。
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}
