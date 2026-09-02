const STORAGE_KEY = 'invoicecore:settings';

export interface AppSettings {
  /** 入库前自动执行合规校验 */
  autoValidate: boolean;
  /** 图片 OCR 语言 */
  ocrLang: 'chi_sim' | 'chi_sim+eng' | 'eng';
  /** BYOK：自定义大模型端点（可选） */
  byokEndpoint: string;
  byokKey: string;
  byokModel: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoValidate: true,
  ocrLang: 'chi_sim',
  byokEndpoint: '',
  byokKey: '',
  byokModel: '',
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
