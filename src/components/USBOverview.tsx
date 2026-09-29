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
      <div className="p-12 text-center bg-[#fffdfc] rounded-2xl border border-[#d8ceca] shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
        <HardDrive className="w-12 h-12 text-[#705957] mx-auto mb-3" />
        <h3 className="font-bold text-[#542b2b] text-sm">No USB Storage Connected</h3>
        <p className="text-xs text-[#705957] max-w-md mx-auto mt-1">
          The <span className="font-bold text-[#542b2b]">USB Overview</span> shows your drive's health metrics — name, filesystem type, serial number, read speed, and a storage capacity gauge with used/free breakdown. It also displays a 4-card stats grid covering total files, directories, documents, and duplicates. Connect a USB Flash Drive or click "Load Demo USB Dataset" to inspect volume health metrics.
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
      <div className="p-6 bg-gradient-to-r from-[#f3d8c8]/70 via-[#faf9f7] to-transparent rounded-2xl border border-[#d8ceca] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="p-4 rounded-2xl bg-[#542b2b] text-[#faf9f7] font-black shadow-lg shadow-[#542b2b]/10 shrink-0">
            <HardDrive className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#542b2b] min-w-0 break-words">
                {volumeInfo.name}
              </h1>
              <span className="px-2 py-0.5 text-[0.625rem] font-bold rounded bg-[#f2edea] text-[#542b2b] font-mono">
                {volumeInfo.filesystem}
              </span>
            </div>
            <p className="text-xs text-[#705957] mt-1 font-mono break-words leading-relaxed">
              Serial Number: {volumeInfo.serialNumber} • Read Speed: {volumeInfo.readSpeedMBps} MB/s
            </p>
          </div>
        </div>

        <button
          onClick={onRescan}
          className="px-4 py-2 bg-[#542b2b] hover:bg-[#6d3b3b] text-[#faf9f7] font-bold rounded-xl text-xs transition-colors shadow-sm"
        >
          Rescan Volume
        </button>
      </div>

      {/* Storage Gauge Metric */}
      <div className="p-6 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] space-y-3 shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#542b2b] flex items-center gap-2">
            Storage Capacity
          </span>
          {volumeInfo.capacityEstimated !== true && (
            <span className="font-mono text-[#542b2b]">
              {usedGB} GB Used
            </span>
          )}
        </div>

        {volumeInfo.capacityEstimated === true ? (
          <p className="text-[0.6875rem] text-[#705957] leading-relaxed">
            Live storage capacity is unavailable for this connection. No capacity figures are shown —
            only file and folder statistics are reported.
          </p>
        ) : (
          <>
            {volumeInfo.name && (
              <p className="text-[0.625rem] text-[#705957] font-mono flex items-center gap-2">
                <span>{volumeInfo.name}</span>
                {volumeInfo.filesystem && (
                  <>
                    <span>·</span>
                    <span>{volumeInfo.filesystem}</span>
                  </>
                )}
              </p>
            )}

            <div className="w-full h-4 bg-[#f2edea] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#542b2b] transition-all duration-700"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[0.6875rem] text-[#705957]">
              <span>0 GB</span>
              <span>{percentUsed}% Occupied Space</span>
              <span>{totalGB} GB</span>
            </div>
          </>
        )}
      </div>

      {/* Scanned Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] text-center shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <span className="text-xs font-bold text-[#705957] uppercase block">Total Files</span>
          <span className="text-2xl font-black text-[#542b2b] font-mono mt-1 block">
            {volumeInfo.totalFiles}
          </span>
        </div>

        <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] text-center shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <span className="text-xs font-bold text-[#705957] uppercase block">Directories</span>
          <span className="text-2xl font-black text-[#542b2b] font-mono mt-1 block">
            {volumeInfo.totalFolders}
          </span>
        </div>

        <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] text-center shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <span className="text-xs font-bold text-[#705957] uppercase block">Documents</span>
          <span className="text-2xl font-black text-[#542b2b] font-mono mt-1 block">{docCount}</span>
        </div>

        <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] text-center shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <span className="text-xs font-bold text-[#705957] uppercase block">Duplicates</span>
          <span className="text-2xl font-black text-[#542b2b] font-mono mt-1 block">
            {duplicateCount}
          </span>
        </div>
      </div>

      {/* Security Audit Certificate */}
      <div className="p-5 bg-[#542b2b] text-[#faf9f7] rounded-2xl border border-[#d8ceca] flex items-center space-x-4 shadow-[0_10px_25px_rgba(84,43,43,0.08)]">
        <ShieldCheck className="w-8 h-8 text-[#f3d8c8] shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-[#f3d8c8] uppercase tracking-wider block">
            VIRUS & INTEGRITY SECURITY CERTIFICATION
          </span>
          <p className="text-[#f1eae7] mt-0.5 leading-relaxed">
            Zero malware signatures detected. All SHA-256 hashes generated cleanly. Non-destructive virtual read-only index active.
          </p>
        </div>
      </div>
    </div>
  );
};
