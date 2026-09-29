import React, { useMemo, useState } from 'react';
import { ScannedFile, QuarterId, MonthName, FileCategory } from '../types';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart as RePieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
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
  Radar as RadarIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
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

const ALL_CATEGORIES: FileCategory[] = [
  'Documents', 'Images', 'Videos', 'Audio', 'Archives', 'Folders', 'Executables', 'Other',
];

const emptyMonthMap = (): Record<MonthName, number> => ({
  July: 0, August: 0, September: 0, October: 0, November: 0, December: 0,
  January: 0, February: 0, March: 0, April: 0, May: 0, June: 0,
});

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ files }) => {
  const [metric, setMetric] = useState<MetricKey>('count');
  const isCount = metric === 'count';

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
          ? 'bg-[#542b2b] text-[#faf9f7]'
          : 'bg-[#f2edea] text-[#705957] hover:text-[#542b2b]'
      }`}
    >
      {label}
    </button>
  );

  // ---- chart configs (labels + colors consumed by tooltips/legends) ----
  const volumeConfig = {
    files: { label: 'Scanned Files', color: 'var(--chart-1)' },
    sizeMB: { label: 'Size (MB)', color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  const pieConfig = Object.fromEntries(
    stats.categoryData.map((d) => [d.name, { label: d.name, color: CATEGORY_COLORS[d.name] }]),
  ) satisfies ChartConfig;

  const stackedConfig = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, { label: c, color: CATEGORY_COLORS[c] }]),
  ) satisfies ChartConfig;

  const timelineConfig = {
    files: { label: 'Monthly Files', color: 'var(--chart-3)' },
    sizeMB: { label: 'Size (MB)', color: 'var(--chart-3)' },
  } satisfies ChartConfig;

  const radarConfig = {
    countPct: { label: 'Files (%)', color: 'var(--chart-1)' },
    sizePct: { label: 'Storage (%)', color: 'var(--chart-5)' },
  } satisfies ChartConfig;

  const folderConfig = {
    count: { label: 'Files', color: 'var(--chart-4)' },
    sizeMB: { label: 'Size (MB)', color: 'var(--chart-4)' },
  } satisfies ChartConfig;

  const radialConfig = {
    value: { label: 'Duplicate rate' },
  } satisfies ChartConfig;

  // ---- derived data ----
  const metricKey = isCount ? 'files' : 'sizeMB';
  const folderMetricKey = isCount ? 'count' : 'sizeMB';

  const pieData = stats.categoryData.map((d) => ({
    name: d.name,
    value: isCount ? d.count : d.sizeMB,
  }));

  const radarData = stats.categoryData.map((d) => ({
    category: d.name,
    countPct: stats.totalFiles ? Number(((d.count / stats.totalFiles) * 100).toFixed(1)) : 0,
    sizePct: stats.totalBytes ? Number(((d.sizeMB / (stats.totalBytes / (1024 * 1024))) * 100).toFixed(1)) : 0,
  }));

  const dupColor = stats.duplicateRate > 15 ? '#F43F5E' : stats.duplicateRate > 5 ? '#F59E0B' : '#10B981';
  const dupValue = Math.min(100, stats.duplicateRate);
  const totalStorageMB = (stats.totalBytes / (1024 * 1024)).toFixed(1);

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-[#d8ceca]">
          <div>
            <h2 className="text-xl font-extrabold text-[#542b2b] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#542b2b]" />
              Repository Analytics & Financial Quarter Trends
            </h2>
            <p className="text-xs text-[#705957] mt-0.5">
              Volume, storage footprint, category splits, duplicates, folder economics, and timeline metrics
            </p>
          </div>
        </div>
        <div className="p-12 text-center bg-[#fffdfc] rounded-2xl border border-[#d8ceca] shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <BarChart3 className="w-12 h-12 text-[#705957] mx-auto mb-3" />
          <h3 className="font-bold text-[#542b2b] text-sm">No Analytics Available Yet</h3>
          <p className="text-xs text-[#705957] max-w-md mx-auto mt-1">
            The <span className="font-bold text-[#542b2b]">Analytics</span> tab provides KPI cards, quarterly volume bar charts, category pie charts, duplicate rate gauges, a 12-month ingestion timeline, top folder rankings, and key insights — all generated from your scanned repository. Connect a USB drive or load the demo dataset to see your analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-[#d8ceca]">
        <div>
          <h2 className="text-xl font-extrabold text-[#542b2b] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#542b2b]" />
            Repository Analytics & Financial Quarter Trends
          </h2>
          <p className="text-xs text-[#705957] mt-0.5">
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
          <FileText className="w-4 h-4 text-[#705957]" />
          <span className="text-xs font-bold text-[#705957]">Chart metric:</span>
          {toggleBtn('count', 'File count')}
          {toggleBtn('sizeMB', 'Storage (MB/GB)')}
        </div>
      </div>

      {/* Row 1: Quarterly Volume + Category Breakdown + Category Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Quarterly Volume
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
                {isCount ? 'File Count' : 'Storage / Quarter'}
              </span>
            </div>
            <CardDescription>Files indexed per financial quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={volumeConfig} className="aspect-auto h-[256px] w-full">
              <BarChart accessibilityLayer data={stats.quarterData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 2)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar
                  dataKey={metricKey}
                  fill={`var(--color-${metricKey})`}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <PieIcon className="w-4 h-4 text-cyan-500" />
                Category Breakdown
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
                {isCount ? 'File Type Count' : 'Storage Footprint'}
              </span>
            </div>
            <CardDescription>Share of the repository by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto aspect-square w-full max-w-[260px]">
              <ChartContainer config={pieConfig} className="aspect-auto h-full w-full">
                <RePieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    strokeWidth={2}
                    stroke="var(--color-background)"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                    ))}
                  </Pie>
                </RePieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-foreground">
                  {isCount ? stats.totalFiles.toLocaleString() : totalStorageMB}
                </span>
                <span className="text-xs text-muted-foreground">{isCount ? 'files' : 'MB'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <RadarIcon className="w-4 h-4 text-fuchsia-500" />
                Category Balance
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">Count vs Size</span>
            </div>
            <CardDescription>Percent share of files vs storage per category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radarConfig} className="mx-auto aspect-square max-h-[256px] w-full">
              <RadarChart accessibilityLayer data={radarData}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                />
                <PolarGrid />
                <Radar
                  dataKey="countPct"
                  stroke="var(--color-countPct)"
                  fill="var(--color-countPct)"
                  fillOpacity={0.5}
                  dot={{ r: 3, fillOpacity: 1 }}
                />
                <Radar
                  dataKey="sizePct"
                  stroke="var(--color-sizePct)"
                  fill="var(--color-sizePct)"
                  fillOpacity={0.5}
                  dot={{ r: 3, fillOpacity: 1 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Category Mix stacked + Duplicate gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <Layers className="w-4 h-4 text-indigo-500" />
                Category Mix per Quarter (Stacked)
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
                {isCount ? 'Files by Category' : 'Size by Category'}
              </span>
            </div>
            <CardDescription>Category composition across financial quarters</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={stackedConfig} className="aspect-auto h-[256px] w-full">
              <BarChart
                accessibilityLayer
                data={isCount ? stats.stackedCountData : stats.stackedData}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 2)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                {ALL_CATEGORIES.map((c) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={`var(--color-${c})`} />
                ))}
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <Percent className="w-4 h-4 text-amber-500" />
                Duplicate Rate
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">Index Hygiene</span>
            </div>
            <CardDescription>Share of duplicated copies in the index</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radialConfig} className="mx-auto aspect-square w-full max-w-[260px]">
              <RadialBarChart
                data={[{ name: 'duplicates', value: dupValue }]}
                endAngle={180}
                innerRadius={80}
                outerRadius={110}
              >
                <RadialBar
                  dataKey="value"
                  fill={dupColor}
                  cornerRadius={8}
                  background
                  className="stroke-transparent stroke-2"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 10}
                              className="fill-foreground text-3xl font-extrabold"
                            >
                              {stats.duplicateRate.toFixed(1)}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 14}
                              className="fill-muted-foreground text-xs"
                            >
                              duplicate rate
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-0.5 text-sm">
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-amber-500">{stats.dupFiles.toLocaleString()}</span> duplicate copies
            </p>
            <p className="text-xs text-muted-foreground">
              ~<span className="font-bold text-amber-500">{formatSize(stats.dupBytes)}</span> reclaimable
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Row 3: 12-Month timeline + Top Folders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                12-Month Ingestion Timeline
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
                Monthly {isCount ? 'Volume' : 'Size (MB)'}
              </span>
            </div>
            <CardDescription>Monthly activity across the fiscal year</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineConfig} className="aspect-auto h-[256px] w-full">
              <AreaChart accessibilityLayer data={stats.monthlyTimelineData}>
                <defs>
                  <linearGradient id="fillTimeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${metricKey})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(--color-${metricKey})`} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey={metricKey}
                  type="natural"
                  fill="url(#fillTimeline)"
                  stroke={`var(--color-${metricKey})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                <FolderTree className="w-4 h-4 text-purple-500" />
                Top Folders by {isCount ? 'Files' : 'Storage'}
              </CardTitle>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">Top 6</span>
            </div>
            <CardDescription>Biggest top-level directories in the index</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.folders.length > 0 ? (
              <ChartContainer config={folderConfig} className="aspect-auto h-[256px] w-full">
                <BarChart accessibilityLayer data={stats.folders} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey={folderMetricKey} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={86}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar
                    dataKey={folderMetricKey}
                    fill={`var(--color-${folderMetricKey})`}
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No folders indexed yet.</p>
            )}
          </CardContent>
        </Card>
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