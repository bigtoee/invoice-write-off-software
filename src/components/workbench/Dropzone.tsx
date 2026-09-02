import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { CloudUpload, Lock, FolderOpen, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_EXT } from './queue-types';

interface DropzoneProps {
  /** true 时收缩为 96px 紧凑条 */
  compact: boolean;
  onFiles: (files: File[]) => void;
}

function filterSupported(list: FileList | File[]): File[] {
  return Array.from(list).filter((f) => SUPPORTED_EXT.has((/\.([a-z0-9]+)$/i.exec(f.name)?.[1] ?? '').toLowerCase()));
}

export default function Dropzone({ compact, onFiles }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = filterSupported(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? filterSupported(e.target.files) : [];
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'dropzone relative flex w-full flex-col items-center justify-center overflow-hidden bg-warm-white px-6',
        compact ? 'min-h-[96px] py-3' : 'min-h-[240px] py-8',
        dragOver && 'animate-seal-breathe',
      )}
      data-drag={dragOver}
      style={{ cursor: 'copy' }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xml,.ofd,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error 非标准属性：选择整个文件夹
        webkitdirectory=""
        className="hidden"
        onChange={handleChange}
      />

      {compact ? (
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudUpload size={22} className="text-seal" />
            <span className="text-[14px] font-medium text-ink">
              {dragOver ? '松手，开始识别' : '继续添加发票文件'}
            </span>
            <span className="hidden text-[12px] text-ink-faint sm:inline">PDF / JPG / PNG / XML / OFD</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cinnabar-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-paper-deep"
          >
            <FilePlus2 size={14} /> 继续添加
          </button>
        </div>
      ) : (
        <>
          <motion.div animate={{ scale: dragOver ? 1.1 : 1 }} transition={{ duration: 0.15 }}>
            <CloudUpload size={40} className="text-seal" strokeWidth={1.6} />
          </motion.div>
          <p className="mt-4 text-[16px] font-medium text-ink">
            {dragOver ? '松手，开始识别' : '拖入发票文件，或点击选择'}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-faint">
            支持 PDF / JPG / PNG / XML / OFD · 可一次拖入整个文件夹
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="rounded-lg bg-seal px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-seal-deep hover:-translate-y-px active:scale-[0.97]"
            >
              选择文件
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dirInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-cinnabar-line px-4 py-2 text-[13px] text-ink transition-colors hover:bg-paper-deep active:scale-[0.97]"
            >
              <FolderOpen size={14} /> 选择文件夹
            </button>
          </div>
          <p className="absolute bottom-3 right-4 flex items-center gap-1 text-[12px] text-ink-faint">
            <Lock size={11} /> 文件仅在浏览器本地解析，不会上传服务器
          </p>
        </>
      )}
    </motion.div>
  );
}
