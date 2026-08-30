import React, { useState, useMemo } from 'react';
import { ScannedFile, QuarterId, MonthName } from '../types';
import { QUARTER_MONTHS, QUARTER_LABELS, getFinancialYear } from '../lib/quarterEngine';
import { Calendar, FileText, ArrowRight, HardDrive, PieChart, ChevronDown } from 'lucide-react';

interface QuarterCardsProps {
  files: ScannedFile[];
  onSelectQuarterFilter: (quarter: QuarterId | 'ALL', month?: MonthName | 'ALL') => void;
  onNeedsReviewFilter?: () => void;
}

const QUARTER_CONFIG: Record<QuarterId, { color: string; bar: string; dot: string }> = {
  Q1: { color: 'text-emerald-400', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  Q2: { color: 'text-cyan-400', bar: 'bg-cyan-500', dot: 'bg-cyan-500' },
  Q3: { color: 'text-amber-400', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Q4: { color: 'text-indigo-400', bar: 'bg-indigo-500', dot: 'bg-indigo-500' },
};

const MONTH_COLORS: Record<string, string> = {
  July: 'bg-emerald-500/20 text-emerald-400', August: 'bg-emerald-500/20 text-emerald-400', September: 'bg-emerald-500/20 text-emerald-400',
  October: 'bg-cyan-500/20 text-cyan-400', November: 'bg-cyan-500/20 text-cyan-400', December: 'bg-cyan-500/20 text-cyan-400',
  January: 'bg-amber-500/20 text-amber-400', February: 'bg-amber-500/20 text-amber-400', March: 'bg-amber-500/20 text-amber-400',
  April: 'bg-indigo-500/20 text-indigo-400', May: 'bg-indigo-500/20 text-indigo-400', June: 'bg-indigo-500/20 text-indigo-400',
};

interface FYData {
  fyLabel: string;
  fyStartYear: number;
  quarters: Record<QuarterId, {
    fileCount: number;
    sizeBytes: number;
    months: Record<MonthName, { count: number; sizeBytes: number; year: number }>;
  }>;
}

export const QuarterCards: React.FC<QuarterCardsProps> = ({ files, onSelectQuarterFilter, onNeedsReviewFilter }) => {
  const { fyGroups, totalScanned } = useMemo(() => {
    const groups = new Map<string, FYData>();

    for (const f of files) {
      const { financialYear, quarter, month, year, monthNumber } = f.classification;
      if (!groups.has(financialYear)) {
        const fyMatch = financialYear.match(/FY (\d{4})/);
        const fyStartYear = fyMatch ? parseInt(fyMatch[1], 10) : year;
        groups.set(financialYear, {
          fyLabel: financialYear,
          fyStartYear,
          quarters: {
            Q1: { fileCount: 0, sizeBytes: 0, months: {} as any },
            Q2: { fileCount: 0, sizeBytes: 0, months: {} as any },
            Q3: { fileCount: 0, sizeBytes: 0, months: {} as any },
            Q4: { fileCount: 0, sizeBytes: 0, months: {} as any },
          },
        });
      }

      const fy = groups.get(financialYear)!;
      const q = fy.quarters[quarter];
      q.fileCount++;
      q.sizeBytes += f.size;
      if (!q.months[month]) q.months[month] = { count: 0, sizeBytes: 0, year };
      q.months[month].count++;
      q.months[month].sizeBytes += f.size;
    }

    const sorted = Array.from(groups.entries()).sort((a, b) => b[1].fyStartYear - a[1].fyStartYear);
    return { fyGroups: sorted, totalScanned: files.length };
  }, [files]);

  const currentFYStartYear = useMemo(() => {
    const now = new Date();
    const fy = getFinancialYear(now.getFullYear(), now.getMonth() + 1);
    return Number(fy.match(/FY (\d{4})/)?.[1] ?? now.getFullYear());
  }, []);

  const [selectedFYStart, setSelectedFYStart] = useState<number | null>(null);

  const currentFY = useMemo(() => {
    if (fyGroups.length === 0) return undefined;
    if (selectedFYStart != null) {
      const match = fyGroups.find(([, d]) => d.fyStartYear === selectedFYStart);
      if (match) return match[1];
    }
    const currentMatch = fyGroups.find(([, d]) => d.fyStartYear === currentFYStartYear);
    return currentMatch ? currentMatch[1] : fyGroups[0][1];
  }, [fyGroups, selectedFYStart, currentFYStartYear]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  if (fyGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            Financial Quarter Summary
          </h1>
        </div>
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <PieChart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-slate-400 text-sm">No files scanned yet</h4>
          <p className="text-xs text-slate-500 mt-1">Connect a USB drive to see quarter classification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
{/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              Financial Quarter Summary
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {totalScanned} files
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Financial Year
            </label>
            <div className="relative">
              <select
                value={currentFY ? currentFY.fyStartYear : ''}
                onChange={(e) => setSelectedFYStart(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              >
                {fyGroups.map(([fyLabel, d]) => {
                  const count = d.quarters.Q1.fileCount + d.quarters.Q2.fileCount + d.quarters.Q3.fileCount + d.quarters.Q4.fileCount;
                  const isCurrent = d.fyStartYear === currentFYStartYear;
                  return (
                    <option key={fyLabel} value={d.fyStartYear}>
                      {fyLabel} ({count} files){isCurrent ? ' — Current' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            </div>
            <button
              onClick={() => onSelectQuarterFilter('ALL', 'ALL')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1.5"
            >
              View All Files
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      {currentFY && (
        <>
          {/* FY description bar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-300">{currentFY.fyLabel}</span>
              {' '}—{' '}
              {QUARTER_MONTHS.Q1.map((m, i) => i === 0 ? `${m} ${currentFY.fyStartYear}` : `${m} ${currentFY.fyStartYear}`).join(' · ')}
              {' '}&mdash;{' '}
              {QUARTER_MONTHS.Q4.map(m => `${m} ${currentFY.fyStartYear + 1}`).join(' · ')}
            </p>
            <span className="hidden sm:inline text-[11px] text-slate-600">
              1 Jul {currentFY.fyStartYear} &rarr; 30 Jun {currentFY.fyStartYear + 1}
            </span>
          </div>

          {/* Quarter summary bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterId[]).map((qId) => {
              const qTotal = currentFY.quarters[qId].fileCount;
              const pct = totalScanned > 0 ? (qTotal / totalScanned) * 100 : 0;
              if (pct === 0) return null;
              return <div key={qId} className={QUARTER_CONFIG[qId].bar} style={{ width: `${pct}%` }} />;
            })}
          </div>

          {/* 4 Quarter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterId[]).map((qId) => {
              const cfg = QUARTER_CONFIG[qId];
              const qData = currentFY.quarters[qId];

              const monthYearForQuarter = (month: MonthName, idx: number): number => {
                if (qId === 'Q1' || qId === 'Q2') return currentFY.fyStartYear;
                return currentFY.fyStartYear + 1;
              };

              return (
                <div key={qId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-xs rounded-lg font-bold ${MONTH_COLORS[QUARTER_MONTHS[qId][0]]}`}>
                        {qId}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {totalScanned > 0 ? Math.round((qData.fileCount / totalScanned) * 100) : 0}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-3">
                    {QUARTER_MONTHS[qId].map((m, i) => `${m} ${monthYearForQuarter(m, i)}`).join(' · ')}
                  </p>

                  <div className="flex items-baseline justify-between mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-black ${cfg.color}`}>{qData.fileCount}</span>
                      <span className="text-xs text-slate-500">files</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{formatSize(qData.sizeBytes)}</span>
                  </div>

                  <div className="space-y-1.5 mt-auto pt-4 border-t border-slate-800">
                    {QUARTER_MONTHS[qId].map((month) => {
                      const mData = qData.months[month];
                      if (!mData || mData.count === 0) return null;
                      return (
                        <button
                          key={`${currentFY.fyLabel}-${month}`}
                          onClick={() => onSelectQuarterFilter(qId, month)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 hover:border-slate-700 transition-colors"
                        >
                          <span className="font-medium text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            {month} {mData.year}
                          </span>
                          <span className="font-mono text-slate-300">
                            {mData.count} <span className="text-slate-600">·</span>{' '}
                            <span className="text-slate-500">{formatSize(mData.sizeBytes)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => onSelectQuarterFilter(qId, 'ALL')}
                    className={`mt-3 text-[11px] font-semibold ${cfg.color} hover:underline flex items-center gap-1`}
                  >
                    Explore all {qId} files <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer insight */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">
              Classification: Metadata → Filename → OCR → Folder → Modified → Created
            </p>
            <p className="text-xs text-slate-500">
              6-tier priority engine. Files flagged "Needs Review" when confidence below 60%.
            </p>
          </div>
        </div>
        {files.filter(f => f.classification.needsReview).length > 0 && (
          <button
            onClick={() => onNeedsReviewFilter?.()}
            className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center gap-3 hover:bg-amber-500/15 transition-colors shrink-0"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-amber-400">
                {files.filter(f => f.classification.needsReview).length} Need{files.filter(f => f.classification.needsReview).length === 1 ? '' : 's'} Review
              </p>
              <p className="text-[11px] text-amber-500/70">Click to review low-confidence files</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
