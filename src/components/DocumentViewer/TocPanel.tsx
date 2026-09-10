import React from 'react';
import { TocItem } from './types';
import { ListTree } from 'lucide-react';

interface TocPanelProps {
  items: TocItem[];
  onNavigate: (item: TocItem) => void;
}

export const TocPanel: React.FC<TocPanelProps> = ({ items, onNavigate }) => {
  if (items.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-400 text-center leading-relaxed">
        <ListTree className="w-6 h-6 mx-auto mb-2 text-slate-500" />
        No headings found in this document.
      </div>
    );
  }
  return (
    <div className="p-2 space-y-0.5 overflow-y-auto">
      <p className="px-2 py-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Contents</p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item)}
          style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.875}rem` }}
          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            item.level === 1 ? 'font-extrabold text-slate-800 dark:text-slate-100' : item.level === 2 ? 'font-bold text-slate-600 dark:text-slate-300' : 'font-medium text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="line-clamp-2 break-words">{item.text}</span>
        </button>
      ))}
    </div>
  );
};
