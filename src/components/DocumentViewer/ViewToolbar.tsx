import React from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ScannedFile } from '../../types';
import { ScaleMode } from './types';
import { formatSize } from '../../lib/format';
import {
  X, FileText, Lock, Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  ListTree, Sparkles, MessageSquare, Download, ArrowUp, ArrowDown, Printer,
  ChevronDown, Check,
} from 'lucide-react';

interface ViewToolbarProps {
  file: ScannedFile;
  onClose: () => void;
  pageCount: number;
  currentPage: number;
  onGoToPage: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
  scale: number;
  scaleMode: ScaleMode;
  onZoomChange: (scale: number, mode: ScaleMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchCount: number;
  activeMatch: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  tocOpen: boolean;
  tocCount: number;
  onToggleToc: () => void;
  insightsOpen: boolean;
  onToggleInsights: () => void;
  commentsOpen: boolean;
  commentCount: number;
  onToggleComments: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const zoomOptions = [
  { value: 'fit-width', label: 'Fit Width' },
  { value: 'fit-page', label: 'Fit Page' },
  ...ZOOM_PRESETS.map((z) => ({ value: String(Math.round(z * 100)), label: `${Math.round(z * 100)}%` })),
];

export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  file, onClose, pageCount, currentPage, onGoToPage, onPrev, onNext,
  scale, scaleMode, onZoomChange, searchQuery, onSearchChange, matchCount, activeMatch,
  onPrevMatch, onNextMatch, tocOpen, tocCount, onToggleToc, insightsOpen, onToggleInsights,
  commentsOpen, commentCount, onToggleComments, onDownload, onPrint,
}) => {
  const btn = 'p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:pointer-events-none';

  const scaleValue = scaleMode === 'custom' ? String(Math.round(scale * 100)) : scaleMode === 'fitWidth' ? 'fit-width' : 'fit-page';

  return (
    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-x-3 gap-y-2 shrink-0 overflow-x-auto thin-scrollbar-x">
      {/* File identity */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Close viewer">
          <X className="w-5 h-5" />
        </button>
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-xs">{file.name}</h3>
            <span className="flex items-center gap-1 text-[0.5625rem] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
              <Lock className="w-2.5 h-2.5" /> Read-Only
            </span>
            <span className="hidden sm:inline-block text-[0.5625rem] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 whitespace-nowrap">
              {file.classification.quarter} · {formatSize(file.size)}
            </span>
          </div>
          <p className="hidden sm:block text-[0.625rem] text-slate-400 font-mono truncate max-w-[220px] sm:max-w-md">{file.path}</p>
        </div>
      </div>

      <div className="flex-1 shrink-0" />

      {/* Page navigation */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPrev} disabled={currentPage <= 1} className={btn} title="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={currentPage}
            onChange={(e) => onGoToPage(parseInt(e.target.value || '1', 10))}
            className="w-8 sm:w-10 bg-transparent text-center text-xs font-bold text-slate-800 dark:text-slate-200 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">/ {pageCount || '—'}</span>
        </div>
        <button onClick={onNext} disabled={pageCount === 0 || currentPage >= pageCount} className={btn} title="Next page">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 shrink-0">
        <button onClick={() => onZoomChange(Math.max(0.25, Math.round((scale - 0.25) * 100) / 100), 'custom')} className={btn} title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <Listbox
          value={scaleValue}
          onChange={(v) => {
            if (v === 'fit-width') onZoomChange(1, 'fitWidth');
            else if (v === 'fit-page') onZoomChange(1, 'fitPage');
            else onZoomChange(parseInt(v, 10) / 100, 'custom');
          }}
        >
          <div className="relative">
            <ListboxButton className="inline-flex items-center gap-0.5 bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer px-1">
<span>
                    {scaleValue === 'fit-width' ? 'Fit Width' : scaleValue === 'fit-page' ? 'Fit Page' : `${scaleValue}%`}
                  </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </ListboxButton>
            <ListboxOptions className="absolute right-0 top-full mt-1 z-30 min-w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              {zoomOptions.map((option) => (
                <ListboxOption
                  key={option.value}
                  value={option.value}
                  className="data-[focus]:bg-slate-100 dark:data-[focus]:bg-slate-800 data-[selected]:text-emerald-600 dark:data-[selected]:text-emerald-400 cursor-pointer select-none px-3 py-1.5 flex items-center justify-between gap-3"
                >
                  <span>{option.label}</span>
                  {scaleValue === option.value && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
        <button onClick={() => onZoomChange(Math.min(2, Math.round((scale + 0.25) * 100) / 100), 'custom')} className={btn} title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in document"
            className="w-32 sm:w-40 bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
          />
        </div>
        {searchQuery.trim() && (
          <div className="flex items-center gap-0.5">
            <button onClick={onPrevMatch} className={btn} title="Previous match">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <span className="text-[0.625rem] font-bold text-slate-500 whitespace-nowrap">
              {matchCount > 0 ? `${activeMatch}/${matchCount}` : '0'}
            </span>
            <button onClick={onNextMatch} className={btn} title="Next match">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Panel toggles */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleToc}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors ${
            tocOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
          }`}
          title="Table of contents"
        >
          <ListTree className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Contents</span>
          {tocCount > 0 && <span className="text-[0.5625rem]">{tocCount}</span>}
        </button>
        <button
          onClick={onToggleInsights}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors ${
            insightsOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
          }`}
          title="Document insights"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Insights</span>
        </button>
        <button
          onClick={onToggleComments}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors ${
            commentsOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
          }`}
          title="Comments"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Comments</span>
          {commentCount > 0 && <span className="text-[0.5625rem]">{commentCount}</span>}
        </button>
      </div>

      <button
        onClick={onPrint}
        className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
        title="Print — choose a printer"
      >
        <Printer className="w-3.5 h-3.5" /> Print
      </button>

      <button
        onClick={onDownload}
        className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shrink-0"
      >
        <Download className="w-3.5 h-3.5" /> Save Copy
      </button>
    </div>
  );
};
