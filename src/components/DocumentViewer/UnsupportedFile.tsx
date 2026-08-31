import React, { useCallback } from 'react';
import { ScannedFile } from '../../types';
import { formatSize } from '../../lib/format';
import { readFileBlob } from '../../lib/blob';
import { FileWarning, Download, FileIcon } from 'lucide-react';

interface Props {
  file: ScannedFile;
}

export const UnsupportedFile: React.FC<Props> = ({ file }) => {
  const handleDownload = useCallback(async () => {
    const blob = await readFileBlob(file);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [file]);

  const ext = (file.extension || '').toUpperCase() || 'UNKNOWN';

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <FileWarning className="w-7 h-7 text-amber-500" />
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 mb-2">
          <FileIcon className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-sm break-all">{file.name}</span>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          {ext} · {formatSize(file.size)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-5 leading-relaxed">
          This file type can't be previewed in the viewer.
          {file.size > 3 * 1024 * 1024 ? ' It may also be too large to render safely.' : ''}{' '}
          Use the button below to download it.
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Download className="w-4 h-4" /> Download
        </button>
      </div>
    </div>
  );
};
