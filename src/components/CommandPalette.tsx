import React, { useState, useEffect } from 'react';
import { ScannedFile, QuarterId, FileCategory } from '../types';
import { Search, Command, X, FileText, ArrowRight, CornerDownLeft, Eye, LayoutDashboard, Copy, Image } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: ScannedFile[];
  onSelectFile: (file: ScannedFile) => void;
  onSelectTab: (tab: any) => void;
  onSelectQuarter: (quarter: QuarterId) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile,
  onSelectTab,
  onSelectQuarter,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter files matching query
  const filteredFiles = query.trim()
    ? files
        .filter((f) => {
          const q = query.toLowerCase();
          return (
            f.name.toLowerCase().includes(q) ||
            f.path.toLowerCase().includes(q) ||
            f.classification.quarter.toLowerCase().includes(q) ||
            f.classification.month.toLowerCase().includes(q) ||
            f.sha256.toLowerCase().includes(q) ||
            f.extension.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  const handleKeyDownInMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
      e.preventDefault();
      onSelectFile(filteredFiles[selectedIndex]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-20 p-4 font-sans">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3 bg-slate-50 dark:bg-slate-950">
          <Search className="w-5 h-5 text-emerald-500 shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            placeholder="Search documents, quarters (Q1-Q4), months, SHA256..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInMenu}
            className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[0.625rem] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Stream / Quick Jump Shortcuts */}
        <div className="p-2 max-h-96 overflow-y-auto space-y-1 text-xs">
          {query.trim() === '' ? (
            <div className="p-3 space-y-3 text-slate-500">
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Navigation Shortcuts
              </span>

              <div className="grid grid-cols-2 gap-2">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterId[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onSelectQuarter(q);
                      onSelectTab('dashboard');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-500 font-semibold text-left transition-colors flex items-center justify-between"
                  >
                    <span>Jump to {q} Documents</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    onSelectTab('photos');
                    onClose();
                  }}
                  className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium flex items-center justify-between text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2"><Image className="w-4 h-4 text-emerald-500" /> Open Photo Gallery</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    onSelectTab('duplicates');
                    onClose();
                  }}
                  className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium flex items-center justify-between text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2"><Copy className="w-4 h-4 text-amber-500" /> Duplicate File Inspector</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">
              No matching documents found for "{query}"
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold block truncate">{file.name}</span>
                      <span className="text-[0.625rem] text-slate-400 font-mono block truncate">
                        {file.path}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-2 py-0.5 text-[0.625rem] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      {file.classification.quarter}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[0.625rem] text-slate-400 flex items-center justify-between px-4">
          <span>Use ↑ ↓ to navigate • ENTER to select</span>
          <span>QuarterSort AI Search</span>
        </div>
      </div>
    </div>
  );
};
