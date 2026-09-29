import React from 'react';
import { FilterOptions, QuarterId, MonthName, FileCategory } from '../types';
import { Calendar, Filter, X, Check, Copy } from 'lucide-react';

interface FilterPanelProps {
  filterOptions: FilterOptions;
  onChangeFilterOptions: (options: FilterOptions) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterOptions,
  onChangeFilterOptions,
  onResetFilters,
  totalResults,
}) => {
  const quickDateFilters: { id: FilterOptions['dateFilterType']; label: string }[] = [
    { id: 'ALL', label: 'All Time' },
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'LAST_7', label: 'Last 7 Days' },
    { id: 'LAST_30', label: 'Last 30 Days' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'THIS_QUARTER', label: 'This Quarter' },
  ];

  const quarters: (QuarterId | 'ALL')[] = ['ALL', 'Q1', 'Q2', 'Q3', 'Q4'];
  const categories: (FileCategory | 'ALL')[] = [
    'ALL',
    'Documents',
    'Images',
    'Videos',
    'Audio',
    'Archives',
    'Executables',
  ];

  return (
    <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] space-y-4 shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
      <div className="flex items-center justify-between pb-3 border-b border-[#f2edea]">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#542b2b]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#542b2b]">
            Advanced Document Filters
          </h2>
          <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[#f2edea] text-[#542b2b]">
            {totalResults} Matched
          </span>
        </div>

        <button
          onClick={onResetFilters}
          className="text-xs font-semibold text-[#705957] hover:text-[#542b2b] flex items-center gap-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quarter Selector */}
        <div>
          <label className="text-[0.6875rem] font-bold uppercase text-slate-400 block mb-1.5">
            Financial Quarter
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quarters.map((q) => (
              <button
                key={q}
                onClick={() => onChangeFilterOptions({ ...filterOptions, selectedQuarter: q })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterOptions.selectedQuarter === q
                    ? 'bg-[#542b2b] text-[#faf9f7] shadow-sm'
                    : 'bg-[#f2edea] text-[#542b2b] hover:bg-[#e9e1dd]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* File Category Pills */}
        <div>
          <label className="text-[0.6875rem] font-bold uppercase text-slate-400 block mb-1.5">
            Document Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onChangeFilterOptions({ ...filterOptions, selectedCategory: cat })}
                className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-colors ${
                  filterOptions.selectedCategory === cat
                    ? 'bg-[#542b2b]/10 text-[#542b2b] border border-[#542b2b]/30 font-bold'
                    : 'bg-[#f2edea] text-[#542b2b] hover:bg-[#e9e1dd]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Date Filters & Exact DD/MM/YYYY */}
        <div>
          <label className="text-[0.6875rem] font-bold uppercase text-slate-400 block mb-1.5">
            Date Range & Quick Presets
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {quickDateFilters.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onChangeFilterOptions({ ...filterOptions, dateFilterType: preset.id })}
                className={`px-2.5 py-1 text-[0.6875rem] font-semibold rounded-lg transition-colors ${
                  filterOptions.dateFilterType === preset.id
                    ? 'bg-[#542b2b] text-[#faf9f7] font-bold'
                    : 'bg-[#f2edea] text-[#705957] hover:text-[#542b2b]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Exact DD/MM/YYYY Manual Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Manual DD/MM/YYYY"
              value={filterOptions.exactDate || ''}
              onChange={(e) =>
                onChangeFilterOptions({
                  ...filterOptions,
                  exactDate: e.target.value,
                  dateFilterType: 'EXACT',
                })
              }
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Duplicate Filter Checkbox */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filterOptions.onlyDuplicates}
            onChange={(e) =>
              onChangeFilterOptions({ ...filterOptions, onlyDuplicates: e.target.checked })
            }
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
          />
          <Copy className="w-3.5 h-3.5 text-amber-500" />
          <span>Show Duplicates Only (Identical SHA-256 Hashes)</span>
        </label>
      </div>
    </div>
  );
};
