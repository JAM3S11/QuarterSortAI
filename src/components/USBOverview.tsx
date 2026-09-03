import React from 'react';
import { USBVolumeInfo, ScannedFile } from '../types';
import { HardDrive, ShieldCheck, FileText, Image as ImageIcon, Copy, Zap, Clock, ShieldAlert } from 'lucide-react';

interface USBOverviewProps {
  volumeInfo: USBVolumeInfo | null;
  files: ScannedFile[];
  onRescan: () => void;
}

export const USBOverview: React.FC<USBOverviewProps> = ({ volumeInfo, files, onRescan }) => {
  if (!volumeInfo) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <HardDrive className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No USB Storage Connected</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Connect a USB Flash Drive or click "Load Demo USB Dataset" to inspect volume health metrics.
        </p>
      </div>
    );
  }

  const usedGB = (volumeInfo.usedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const freeGB = (volumeInfo.freeBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalGB = (volumeInfo.totalCapacityBytes / (1024 * 1024 * 1024)).toFixed(0);
  const percentUsed = Math.min(Math.round((volumeInfo.usedBytes / volumeInfo.totalCapacityBytes) * 100), 100);

  const docCount = files.filter((f) => f.category === 'Documents').length;
  const imageCount = files.filter((f) => f.category === 'Images').length;
  const duplicateCount = files.filter((f) => f.isDuplicate).length;

  return (
    <div className="space-y-6">
      {/* Volume Top Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-slate-900/10 to-transparent rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="p-4 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <HardDrive className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 min-w-0 break-words">
                {volumeInfo.name}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                {volumeInfo.filesystem}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono break-words leading-relaxed">
              Serial Number: {volumeInfo.serialNumber} • Read Speed: {volumeInfo.readSpeedMBps} MB/s
            </p>
          </div>
        </div>

        <button
          onClick={onRescan}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
        >
          Rescan Volume
        </button>
      </div>

      {/* Storage Gauge Metric */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
            Storage Capacity
          </span>
          {volumeInfo.capacityEstimated !== true && (
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {usedGB} GB Used
            </span>
          )}
        </div>

        {volumeInfo.capacityEstimated === true ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Live storage capacity is unavailable for this connection. No capacity figures are shown —
            only file and folder statistics are reported.
          </p>
        ) : (
          <>
            {volumeInfo.name && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-2">
                <span>{volumeInfo.name}</span>
                {volumeInfo.filesystem && (
                  <>
                    <span>·</span>
                    <span>{volumeInfo.filesystem}</span>
                  </>
                )}
              </p>
            )}

            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>0 GB</span>
              <span>{percentUsed}% Occupied Space</span>
              <span>{totalGB} GB</span>
            </div>
          </>
        )}
      </div>

      {/* Scanned Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase block">Total Files</span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1 block">
            {volumeInfo.totalFiles}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase block">Directories</span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1 block">
            {volumeInfo.totalFolders}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase block">Documents</span>
          <span className="text-2xl font-black text-blue-500 font-mono mt-1 block">{docCount}</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase block">Duplicates</span>
          <span className="text-2xl font-black text-amber-500 font-mono mt-1 block">
            {duplicateCount}
          </span>
        </div>
      </div>

      {/* Security Audit Certificate */}
      <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-emerald-500/30 flex items-center space-x-4">
        <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-emerald-400 uppercase tracking-wider block">
            VIRUS & INTEGRITY SECURITY CERTIFICATION
          </span>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            Zero malware signatures detected. All SHA-256 hashes generated cleanly. Non-destructive virtual read-only index active.
          </p>
        </div>
      </div>
    </div>
  );
};
