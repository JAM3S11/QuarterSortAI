import React, { useState, useMemo } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ScannedFile, QuarterId, MonthName } from '../types';
import { QUARTER_MONTHS, QUARTER_LABELS, getFinancialYear } from '../lib/quarterEngine';
import { Calendar, FileText, ArrowRight, HardDrive, PieChart, ChevronDown, Check } from 'lucide-react';

interface QuarterCardsProps {
  files: ScannedFile[];
  onSelectQuarterFilter: (quarter: QuarterId | 'ALL', month?: MonthName | 'ALL') => void;
  onNeedsReviewFilter?: () => void;
}

// Quarter swatches: a maroon -> blush ramp matching the --chart-1..4 tokens in index.css.
// Numbers and labels stay in ink; the swatch alone carries the quarter identity.
const QUARTER_CONFIG: Record<QuarterId, { bar: string }> = {
  Q1: { bar: 'bg-[#542b2b]' },
  Q2: { bar: 'bg-[#805d59]' },
  Q3: { bar: 'bg-[#9d8580]' },
  Q4: { bar: 'bg-[#c89d8d]' },
};

const QUARTER_IDS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#542b2b]/30';

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

  const fyOptionLabel = (d: FYData) => {
    const count = d.quarters.Q1.fileCount + d.quarters.Q2.fileCount + d.quarters.Q3.fileCount + d.quarters.Q4.fileCount;
    return `${d.fyLabel} (${count} files)${d.fyStartYear === currentFYStartYear ? ' — Current' : ''}`;
  };

  const reviewCount = useMemo(() => files.filter((f) => f.classification.needsReview).length, [files]);

  if (fyGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d8ceca]">
          <h1 className="text-xl font-extrabold text-[#542b2b] flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#542b2b]" />
            Financial Quarter Summary
          </h1>
        </div>
        <div className="p-12 text-center bg-[#fffdfc] rounded-2xl border border-[#d8ceca] shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
          <PieChart className="w-10 h-10 text-[#9d8580] mx-auto mb-3" />
          <h4 className="font-bold text-[#705957] text-sm">No files scanned yet</h4>
          <p className="text-xs text-[#705957] mt-1 max-w-md mx-auto">
            The <span className="font-bold text-[#542b2b]">Dashboard</span> organises every scanned file into financial quarters (Q1–Q4) and months, showing file counts, storage sizes, and per-month breakdowns so you can audit document distribution at a glance. Connect a USB drive to see your quarter classification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
{/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d8ceca]">
          <div>
            <h1 className="text-xl font-extrabold text-[#542b2b] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#542b2b]" />
              Financial Quarter Summary
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f2edea] text-[#542b2b]">
                {totalScanned} files
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[0.6875rem] uppercase tracking-wider text-[#705957] font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#542b2b]" />
              Financial Year
            </label>
            <Listbox
              value={currentFY ? currentFY.fyStartYear : null}
              onChange={(val) => setSelectedFYStart(val)}
            >
              <div className="relative">
                <ListboxButton className="inline-flex items-center pl-3 pr-8 py-1.5 rounded-xl border border-[#d8ceca] bg-[#fffdfc] text-[#542b2b] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#542b2b]/20 cursor-pointer">
                  <span className="truncate max-w-64">{currentFY ? fyOptionLabel(currentFY) : 'Select Year'}</span>
                </ListboxButton>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#705957]" />
                <ListboxOptions className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#fffdfc] border border-[#d8ceca] rounded-xl shadow-2xl py-1 text-xs font-semibold text-[#542b2b]">
                  {fyGroups.map(([fyLabel, d]) => (
                    <ListboxOption
                      key={fyLabel}
                      value={d.fyStartYear}
                      className="data-[focus]:bg-[#f2edea] data-[selected]:text-[#542b2b] cursor-pointer select-none px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <span className="truncate">{fyOptionLabel(d)}</span>
                      {currentFY && d.fyStartYear === currentFY.fyStartYear && (
                        <Check className="w-3.5 h-3.5 shrink-0 text-[#542b2b]" />
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
            <button
              onClick={() => onSelectQuarterFilter('ALL', 'ALL')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] transition-colors flex items-center gap-1.5"
            >
              View All Files
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      {currentFY && (
        <>
          {/* FY description bar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#705957]">
              <span className="font-semibold text-[#542b2b]">{currentFY.fyLabel}</span>
              {' '}—{' '}
              {QUARTER_MONTHS.Q1.map((m) => `${m} ${currentFY.fyStartYear}`).join(' · ')}
              {' '}&mdash;{' '}
              {QUARTER_MONTHS.Q4.map((m) => `${m} ${currentFY.fyStartYear + 1}`).join(' · ')}
            </p>
            <span className="hidden shrink-0 font-mono text-[0.6875rem] text-[#705957] sm:inline">
              1 Jul {currentFY.fyStartYear} &rarr; 30 Jun {currentFY.fyStartYear + 1}
            </span>
          </div>

          {/* Quarter summary bar */}
          <div
            role="img"
            aria-label={`Files by quarter: ${QUARTER_IDS.map((q) => `${q} ${currentFY.quarters[q].fileCount}`).join(', ')}`}
            className="flex h-2 gap-px overflow-hidden rounded-full bg-[#f2edea]"
          >
            {QUARTER_IDS.map((qId) => {
              const qTotal = currentFY.quarters[qId].fileCount;
              const pct = totalScanned > 0 ? (qTotal / totalScanned) * 100 : 0;
              if (pct === 0) return null;
              return <div key={qId} className={QUARTER_CONFIG[qId].bar} style={{ width: `${pct}%` }} />;
            })}
          </div>

          {/* 4 Quarter Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {QUARTER_IDS.map((qId) => {
              const cfg = QUARTER_CONFIG[qId];
              const qData = currentFY.quarters[qId];
              const yearFor = qId === 'Q1' || qId === 'Q2' ? currentFY.fyStartYear : currentFY.fyStartYear + 1;
              const share = totalScanned > 0 ? Math.round((qData.fileCount / totalScanned) * 100) : 0;

              return (
                // @container: month rows adapt to the card's own width, not the screen's.
                <div
                  key={qId}
                  className="@container flex flex-col rounded-2xl border border-[#d8ceca] bg-[#fffdfc] p-5 shadow-[0_8px_24px_rgba(84,43,43,0.04)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8ceca] px-2.5 py-1 text-xs font-bold text-[#542b2b]">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${cfg.bar}`} />
                      {qId}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-[#705957]">{share}%</span>
                  </div>

                  <p className="mb-4 text-[0.6875rem] leading-relaxed text-[#705957]">
                    {QUARTER_MONTHS[qId].map((m) => `${m} ${yearFor}`).join(' · ')}
                  </p>

                  <div className="mb-4 flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`font-display text-4xl font-semibold tabular-nums ${
                          qData.fileCount === 0 ? 'text-[#9d8580]' : 'text-[#542b2b]'
                        }`}
                      >
                        {qData.fileCount}
                      </span>
                      <span className="text-xs text-[#705957]">{qData.fileCount === 1 ? 'file' : 'files'}</span>
                    </div>
                    <span className="font-mono text-xs text-[#705957]">{formatSize(qData.sizeBytes)}</span>
                  </div>

                  <div className="mt-auto space-y-1.5 border-t border-[#d8ceca] pt-4">
                    {QUARTER_MONTHS[qId].map((month) => {
                      const mData = qData.months[month];
                      if (!mData || mData.count === 0) return null;
                      return (
                        <button
                          key={`${currentFY.fyLabel}-${month}`}
                          onClick={() => onSelectQuarterFilter(qId, month)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[#d8ceca] bg-[#faf9f7] px-2.5 py-1.5 text-xs transition-colors hover:border-[#9d8580] hover:bg-[#f2edea] ${focusRing}`}
                        >
                          <span className="min-w-0 truncate font-medium text-[#705957]" title={`${month} ${mData.year}`}>
                            <span className="@[14rem]:hidden">{month.slice(0, 3)}</span>
                            <span className="hidden @[14rem]:inline">{month}</span> {mData.year}
                          </span>
                          <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-[#542b2b]">
                            {mData.count} <span className="text-[#9d8580]">·</span>{' '}
                            <span className="text-[#705957]">{formatSize(mData.sizeBytes)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => onSelectQuarterFilter(qId, 'ALL')}
                    className={`group mt-3 flex items-center gap-1 self-start rounded text-[0.6875rem] font-semibold text-[#542b2b] underline-offset-4 hover:underline ${focusRing}`}
                  >
                    Explore all {qId} files{' '}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer insight */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[#d8ceca] bg-[#fffdfc] p-4 shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#805d59] text-[#542b2b]">
            <HardDrive className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold text-[#542b2b]">
              Classification: Metadata → Filename → OCR → Folder → Modified → Created
            </p>
            <p className="text-xs text-[#705957]">
              6-tier priority engine. Files flagged "Needs Review" when confidence below 60%.
            </p>
          </div>
        </div>
        {reviewCount > 0 && (
          <button
            onClick={() => onNeedsReviewFilter?.()}
            className={`flex shrink-0 items-center gap-3 rounded-2xl border border-[#e3b7a8] bg-[#fbf1ed] p-4 transition-colors hover:bg-[#f7e6df] ${focusRing}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2dcd3] text-[#a4472f]">
              <FileText className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#a4472f]">
                {reviewCount} Need{reviewCount === 1 ? 's' : ''} Review
              </p>
              <p className="text-[0.6875rem] text-[#8a5a4d]">Click to review low-confidence files</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
