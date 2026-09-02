import type { RecognitionResult } from '@/lib/recognition';

/** 识别队列四态状态机：queued → recognizing → recognized / pending / error → archived */
export type QueueStatus = 'queued' | 'recognizing' | 'recognized' | 'pending' | 'error' | 'archived';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  format: string;
  previewUrl?: string;
  status: QueueStatus;
  progress: number;
  stage: string;
  channel?: string;
  result?: RecognitionResult;
  /** 校验问题（识别完成后计算） */
  issues?: string[];
  /** 异常原因（pending/error 展示） */
  reason?: string;
  archivedId?: string;
}

export function detectFormat(name: string): string {
  const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? '').toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'xml') return 'XML';
  if (ext === 'ofd') return 'OFD';
  if (ext === 'jpg' || ext === 'jpeg') return 'JPG';
  if (ext === 'png') return 'PNG';
  return ext ? ext.toUpperCase() : 'FILE';
}

export const SUPPORTED_EXT = new Set(['pdf', 'xml', 'ofd', 'jpg', 'jpeg', 'png']);

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isImageFormat(format: string): boolean {
  return format === 'JPG' || format === 'PNG';
}
