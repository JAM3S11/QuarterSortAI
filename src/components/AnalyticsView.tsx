import React, { useEffect, useMemo, useState } from 'react';
import { ScannedFile, QuarterId, MonthName, FileCategory } from '../types';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  HardDrive,
  Files,
  Database,
  Layers,
  Copy,
  FileText,
  Lightbulb,
  FolderTree,
  Activity,
  Percent,
} from 'lucide-react';
import { formatSize } from '../lib/format';

interface AnalyticsViewProps {
  files: ScannedFile[];
}

type MetricKey = 'count' | 'sizeMB';

const quarterIndexMap: Record<QuarterId, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };
const monthOrder: MonthName[] = [
  'July', 'August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June',
];

const CATEGORY_COLORS: Record<string, string> = {
  Documents: '#10B981',
  Images: '#06B6D4',
  Videos: '#8B5CF6',
  Audio: '#EC4899',
  Archives: '#F59E0B',
  Folders: '#6366F1',
  Executables: '#F43F5E',
  Other: '#94A3B8',
};

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const AXIS_TICK_STYLE = { fontSize: 11, fill: '#ffffff' } as const;

const ALL_CATEGORIES: FileCategory[] = [
  'Documents', 'Images', 'Videos', 'Audio', 'Archives', 'Folders', 'Executables', 'Other',
];

