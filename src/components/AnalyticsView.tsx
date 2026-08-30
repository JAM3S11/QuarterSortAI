import React from 'react';
import { ScannedFile, QuarterId, MonthName } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, HardDrive } from 'lucide-react';

interface AnalyticsViewProps {
  files: ScannedFile[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ files }) => {
  // 1. Quarter Distribution
  const quarterData: { name: string; files: number; sizeMB: number }[] = [
    { name: 'Q1 (Jul-Sep)', files: 0, sizeMB: 0 },
    { name: 'Q2 (Oct-Dec)', files: 0, sizeMB: 0 },
    { name: 'Q3 (Jan-Mar)', files: 0, sizeMB: 0 },
    { name: 'Q4 (Apr-Jun)', files: 0, sizeMB: 0 },
  ];

  const quarterIndexMap: Record<QuarterId, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };

  // 2. Category Breakdown
  const categoryMap: Record<string, { count: number; sizeBytes: number }> = {};

  // 3. Monthly Volume Timeline
  const monthOrder: MonthName[] = [
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
  ];

  const monthCountMap: Record<MonthName, number> = {
    July: 0,
    August: 0,
    September: 0,
    October: 0,
    November: 0,
    December: 0,
    January: 0,
    February: 0,
    March: 0,
    April: 0,
    May: 0,
    June: 0,
  };

  for (const f of files) {
    const qIdx = quarterIndexMap[f.classification.quarter];
    if (qIdx !== undefined) {
      quarterData[qIdx].files++;
      quarterData[qIdx].sizeMB += f.size / (1024 * 1024);
    }

    if (!categoryMap[f.category]) {
      categoryMap[f.category] = { count: 0, sizeBytes: 0 };
    }
    categoryMap[f.category].count++;
    categoryMap[f.category].sizeBytes += f.size;

    if (monthCountMap[f.classification.month] !== undefined) {
      monthCountMap[f.classification.month]++;
    }
  }

  quarterData.forEach((q) => (q.sizeMB = Number(q.sizeMB.toFixed(1))));

  const categoryData = Object.entries(categoryMap).map(([name, val]) => ({
    name,
    value: val.count,
    sizeMB: Number((val.sizeBytes / (1024 * 1024)).toFixed(1)),
  }));

  const monthlyTimelineData = monthOrder.map((m) => ({
    month: m.slice(0, 3),
    files: monthCountMap[m] || 0,
  }));

  const COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

  // Top largest files
  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Repository Analytics & Financial Quarter Trends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visualizing document volume distributions, category storage consumption, and active timeline metrics
          </p>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Financial Quarter Volume Bar Chart */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Quarterly Document Volume
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-400">July - June Calendar</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="files" fill="#10B981" radius={[8, 8, 0, 0]} name="Scanned Files" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Document Category Storage Pie Chart */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-500" />
              Document Category Breakdown
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-400">File Type Count</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Monthly Volume Timeline Area Chart */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              12-Month Document Ingestion Timeline
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-400">Monthly Volume</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTimelineData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="files" stroke="#F59E0B" fill="#F59E0B20" strokeWidth={2} name="Monthly Files" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Largest Files Table */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-500" />
          Top 5 Largest Documents on USB
        </h3>

        <div className="space-y-2 text-xs">
          {largestFiles.map((f, idx) => (
            <div
              key={f.id}
              className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="font-bold text-slate-400">#{idx + 1}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
              </div>
              <div className="flex items-center space-x-3 font-mono shrink-0">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  {f.classification.quarter}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {(f.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