const emptyMonthMap = (): Record<MonthName, number> => ({
  July: 0, August: 0, September: 0, October: 0, November: 0, December: 0,
  January: 0, February: 0, March: 0, April: 0, May: 0, June: 0,
});

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ files }) => {
  const [metric, setMetric] = useState<MetricKey>('count');
  const isDark = useIsDarkMode();

  const stats = useMemo(() => {
    const quarterData = [
      { name: 'Q1 (Jul-Sep)', q: 'Q1', files: 0, sizeMB: 0 },
      { name: 'Q2 (Oct-Dec)', q: 'Q2', files: 0, sizeMB: 0 },
      { name: 'Q3 (Jan-Mar)', q: 'Q3', files: 0, sizeMB: 0 },
      { name: 'Q4 (Apr-Jun)', q: 'Q4', files: 0, sizeMB: 0 },
    ];
    const categoryMap: Record<string, { count: number; sizeBytes: number }> = {};
    const monthCountMap = emptyMonthMap();
    const monthSizeMap: Record<MonthName, number> = { ...emptyMonthMap() } as Record<MonthName, number>;
    const folderMap: Record<string, { count: number; sizeBytes: number }> = {};
    const hashMap = new Map<string, number>();

    let totalBytes = 0;
    let dupFiles = 0;
    let dupBytes = 0;
    const seen = new Set<string>();

    // quarter x category matrix (size bytes + counts)
    const qc: Record<string, Record<string, number>> = {};
    const qcc: Record<string, Record<string, number>> = {};
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      qc[q] = {};
      qcc[q] = {};
      for (const c of ALL_CATEGORIES) {
        qc[q][c] = 0;
        qcc[q][c] = 0;
      }
    }

    for (const f of files) {
      const qIdx = quarterIndexMap[f.classification.quarter];
      const cat = f.category;
      totalBytes += f.size;

      if (qIdx !== undefined) {
        quarterData[qIdx].files++;
        quarterData[qIdx].sizeMB += f.size / (1024 * 1024);
        qc[f.classification.quarter][cat] += f.size;
        qcc[f.classification.quarter][cat]++;
      }
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, sizeBytes: 0 };
      categoryMap[cat].count++;
      categoryMap[cat].sizeBytes += f.size;

      if (monthCountMap[f.classification.month] !== undefined) {
        monthCountMap[f.classification.month]++;
        monthSizeMap[f.classification.month] += f.size / (1024 * 1024);
      }

      const topDir = f.folderPath && f.folderPath !== '/' ? f.folderPath.split('/').filter(Boolean)[0] : '(root)';
      if (!folderMap[topDir]) folderMap[topDir] = { count: 0, sizeBytes: 0 };
      folderMap[topDir].count++;
      folderMap[topDir].sizeBytes += f.size;

      const key = `${f.path}::${f.sha256}`;
      if (seen.has(key)) {
        dupFiles++;
        dupBytes += f.size;
      } else {
        seen.add(key);
      }
    }

    quarterData.forEach((q) => (q.sizeMB = Number(q.sizeMB.toFixed(1))));

    const categoryData = Object.entries(categoryMap)
      .map(([name, val]) => ({
        name,
        count: val.count,
        sizeMB: Number((val.sizeBytes / (1024 * 1024)).toFixed(1)),
      }))
      .sort((a, b) => b[metric] - a[metric]);

    // quarter x category stacked data (one series per category, size + count variants)
    const stackedData = quarterData.map((q) => {
      const row: any = { name: q.name, quarter: q.q };
      for (const c of ALL_CATEGORIES) row[c] = Number((qc[q.q][c] / (1024 * 1024)).toFixed(1));
      return row;
    });
    const stackedCountData = quarterData.map((q) => {
      const row: any = { name: q.name };
      for (const c of ALL_CATEGORIES) row[c] = qcc[q.q][c];
      return row;
    });

    const monthlyTimelineData = monthOrder.map((m) => ({
      month: m.slice(0, 3),
      files: monthCountMap[m] || 0,
      sizeMB: Number((monthSizeMap[m] || 0).toFixed(1)),
    }));

    const folders = Object.entries(folderMap)
      .map(([name, val]) => ({ name, count: val.count, sizeMB: Number((val.sizeBytes / (1024 * 1024)).toFixed(1)) }))
      .sort((a, b) => (metric === 'count' ? b.count - a.count : b.sizeMB - a.sizeMB))
      .slice(0, 6);

    const busiestQuarterIdx = quarterData.reduce((bi, q, i, arr) => (q[metric] > arr[bi][metric] ? i : bi), 0);
    const busiestMonth = monthOrder.reduce((best, m) => (monthCountMap[m] > monthCountMap[best] ? m : best), monthOrder[0]);
    const busiestCategory = categoryData[0]?.name || '—';

    const duplicateRate = files.length ? (dupFiles / files.length) * 100 : 0;

    return {
      totalFiles: files.length,
      totalBytes,
      totalFolders: Object.keys(folderMap).length,
      dupFiles,
      dupBytes,
      duplicateRate,
      avgFileBytes: files.length ? totalBytes / files.length : 0,
      quarterData,
      categoryData,
      monthlyTimelineData,
      stackedData,
      stackedCountData,
      qc,
      folders,
      busiestQuarter: quarterData[busiestQuarterIdx].name,
      busiestMonth,
      busiestCategory,
    };
  }, [files, metric]);

  const largestFiles = useMemo(
    () => [...files].sort((a, b) => b.size - a.size).slice(0, 5),
    [files]
  );

  const kpis = [
    { label: 'Total Files', value: stats.totalFiles.toLocaleString(), icon: Files, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Storage', value: formatSize(stats.totalBytes), icon: Database, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Categories', value: String(stats.categoryData.length), icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Directories', value: stats.totalFolders.toLocaleString(), icon: FolderTree, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Duplicates', value: stats.dupFiles.toLocaleString(), icon: Copy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Avg File Size', value: formatSize(stats.avgFileBytes), icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const insights = [
    `Your busiest quarter is ${stats.busiestQuarter} — that's where most ${metric === 'count' ? 'indexing activity' : 'storage'} is concentrated, so prioritize review/cleanup there.`,
    `"${stats.busiestMonth}" is your most active single month.`,
    `${stats.busiestCategory} is the dominant file category in your repository.`,
    stats.dupFiles > 0
      ? `You have ${stats.dupFiles} duplicate file${stats.dupFiles === 1 ? '' : 's'} (${stats.duplicateRate.toFixed(1)}% of the index, ~${formatSize(stats.dupBytes)} wasted) — revisit the Duplicate Center to reclaim space.`
      : 'No duplicates detected — your repository is free of redundant copies.',
    stats.totalFiles === 0
      ? 'No files scanned yet. Connect a USB drive or load the demo dataset to see analytics.'
      : `Average file size is ${formatSize(stats.avgFileBytes)}.`,
    stats.folders.length > 0
      ? `Top-level folder "${stats.folders[0].name}" holds the ${metric === 'count' ? 'most files' : 'most storage'} in this index.`
      : '',
  ].filter(Boolean);

  const toggleBtn = (key: MetricKey, label: string) => (
    <button
      onClick={() => setMetric(key)}
      className={`px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors ${
        metric === key
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  const dupColor = stats.duplicateRate > 15 ? '#F43F5E' : stats.duplicateRate > 5 ? '#F59E0B' : '#10B981';
  const dupValue = Math.min(100, stats.duplicateRate);

  const chartTheme = isDark ? 'dark' : 'light';

  const fmt = (v: number | null) => {
    if (v == null) return '';
    return metric === 'count'
      ? `${Math.round(v).toLocaleString()}`
      : `${Number(v).toFixed(1)} MB`;
  };

  const pieTotal = stats.categoryData.reduce((s, d) => s + (metric === 'count' ? d.count : d.sizeMB), 0);
  const pieData = stats.categoryData.map((d, i) => ({
    id: d.name,
    label: d.name,
    value: metric === 'count' ? d.count : d.sizeMB,
    color: CATEGORY_COLORS[d.name] || undefined,
  }));

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Repository Analytics & Financial Quarter Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Volume, storage footprint, category splits, duplicates, folder economics, and timeline metrics
            </p>
          </div>
        </div>
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Analytics Available Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            The <span className="font-bold text-slate-700 dark:text-slate-300">Analytics</span> tab provides KPI cards, quarterly volume bar charts, category pie charts, duplicate rate gauges, a 12-month ingestion timeline, top folder rankings, and key insights — all generated from your scanned repository. Connect a USB drive or load the demo dataset to see your analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Repository Analytics & Financial Quarter Trends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Volume, storage footprint, category splits, duplicates, folder economics, and timeline metrics
          </p>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-start gap-2">
              <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono leading-tight">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Chart metric:</span>
          {toggleBtn('count', 'File count')}
          {toggleBtn('sizeMB', 'Storage (MB/GB)')}
        </div>
      </div>

      {/* Row: Quarterly + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Quarterly Volume
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">{metric === 'count' ? 'File Count' : 'Storage / Quarter'}</span>
          </div>
          <BarChart
            height={256}
            dataset={stats.quarterData}
            xAxis={[{ scaleType: 'band', dataKey: 'name', tickLabelStyle: AXIS_TICK_STYLE }]}
            yAxis={[{ tickLabelStyle: AXIS_TICK_STYLE }]}
            grid={{ horizontal: true }}
            borderRadius={8}
            series={[{
              dataKey: metric === 'count' ? 'files' : 'sizeMB',
              label: metric === 'count' ? 'Scanned Files' : 'Size (MB)',
              color: '#10B981',
              valueFormatter: fmt,
            }]}
            theme={chartTheme}
          />
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-500" />
              Category Breakdown
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">{metric === 'count' ? 'File Type Count' : 'Storage Footprint'}</span>
          </div>
          <PieChart
            height={256}
            margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
            series={[{
              data: pieData,
              innerRadius: 55,
              outerRadius: 85,
              paddingAngle: 4,
              cornerRadius: 6,
              cx: '50%',
              cy: '50%',
              valueFormatter: (item) => fmt(item.value),
              arcLabel: (item) => (pieTotal > 0 ? `${((item.value / pieTotal) * 100).toFixed(0)}%` : ''),
              arcLabelMinAngle: 8,
            }]}
            theme={chartTheme}
          />
        </div>
      </div>

      {/* Row: Quarter x Category stacked + Duplicate gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Category Mix per Quarter (Stacked)
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">{metric === 'count' ? 'Files by Category' : 'Size by Category'}</span>
          </div>
          <BarChart
            height={256}
            dataset={metric === 'count' ? stats.stackedCountData : stats.stackedData}
            xAxis={[{ scaleType: 'band', dataKey: 'name', tickLabelStyle: AXIS_TICK_STYLE }]}
            yAxis={[{ tickLabelStyle: AXIS_TICK_STYLE }]}
            grid={{ horizontal: true }}
            series={ALL_CATEGORIES.map((c) => ({
              dataKey: c,
              label: c,
              color: CATEGORY_COLORS[c],
              stack: 'total',
              stackOffset: 'none',
              valueFormatter: fmt,
            }))}
            slotProps={{
              legend: {
                position: { vertical: 'bottom', horizontal: 'center' },
                sx: {
                  '& .MuiChartsLegend-label': { fontSize: 10 },
                },
              },
            }}
            margin={{ top: 5, bottom: 40, left: 5, right: 5 }}
            theme={chartTheme}
          />
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              Duplicate Rate
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">Index Hygiene</span>
          </div>
          <Gauge
            height={176}
            value={dupValue}
            startAngle={-110}
            endAngle={110}
            innerRadius="70%"
            outerRadius="100%"
            cornerRadius="50%"
            text={() => `${stats.duplicateRate.toFixed(1)}%`}
            sx={{
              width: '100%',
              [`& .${gaugeClasses.valueArc}`]: { fill: dupColor },
              [`& .${gaugeClasses.referenceArc}`]: { fill: isDark ? '#1e293b' : '#e2e8f0' },
              [`& .${gaugeClasses.valueText}`]: {
                fontFamily: MONO_FONT,
                fontSize: '1.375rem',
                fontWeight: 800,
                fill: isDark ? '#f8fafc' : '#0f172a',
              },
            }}
          />
          <div className="text-center">
            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-amber-500">{stats.dupFiles.toLocaleString()}</span> duplicate copies
            </p>
            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              ~<span className="font-bold text-amber-500">{formatSize(stats.dupBytes)}</span> reclaimable
            </p>
          </div>
        </div>
      </div>

      {/* Row: Monthly timeline + Top folders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              12-Month Ingestion Timeline
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">Monthly {metric === 'count' ? 'Volume' : 'Size (MB)'}</span>
          </div>
          <LineChart
            height={256}
            dataset={stats.monthlyTimelineData}
            xAxis={[{ scaleType: 'point', dataKey: 'month', tickLabelStyle: AXIS_TICK_STYLE }]}
            yAxis={[{ tickLabelStyle: AXIS_TICK_STYLE }]}
            grid={{ horizontal: true }}
            series={[{
              dataKey: metric === 'count' ? 'files' : 'sizeMB',
              label: metric === 'count' ? 'Monthly Files' : 'Size (MB)',
              color: '#F59E0B',
              area: true,
              showMark: true,
              valueFormatter: fmt,
            }]}
            theme={chartTheme}
          />
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-purple-500" />
              Top Folders by {metric === 'count' ? 'Files' : 'Storage'}
            </h3>
            <span className="text-[0.625rem] font-bold uppercase text-slate-400">Top 6</span>
          </div>
          {stats.folders.length > 0 ? (
            <BarChart
              height={256}
              layout="horizontal"
              dataset={stats.folders}
              borderRadius={6}
              yAxis={[{
                scaleType: 'band',
                dataKey: 'name',
                categoryGapRatio: 0.4,
                tickLabelStyle: { fontSize: 10, fill: '#ffffff' },
              }]}
              xAxis={[{ scaleType: 'linear', tickLabelStyle: AXIS_TICK_STYLE }]}
              grid={{ vertical: true }}
              hideLegend
              series={[{
                dataKey: metric === 'count' ? 'count' : 'sizeMB',
                label: metric === 'count' ? 'Files' : 'Size (MB)',
                color: '#8B5CF6',
                valueFormatter: fmt,
              }]}
              theme={chartTheme}
            />
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No folders indexed yet.</p>
          )}
        </div>
      </div>

      {/* Key Insights */}
      <div className="p-5 bg-gradient-to-r from-amber-500/[0.06] to-transparent rounded-2xl border border-amber-500/25 space-y-3">
        <h3 className="font-extrabold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Key Insights
        </h3>
        <ul className="space-y-2">
          {insights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Top Largest Files */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-500" />
          Top 5 Largest Documents on USB
        </h3>

        <div className="space-y-2 text-xs">
          {largestFiles.map((f, idx) => (
            <div key={f.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <span className="font-bold text-slate-400">#{idx + 1}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
              </div>
              <div className="flex items-center space-x-3 font-mono shrink-0">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[0.625rem] font-bold">
                  {f.classification.quarter}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};